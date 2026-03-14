// File: backend/models/Backup.js

const mongoose = require('mongoose');

const backupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['manual', 'automatic'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'completed'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  path: {
    type: String,
    required: true
  },
  collections: [{
    type: String
  }],
  restoredAt: Date,
  restoredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  error: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

backupSchema.index({ createdAt: -1 });
backupSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Backup', backupSchema);