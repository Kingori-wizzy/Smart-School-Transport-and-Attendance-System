// File: backend/models/UserPreference.js

const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Display Preferences
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  compactView: { type: Boolean, default: false },
  animations: { type: Boolean, default: true },
  fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
  highContrast: { type: Boolean, default: false },
  reduceMotion: { type: Boolean, default: false },
  sidebarCollapsed: { type: Boolean, default: false },

  // Language & Regional
  language: { type: String, default: 'en' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  timeFormat: { type: String, enum: ['12h', '24h'], default: '24h' },

  // Notification Preferences
  notifications: { type: Boolean, default: true },
  soundAlerts: { type: Boolean, default: true },
  alertVolume: { type: Number, min: 0, max: 100, default: 70 },

  // Auto Save
  autoSave: { type: Boolean, default: true },
  autoSaveInterval: { type: Number, default: 5 },

  // Metadata
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserPreference', userPreferenceSchema);