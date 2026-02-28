const mongoose = require('mongoose');

const incidentReportSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['accident', 'mechanical', 'student', 'traffic', 'weather', 'emergency', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  photos: [{
    type: String // URLs to uploaded photos
  }],
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['reported', 'investigating', 'resolved', 'closed'],
    default: 'reported'
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: [{
    text: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient querying
incidentReportSchema.index({ tripId: 1, createdAt: -1 });
incidentReportSchema.index({ status: 1, severity: 1 });

module.exports = mongoose.model('IncidentReport', incidentReportSchema);