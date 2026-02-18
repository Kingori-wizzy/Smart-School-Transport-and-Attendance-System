const mongoose = require('mongoose');

const gpsLogSchema = new mongoose.Schema({

  vehicleId: {
    type: String,
    required: true,
    index: true
  },

  routeName: {
    type: String,
    index: true
  },

  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    index: true
  },

  lat: {
    type: Number,
    required: true
  },

  lon: {
    type: Number,
    required: true
  },

  speed: {
    type: Number,
    default: 0
  },

  heading: Number,

  fuelLevel: {
    type: Number // percentage 0 - 100
  }

}, { timestamps: true });

// Index for clustering & map heatmaps
gpsLogSchema.index({ lat: 1, lon: 1 });
gpsLogSchema.index({ vehicleId: 1, createdAt: -1 });

module.exports = mongoose.model('GPSLog', gpsLogSchema);
