// File: backend/models/Assignment.js

const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  // Core assignment fields
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  
  // Assignment details
  assignmentDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'pending'],
    default: 'active'
  },
  
  // Additional info
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
assignmentSchema.index({ bus: 1, status: 1 });
assignmentSchema.index({ driver: 1, status: 1 });
assignmentSchema.index({ route: 1, status: 1 });
assignmentSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);