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
    type: String // for Firebase push notifications
  },

  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // ===============================
  // ADDITIONAL FIELDS
  // ===============================
  profileImage: {
    type: String  // URL to profile picture
  },

  lastLogin: {
    type: Date    // Track last login time
  },

  // For parent-child relationship
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],

  // For driver specific info
  driverDetails: {
    licenseNumber: String,
    licenseExpiry: Date,
    experience: Number,
    emergencyContact: String
  }

}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});


// 🔐 Password Hashing
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


// 🔎 Compare Password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// 👤 Get full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// 📧 Find by email (static method)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

module.exports = mongoose.model('User', userSchema);