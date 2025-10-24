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
app.get('/api/documents', auth, async (req, res) => {
  try {
    // Find documents where the user is EITHER the owner OR a collaborator
    const documents = await Document.find({
      $or: [
        { owner: req.user.id },
        { collaborators: req.user.id }
      ]
    }).sort({ updatedAt: -1 }); // Show newest first

    res.json(documents);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
app.post('/api/documents/:id/share', auth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const { email } = req.body; // Email of the user to share with
    const loggedInUserId = req.user.id;

    // 1. Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // 2. Check if the logged-in user is the owner (only owner can share)
    if (document.owner.toString() !== loggedInUserId) {
      return res.status(403).json({ message: 'Only the document owner can share' });
    }

    // 3. Find the user to share with
    const userToShareWith = await User.findOne({ email });
    if (!userToShareWith) {
      return res.status(404).json({ message: 'User to share with not found' });
    }
    const userToShareWithId = userToShareWith._id.toString();

    // 4. Check if they're sharing with themselves
    if (userToShareWithId === loggedInUserId) {
      return res.status(400).json({ message: 'You cannot share a document with yourself' });
    }

    // 5. Check if document is already shared with this user
    if (document.collaborators.some(id => id.toString() === userToShareWithId)) {
      return res.status(400).json({ message: 'Document already shared with this user' });
    }

    // 6. Add the user to the collaborators list and save
    document.collaborators.push(userToShareWithId);
    await document.save();

    res.json({ message: 'Document shared successfully' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
// --- ADD THIS NEW ROUTE FOR RENAMING ---

app.put('/api/documents/:id/rename', auth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const { title } = req.body; // Get the new title from the request
    const loggedInUserId = req.user.id;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only the owner can rename
    if (document.owner.toString() !== loggedInUserId) {
      return res.status(403).json({ message: 'Only the document owner can rename' });
    }

    // Update the title and save
    document.title = title;
    await document.save();

    res.json(document); // Send back the updated document

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- END OF NEW ROUTE ---
// // --- ADD THIS NEW ROUTE FOR DELETING ---

app.delete('/api/documents/:id', auth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const loggedInUserId = req.user.id;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only the owner can delete
    if (document.owner.toString() !== loggedInUserId) {
      return res.status(403).json({ message: 'Only the document owner can delete' });
    }

    // Find and delete the document
    await Document.findByIdAndDelete(documentId);

    res.json({ message: 'Document deleted successfully' });

  } catch (err){ console.error(err.message); res.status(500).send('Server Error'); } })

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
// ... after your app.delete('/api/documents/:id', ...) route ...

// --- ADD THIS NEW ROUTE FOR UNSHARING ---

app.post('/api/documents/:id/unshare', auth, async (req, res) => {
  try {
    const documentId = req.params.id;
    const { email } = req.body; // Email of the user to remove
    const loggedInUserId = req.user.id;

    // 1. Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // 2. Check if the logged-in user is the owner
    if (document.owner.toString() !== loggedInUserId) {
      return res.status(403).json({ message: 'Only the document owner can manage sharing' });
    }

    // 3. Find the user to remove
    const userToRemove = await User.findOne({ email });
    if (!userToRemove) {
      return res.status(404).json({ message: 'User to remove not found' });
    }
    const userToRemoveId = userToRemove._id;

    // 4. Check if the user is actually a collaborator
    const isCollaborator = document.collaborators.some(id => id.equals(userToRemoveId));
    if (!isCollaborator) {
      return res.status(400).json({ message: 'User is not a collaborator on this document' });
    }

    // 5. Remove the user's ID from the collaborators array
    // The .pull() method is a special Mongoose helper for arrays
    document.collaborators.pull(userToRemoveId);
    await document.save();

    res.json({ message: 'Collaborator removed successfully' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- END OF NEW ROUTE ---

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