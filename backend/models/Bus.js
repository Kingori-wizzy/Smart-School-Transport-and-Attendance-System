const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true },
  busId: String,
  driverName: String,
  driverPhone: String,
  capacity: Number,
  route: String,
  routeId: String,
  status: { type: String, default: 'active' },
  currentLocation: {
    lat: Number,
    lng: Number,
    speed: Number,
    heading: Number,
    timestamp: Date
  },
  lastUpdate: Date,
  fuelLevel: Number,
  students: [String]
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);