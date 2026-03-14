// File: backend/models/SystemConfig.js

const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // General Settings
  schoolName: { type: String, default: 'Smart School' },
  schoolAddress: { type: String, default: 'Nairobi, Kenya' },
  schoolPhone: { type: String, default: '+254 700 000000' },
  schoolEmail: { type: String, default: 'info@smartschool.com' },
  timezone: { type: String, default: 'Africa/Nairobi' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  timeFormat: { type: String, default: '24h' },
  language: { type: String, default: 'en' },
  currency: { type: String, default: 'KES' },

  // Transport Settings
  speedLimit: { type: Number, default: 80 },
  geofenceRadius: { type: Number, default: 500 },
  fuelAlertThreshold: { type: Number, default: 15 },
  maxStudentsPerBus: { type: Number, default: 40 },
  morningTripTime: { type: String, default: '06:30' },
  eveningTripTime: { type: String, default: '16:30' },
  trackingInterval: { type: Number, default: 30 },
  offlineCache: { type: Boolean, default: true },
  routeOptimization: { type: Boolean, default: true },

  // Notification Settings
  emailNotifications: { type: Boolean, default: true },
  smsNotifications: { type: Boolean, default: true },
  pushNotifications: { type: Boolean, default: true },

  // Security Settings
  twoFactorAuth: { type: Boolean, default: false },
  sessionTimeout: { type: Number, default: 30 },
  passwordPolicy: { 
    type: String, 
    enum: ['weak', 'medium', 'strong'],
    default: 'strong'
  },
  maxLoginAttempts: { type: Number, default: 5 },
  lockoutDuration: { type: Number, default: 30 },
  auditLogging: { type: Boolean, default: true },
  dataRetention: { type: Number, default: 90 },

  // Backup Settings
  autoBackup: { type: Boolean, default: true },
  backupFrequency: { 
    type: String, 
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  backupTime: { type: String, default: '02:00' },
  retainBackups: { type: Number, default: 30 },
  backupLocation: { 
    type: String, 
    enum: ['local', 'cloud', 'both'],
    default: 'cloud'
  },

  // Metadata
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemConfig', systemConfigSchema);