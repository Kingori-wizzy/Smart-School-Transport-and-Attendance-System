// File: backend/models/Report.js

const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['attendance', 'transport', 'drivers', 'routes', 'alerts', 'combined'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  dateRange: {
    start: Date,
    end: Date
  },
  format: {
    type: String,
    enum: ['pdf', 'excel', 'csv', 'json'],
    default: 'pdf'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  summary: {
    type: mongoose.Schema.Types.Mixed
  },
  pages: {
    type: Number,
    default: 1
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Index for efficient querying
reportSchema.index({ type: 1, createdAt: -1 });
reportSchema.index({ createdBy: 1 });
reportSchema.index({ tags: 1 });

module.exports = mongoose.model('Report', reportSchema);