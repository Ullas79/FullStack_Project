// server/Document.js

const { Schema, model, SchemaTypes } = require('mongoose');

const DocumentSchema = new Schema({
  // We no longer use a custom _id. We'll let MongoDB generate it.
  data: {
    type: Object,
    default: {}, // Default to a blank object
  },
  title: {
    type: String,
    default: 'Untitled Document',
  },
  owner: {
    type: SchemaTypes.ObjectId,
    ref: 'User', // This 'User' must match the model name from server/User.js
    required: true,
  },
  collaborators: [{
    type: SchemaTypes.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true, // Automatically adds 'createdAt' and 'updatedAt' fields
});

module.exports = model('Document', DocumentSchema);