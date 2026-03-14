// File: backend/models/NotificationSetting.js

const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  // Delivery Methods
  emailEnabled: { type: Boolean, default: true },
  smsEnabled: { type: Boolean, default: true },
  pushEnabled: { type: Boolean, default: true },

  // Recipients
  parentAlerts: { type: Boolean, default: true },
  driverAlerts: { type: Boolean, default: true },
  adminAlerts: { type: Boolean, default: true },

  // Alert Types
  attendanceAlerts: { type: Boolean, default: true },
  speedAlerts: { type: Boolean, default: true },
  geofenceAlerts: { type: Boolean, default: true },
  fuelAlerts: { type: Boolean, default: true },

  // Quiet Hours
  quietHoursEnabled: { type: Boolean, default: false },
  quietHoursStart: { type: String, default: '22:00' },
  quietHoursEnd: { type: String, default: '06:00' },

  // Email Digest
  emailDigest: { 
    type: String, 
    enum: ['none', 'daily', 'weekly', 'monthly'],
    default: 'daily'
  },

  // Metadata
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificationSetting', notificationSettingSchema);