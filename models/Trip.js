const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({

  routeName: {
    type: String,
    required: true,
    index: true
  },

  vehicleId: {
    type: String,
    required: true,
    index: true
  },

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  tripType: {
    type: String,
    enum: ['morning', 'afternoon'],
    required: true
  },

  scheduledStartTime: {
    type: Date,
    required: true
  },

  scheduledEndTime: {
    type: Date
  },

  startTime: Date,
  endTime: Date,

  status: {
    type: String,
    enum: ['scheduled', 'running', 'completed', 'cancelled'],
    default: 'scheduled',
    index: true
  },

  lateStart: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);
