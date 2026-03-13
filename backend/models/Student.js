const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({

  // ===== CORE IDENTITY FIELDS =====
  admissionNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    uppercase: true,
    trim: true
  },

  rfidTag: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

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

  // ===== 🚨 REMOVE THIS IF IT EXISTS =====
  // name: { type: String },  // ❌ REMOVE THIS LINE - DON'T STORE NAME

  age: { 
    type: Number, 
    required: true,
    min: [3, 'Age must be at least 3'],
    max: [25, 'Age cannot exceed 25']
  },

  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },

  classLevel: { 
    type: String, 
    required: true,
    index: true
  },
  
  stream: { 
    type: String,
    trim: true
  },

  // ===== PARENT/GUARDIAN INFORMATION =====
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },

  guardianContact: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^\+?\d{10,15}$/.test(v);
      },
      message: 'Please enter a valid phone number'
    }
  },

  additionalContacts: [{
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { 
      type: String, 
      required: true,
      validate: {
        validator: function(v) {
          return /^\+?\d{10,15}$/.test(v);
        }
      }
    },
    isPrimary: { type: Boolean, default: false }
  }],

  // ===== TRANSPORT-SPECIFIC FIELDS =====
  usesTransport: {
    type: Boolean,
    default: false,
    index: true,
    required: true
  },

  registeredBySchool: {
    type: Boolean,
    default: true,
    required: true
  },

  transportRegistrationDate: {
    type: Date,
    default: null
  },

  transportDetails: {
    pickupPoint: {
      name: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
      time: { type: String },
      landmark: { type: String },
      instructions: { type: String }
    },
    
    dropoffPoint: {
      name: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number }
      },
      time: { type: String },
      landmark: { type: String },
      instructions: { type: String }
    },

    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      index: true
    },

    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      index: true
    },

    feePaid: { 
      type: Boolean, 
      default: false 
    },
    feeAmount: { 
      type: Number,
      min: 0 
    },
    feeCurrency: { 
      type: String, 
      default: 'KES' 
    },
    lastPaymentDate: { 
      type: Date 
    },
    paymentReceipt: { 
      type: String 
    },
    feeDueDate: { 
      type: Date 
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'pending'
    },

    specialNotes: { type: String }
  },

  // ===== BACKWARD COMPATIBILITY FIELDS =====
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    index: true,
    deprecated: true
  },

  busNumber: { 
    type: String,
    deprecated: true 
  },

  routeName: {
    type: String,
    index: true,
    deprecated: true
  },

  pickupPoint: {
    type: String,
    deprecated: true
  },

  dropOffPoint: {
    type: String,
    deprecated: true
  },

  transportStatus: {
    type: String,
    enum: ['assigned', 'inactive', 'suspended'],
    default: 'assigned',
    deprecated: true
  },

  // ===== QR CODE =====
  qrCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  // ===== MEDICAL INFORMATION =====
  medicalInfo: {
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']
    },
    allergies: [{
      allergen: String,
      reaction: String,
      severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
      notes: String
    }],
    medications: [{
      name: String,
      dosage: String,
      schedule: String,
      administeredBy: String,
      notes: String
    }],
    chronicConditions: [{
      condition: String,
      management: String,
      emergencyProtocol: String
    }],
    doctorInfo: {
      name: String,
      phone: String,
      clinic: String
    },
    notes: String
  },

  // ===== ACADEMIC INFO =====
  enrollmentDate: {
    type: Date,
    default: Date.now
  },

  graduationDate: Date,

  // ===== STATUS =====
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  notes: [{
    content: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    category: { 
      type: String, 
      enum: ['academic', 'behavioral', 'medical', 'transport', 'general'] 
    }
  }]

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== ✅ FIXED VIRTUAL PROPERTY =====
// This is fine - it doesn't conflict because we removed the real 'name' field
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Also keep 'name' as a virtual for backward compatibility if needed
studentSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// ===== MIDDLEWARE =====
studentSchema.pre('save', async function(next) {
  if (this.usesTransport && !this.qrCode) {
    const timestamp = Date.now();
    this.qrCode = `STU-${this.admissionNumber}-${timestamp}`;
    
    if (!this.transportRegistrationDate) {
      this.transportRegistrationDate = new Date();
    }
  }
  
  if (!this.usesTransport && this.qrCode) {
    this.qrCode = undefined;
  }
  
  // Copy data from transportDetails to legacy fields
  if (this.usesTransport && this.transportDetails) {
    if (this.transportDetails.busId) {
      this.busId = this.transportDetails.busId;
    }
    if (this.transportDetails.pickupPoint?.name) {
      this.pickupPoint = this.transportDetails.pickupPoint.name;
    }
    if (this.transportDetails.dropoffPoint?.name) {
      this.dropOffPoint = this.transportDetails.dropoffPoint.name;
    }
    if (this.transportDetails.status) {
      this.transportStatus = this.transportDetails.status === 'active' ? 'assigned' : this.transportDetails.status;
    }
  }
  
  next();
});

// ===== STATIC METHODS =====
studentSchema.statics.findUnassignedTransport = function() {
  return this.find({
    usesTransport: true,
    'transportDetails.status': 'pending'
  });
};

studentSchema.statics.findActiveTransport = function() {
  return this.find({
    usesTransport: true,
    'transportDetails.status': 'active',
    isActive: true
  });
};

studentSchema.statics.findByBus = function(busId) {
  return this.find({
    $or: [
      { 'transportDetails.busId': busId },
      { busId: busId }
    ],
    usesTransport: true,
    isActive: true
  });
};

// ===== INDEXES =====
studentSchema.index({ classLevel: 1, stream: 1 });
studentSchema.index({ 'transportDetails.busId': 1, usesTransport: 1 });
studentSchema.index({ usesTransport: 1, 'transportDetails.status': 1 });
studentSchema.index({ parentId: 1, isActive: 1 });
studentSchema.index({ admissionNumber: 1 }, { unique: true });
studentSchema.index({ qrCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Student', studentSchema);