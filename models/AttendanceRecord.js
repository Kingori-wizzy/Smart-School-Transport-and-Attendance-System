const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true
  },

  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true
  },

  eventType: {
    type: String,
    enum: ['board', 'alight'],
    required: true,
    index: true
  },

  scannerId: String,

  gpsSnapshot: {
    lat: Number,
    lon: Number
  }

}, { timestamps: true });

attendanceSchema.index({ studentId: 1, tripId: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
