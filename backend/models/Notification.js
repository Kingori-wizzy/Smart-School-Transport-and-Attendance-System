const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userType: {
    type: String,
    enum: ['parent', 'driver', 'admin'],
    required: true
  },

  // Optional fields (not required for all notification types)
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false,
    default: null  // Add default
  },

  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: false,
    default: null  // Add default
  },

  message: {
    type: String,
    required: true
  },

  title: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: [
      'board',
      'alight',
      'late',
      'geofence',
      'absent',
      'delay_report',
      'driver_message',
      'driver_broadcast',
      'trip_started',
      'trip_completed',
      'trip_delayed',
      'student_boarded',
      'student_alighted',
      'alert'
    ],
    required: true
  },

  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },

  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }

}, { timestamps: true });

// Indexes for better performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ parentId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);