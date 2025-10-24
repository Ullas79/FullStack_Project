// server/middleware/auth.js

const jwt = require("jsonwebtoken");
const JWT_SECRET = "your-super-secret-key-that-should-be-in-a-env-file"; // Use the same secret as in index.js

module.exports = function (req, res, next) {
  // Get the token from the request header
  const token = req.header("x-auth-token");

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add the user's ID from the token to the request object
    req.user = decoded.user;
    next(); // Move on to the next function (the API route)
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};
