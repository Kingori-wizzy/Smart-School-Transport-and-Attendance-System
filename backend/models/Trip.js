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
  },

  // Students assigned to this trip (auto-populated from bus)
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],

  // Attendance records for this trip
  attendance: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    scannedAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['board', 'alight']
    },
    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    location: {
      lat: Number,
      lng: Number
    }
  }],

  // Trip statistics
  statistics: {
    totalStudents: {
      type: Number,
      default: 0
    },
    boardedCount: {
      type: Number,
      default: 0
    },
    alightedCount: {
      type: Number,
      default: 0
    },
    lateMinutes: {
      type: Number,
      default: 0
    }
  }

}, { timestamps: true });

// Pre-save middleware to update statistics
tripSchema.pre('save', function(next) {
  if (this.students) {
    this.statistics.totalStudents = this.students.length;
  }
  
  // Calculate boarded and alighted counts
  if (this.attendance && this.attendance.length) {
    this.statistics.boardedCount = this.attendance.filter(a => a.type === 'board').length;
    this.statistics.alightedCount = this.attendance.filter(a => a.type === 'alight').length;
  }
  
  next();
});

// Method to check if a student is on this trip
tripSchema.methods.hasStudent = function(studentId) {
  return this.students && this.students.some(id => id.toString() === studentId.toString());
};

// Method to get attendance for a specific student
tripSchema.methods.getStudentAttendance = function(studentId) {
  return this.attendance.filter(a => a.studentId.toString() === studentId.toString());
};

// Method to check if student has boarded
tripSchema.methods.hasBoarded = function(studentId) {
  return this.attendance.some(a => 
    a.studentId.toString() === studentId.toString() && a.type === 'board'
  );
};

// Method to check if student has alighted
tripSchema.methods.hasAlighted = function(studentId) {
  return this.attendance.some(a => 
    a.studentId.toString() === studentId.toString() && a.type === 'alight'
  );
};

module.exports = mongoose.model('Trip', tripSchema);