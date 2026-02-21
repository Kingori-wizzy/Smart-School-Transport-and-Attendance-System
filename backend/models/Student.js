const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

  admissionNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  rfidTag: {
    type: String,
    unique: true,
    sparse: true
  },

  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },

  age: { type: Number, required: true },

  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },

  classLevel: { type: String, required: true },
  stream: { type: String },

  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  guardianContact: { type: String, required: true },

  // ✅ NEW: Reference to Bus model
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',  // References the Bus model
    index: true
  },

  // Keep these for display/compatibility
  busNumber: { type: String },
  routeName: {
    type: String,
    required: true,
    index: true
  },

  pickupPoint: String,
  dropOffPoint: String,

  transportStatus: {
    type: String,
    enum: ['assigned', 'inactive', 'suspended'],
    default: 'assigned'
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  }

}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);