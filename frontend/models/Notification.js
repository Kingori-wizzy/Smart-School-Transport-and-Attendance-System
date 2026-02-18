const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({

  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },

  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },

  message: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ['board', 'alight', 'late', 'geofence', 'absent'],
    required: true
  },

  isRead: {
    type: Boolean,
    default: false,
    index: true
  }

}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
