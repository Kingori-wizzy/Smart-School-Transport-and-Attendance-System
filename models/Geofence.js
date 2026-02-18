const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({

  routeName: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  type: {
    type: String,
    enum: ['circle', 'polygon'],
    required: true
  },

  // Circle
  centerLat: Number,
  centerLon: Number,
  radiusMeters: Number,

  // Polygon (array of points)
  polygonPoints: [
    {
      lat: Number,
      lon: Number
    }
  ]

}, { timestamps: true });

module.exports = mongoose.model('Geofence', geofenceSchema);
