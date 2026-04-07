const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({

  // ===============================
  // BASIC INFO
  // ===============================

  firstName: {
    type: String,
    required: true,
    trim: true
  },

  lastName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  phone: {
    type: String
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ['admin', 'driver', 'parent'],
    required: true,
    index: true
  },

  deviceToken: {
    type: String
  },

  // ===============================
  // PUSH NOTIFICATIONS
  // ===============================
  pushToken: {
    type: String,
    default: null,
    index: true
  },

  pushTokenUpdatedAt: {
    type: Date,
    default: null
  },

  // ===============================
  // ACCOUNT STATUS
  // ===============================
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // ===============================
  // PASSWORD RESET
  // ===============================
  resetCode: {
    type: String,
    default: null
  },

  resetCodeExpiry: {
    type: Date,
    default: null
  },

  // ===============================
  // ADDITIONAL FIELDS
  // ===============================
  profileImage: {
    type: String,
    default: null
  },

  lastLogin: {
    type: Date
  },

  // For parent-child relationship
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],

  // For driver specific info
  driverDetails: {
    licenseNumber: { type: String },
    licenseExpiry: { type: Date },
    experience: { type: Number },
    emergencyContact: { type: String }
  }

}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      delete ret.resetCode;
      delete ret.resetCodeExpiry;
      return ret;
    }
  }
});

// Password Hashing - runs before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare Password method
userSchema.methods.comparePassword = async function (password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    return false;
  }
};

// Get full name virtual
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Find by email static method
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

// Find users by push token static method
userSchema.statics.findByPushToken = function(token) {
  return this.findOne({ pushToken: token });
};

module.exports = mongoose.model('User', userSchema);