const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: String,
  busId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bus' 
  },
  stops: [{
    name: String,
    location: {
      lat: Number,
      lng: Number
    },
    address: String,
    arrivalTime: String,
    departureTime: String,
    order: Number,
    studentCount: { type: Number, default: 0 }
  }],
  distance: { type: Number, default: 0 }, // in km
  estimatedDuration: { type: Number, default: 0 }, // in minutes
  active: { 
    type: Boolean, 
    default: true 
  },
  optimization: {
    lastOptimized: Date,
    suggestions: mongoose.Schema.Types.Mixed,
    efficiency: String,
    potentialSavings: {
      time: Number,
      fuel: Number
    }
  },
  metadata: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Index for efficient querying
routeSchema.index({ busId: 1 });
routeSchema.index({ active: 1 });
routeSchema.index({ 'stops.location': '2dsphere' });

module.exports = mongoose.model('Route', routeSchema);