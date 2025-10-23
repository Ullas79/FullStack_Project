// server/index.js

const mongoose = require('mongoose');
const Document = require('./Document');
const User = require('./User'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- ADD THIS
const auth = require('./middleware/auth');

// --- ADD A JWT SECRET KEY ---
// (Put this near your DB_URL)
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-key-that-should-be-in-a-env-file";

// --- REPLACE WITH YOUR CONNECTION STRING ---
const DB_URL = "mongodb+srv://ullasmogaveera2004_db_user:uowuhUZmRFsFLBXG@m0.jfaouna.mongodb.net/?retryWrites=true&w=majority&appName=M0";

mongoose.connect(DB_URL)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));


const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
io.use((socket, next) => {
  const token = socket.handshake.auth.token; // Get token from client
  if (!token) {
    return next(new Error('Authentication error: No token'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded.user; // Attach user info to the socket
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});
// --- END
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save the new user
    const user = new User({ email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 2. Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // 3. Create and send a token
    const payload = {
      user: {
        id: user.id, // This is the user's MongoDB _id
      },
    };

    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' }, // Token expires in 1 hour
      (err, token) => {
        if (err) throw err;
        res.json({ token }); // Send the token to the client
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});// ... after your /api/auth/login route ...

// --- CREATE A NEW DOCUMENT ---
app.post('/api/documents', auth, async (req, res) => {
  // 'auth' middleware runs first, gets user ID, and puts it in req.user.id
  try {
    const newDoc = new Document({
      owner: req.user.id, // Set the owner
      title: 'Untitled Document',
      data: {}, // Start with blank data
    });

    const document = await newDoc.save();
    res.json(document); // Send the new document back
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- GET ALL OF A USER'S DOCUMENTS ---
app.get('/api/documents', auth, async (req, res) => {
  try {
    // Find all documents where the owner is the logged-in user
    // We will add 'collaborators' later
    const documents = await Document.find({ owner: req.user.id })
                                    .sort({ updatedAt: -1 }); // Show newest first
    res.json(documents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }

});


io.on('connection', (socket) => {
  console.log('User connected (authenticated):', socket.user.id);

  // 1. Listen for a client to request a specific document
  socket.on('get-document', async (documentId) => {
    try {
      const document = await Document.findById(documentId);

      // Check if document exists
      if (!document) {
        return socket.emit('error', 'Document not found');
      }

      // Check if user has permission
      const userId = socket.user.id;
      const isOwner = document.owner.toString() === userId;
      const isCollaborator = document.collaborators.some(
        (collabId) => collabId.toString() === userId
      );

      if (!isOwner && !isCollaborator) {
        return socket.emit('error', 'Permission denied');
      }

      // User is authorized, join the room
      socket.join(documentId);
      console.log(`User ${userId} joined room ${documentId}`);

      // Send the document data to *this* client
      socket.emit('load-document', document.data);

    } catch (err) {
      console.error(err);
      socket.emit('error', 'Server error');
    }
  });

  // 2. Listen for changes and broadcast to the room
  socket.on('send-changes', (delta, documentId) => {
    // Broadcast to everyone in the room *except* the sender
    socket.broadcast.to(documentId).emit('receive-changes', delta);
  });

  // 3. Listen for saves and update the database
  socket.on('save-document', async (data, documentId) => {
    // Here you could add another permission check if you want
    await Document.findByIdAndUpdate(documentId, { data });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.user.id);
  });
});

// --- END OF NEW CONNECTION BLOCK ---

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});