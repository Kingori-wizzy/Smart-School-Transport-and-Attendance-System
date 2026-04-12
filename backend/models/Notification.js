const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userType: {
    type: String,
    enum: ['parent', 'driver', 'admin'],
    required: true
  },

  // Optional fields (not required for all notification types)
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },

  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: false,
    default: null
  },

  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: false,
    default: null
  },

  message: {
    type: String,
    required: true
  },

  title: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: [
      'board',
      'alight',
      'late',
      'geofence',
      'absent',
      'delay_report',
      'driver_message',
      'driver_broadcast',
      'trip_started',
      'trip_completed',
      'trip_delayed',
      'student_boarded',
      'student_alighted',
      'alert',
      'admin_broadcast',
      'attendance_alert',
      'route_deviation',
      'emergency',
      'boarding_alert',
      'alighting_alert',
      'trip_start',
      'trip_complete',
      'trip_cancelled'
    ],
    required: true
  },

  // Delivery tracking with TextBee support
  deliveryStatus: {
    type: [{
      channel: {
        type: String,
        enum: ['sms', 'email', 'push', 'in_app'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
        default: 'pending'
      },
      provider: {
        type: String,
        enum: ['smsLeopard', 'textBee', 'firebase', 'nodemailer', 'in_app'],
        default: 'in_app'
      },
      messageId: {
        type: String,
        default: null
      },
      sentAt: {
        type: Date,
        default: null
      },
      deliveredAt: {
        type: Date,
        default: null
      },
      readAt: {
        type: Date,
        default: null
      },
      error: {
        type: String,
        default: null
      },
      retryCount: {
        type: Number,
        default: 0
      },
      cost: {
        type: Number,
        default: 0
      },
      // TextBee specific fields
      textBeeDeviceId: {
        type: String,
        default: null
      },
      textBeeBatchId: {
        type: String,
        default: null
      }
    }],
    default: []
  },

  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending'
  },

  isRead: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: {
    type: Date,
    default: null
  },

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },

  // SMS specific fields for TextBee
  smsRecipient: {
    type: String,
    default: null
  },
  smsMessage: {
    type: String,
    default: null
  },
  smsSent: {
    type: Boolean,
    default: false
  },
  smsSentAt: {
    type: Date,
    default: null
  },
  smsError: {
    type: String,
    default: null
  },

  // Email specific fields
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  },
  emailError: {
    type: String,
    default: null
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }

}, { 
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ parentId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ priority: 1, createdAt: -1 });
notificationSchema.index({ 'deliveryStatus.status': 1 });
notificationSchema.index({ smsSent: 1, createdAt: -1 });
notificationSchema.index({ tripId: 1, type: 1 });

// Virtual for unread count
notificationSchema.virtual('isUnread').get(function() {
  return !this.isRead;
});

// Virtual for full SMS details
notificationSchema.virtual('smsDetails').get(function() {
  const smsDelivery = this.deliveryStatus.find(d => d.channel === 'sms');
  return {
    sent: this.smsSent,
    sentAt: this.smsSentAt,
    recipient: this.smsRecipient,
    message: this.smsMessage,
    error: this.smsError,
    provider: smsDelivery?.provider || null,
    messageId: smsDelivery?.messageId || null,
    status: smsDelivery?.status || 'pending'
  };
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  this.status = 'read';
  
  const inAppDelivery = this.deliveryStatus.find(d => d.channel === 'in_app');
  if (inAppDelivery) {
    inAppDelivery.status = 'read';
    inAppDelivery.readAt = new Date();
  }
  
  await this.save();
  return this;
};

// Method to mark SMS as sent via TextBee
notificationSchema.methods.markSmsSent = async function(messageId, provider = 'textBee') {
  this.smsSent = true;
  this.smsSentAt = new Date();
  
  const smsDelivery = this.deliveryStatus.find(d => d.channel === 'sms');
  if (smsDelivery) {
    smsDelivery.status = 'sent';
    smsDelivery.sentAt = new Date();
    smsDelivery.messageId = messageId;
    smsDelivery.provider = provider;
  } else {
    this.deliveryStatus.push({
      channel: 'sms',
      status: 'sent',
      sentAt: new Date(),
      messageId: messageId,
      provider: provider
    });
  }
  
  await this.save();
  return this;
};

// Method to mark SMS as failed
notificationSchema.methods.markSmsFailed = async function(error, provider = 'textBee') {
  this.smsError = error;
  
  const smsDelivery = this.deliveryStatus.find(d => d.channel === 'sms');
  if (smsDelivery) {
    smsDelivery.status = 'failed';
    smsDelivery.error = error;
    smsDelivery.retryCount += 1;
  } else {
    this.deliveryStatus.push({
      channel: 'sms',
      status: 'failed',
      error: error,
      provider: provider,
      retryCount: 1
    });
  }
  
  await this.save();
  return this;
};

// Method to mark as delivered
notificationSchema.methods.markAsDelivered = async function(channel, messageId) {
  const delivery = this.deliveryStatus.find(d => d.channel === channel);
  if (delivery) {
    delivery.status = 'delivered';
    delivery.deliveredAt = new Date();
    delivery.messageId = messageId;
  } else {
    this.deliveryStatus.push({
      channel: channel,
      status: 'delivered',
      deliveredAt: new Date(),
      messageId: messageId
    });
  }
  
  const allDelivered = this.deliveryStatus.every(d => d.status === 'delivered');
  if (allDelivered) {
    this.status = 'delivered';
  }
  
  await this.save();
  return this;
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ userId, isRead: false });
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { userId, isRead: false },
    { 
      isRead: true, 
      readAt: new Date(),
      status: 'read'
    }
  );
};

// Static method to get notifications by type
notificationSchema.statics.getByType = async function(userId, type, limit = 20) {
  return await this.find({ userId, type })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('studentId', 'firstName lastName admissionNumber')
    .populate('tripId', 'routeName vehicleId status');
};

// Static method to get SMS notifications that need retry
notificationSchema.statics.getFailedSmsNotifications = async function(maxRetries = 3) {
  return await this.find({
    smsSent: false,
    'deliveryStatus.channel': 'sms',
    'deliveryStatus.status': 'failed',
    'deliveryStatus.retryCount': { $lt: maxRetries }
  }).sort({ createdAt: 1 });
};

// Static method to create boarding notification
notificationSchema.statics.createBoardingNotification = async function(userId, studentName, busNumber, location, tripId) {
  const notification = new this({
    userId,
    userType: 'parent',
    studentId: null,
    tripId,
    type: 'boarding_alert',
    title: 'Student Boarded',
    message: `${studentName} has boarded the bus (${busNumber}) at ${location}`,
    priority: 'high',
    smsMessage: `Smart School: ${studentName} boarded bus ${busNumber} at ${location}. Track via parent portal.`,
    smsRecipient: null,
    metadata: {
      studentName,
      busNumber,
      location,
      timestamp: new Date()
    }
  });
  return await notification.save();
};

// Static method to create alighting notification
notificationSchema.statics.createAlightingNotification = async function(userId, studentName, busNumber, location, tripId) {
  const notification = new this({
    userId,
    userType: 'parent',
    studentId: null,
    tripId,
    type: 'alighting_alert',
    title: 'Student Alighted',
    message: `${studentName} has alighted from the bus (${busNumber}) at ${location}`,
    priority: 'high',
    smsMessage: `Smart School: ${studentName} alighted from bus ${busNumber} at ${location}. Trip completed safely.`,
    smsRecipient: null,
    metadata: {
      studentName,
      busNumber,
      location,
      timestamp: new Date()
    }
  });
  return await notification.save();
};

// Static method to create trip start notification
notificationSchema.statics.createTripStartNotification = async function(userId, studentName, routeName, estimatedArrival, tripId) {
  const notification = new this({
    userId,
    userType: 'parent',
    studentId: null,
    tripId,
    type: 'trip_start',
    title: 'Trip Started',
    message: `Trip ${routeName} has started. ${studentName} is on the way to school.`,
    priority: 'medium',
    smsMessage: `Smart School: Trip ${routeName} started. ${studentName} on way to school. ETA: ${estimatedArrival}`,
    smsRecipient: null,
    metadata: {
      studentName,
      routeName,
      estimatedArrival,
      timestamp: new Date()
    }
  });
  return await notification.save();
};

// Static method to create trip complete notification
notificationSchema.statics.createTripCompleteNotification = async function(userId, studentName, routeName, tripId) {
  const notification = new this({
    userId,
    userType: 'parent',
    studentId: null,
    tripId,
    type: 'trip_complete',
    title: 'Trip Completed',
    message: `Trip ${routeName} has been completed. ${studentName} has arrived safely.`,
    priority: 'medium',
    smsMessage: `Smart School: Trip ${routeName} completed. ${studentName} arrived safely. Thank you for using Smart School Transport.`,
    smsRecipient: null,
    metadata: {
      studentName,
      routeName,
      timestamp: new Date()
    }
  });
  return await notification.save();
};

// Static method to create trip cancelled notification
notificationSchema.statics.createTripCancelledNotification = async function(userId, studentName, routeName, tripDate, tripId) {
  const notification = new this({
    userId,
    userType: 'parent',
    studentId: null,
    tripId,
    type: 'trip_cancelled',
    title: 'Trip Cancelled',
    message: `Trip ${routeName} scheduled for ${tripDate} has been CANCELLED.`,
    priority: 'high',
    smsMessage: `Smart School: Trip ${routeName} on ${tripDate} CANCELLED. Please make alternative arrangements.`,
    smsRecipient: null,
    metadata: {
      studentName,
      routeName,
      tripDate,
      timestamp: new Date()
    }
  });
  return await notification.save();
};

// Static method to get recent notifications for a parent
notificationSchema.statics.getParentNotifications = async function(parentId, limit = 50, skip = 0) {
  return await this.find({ userId: parentId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('studentId', 'firstName lastName admissionNumber')
    .populate('tripId', 'routeName vehicleId status');
};

// Static method to get unread SMS notifications count
notificationSchema.statics.getUnsentSmsCount = async function() {
  return await this.countDocuments({ 
    smsSent: false, 
    smsMessage: { $ne: null },
    type: { $in: ['boarding_alert', 'alighting_alert', 'trip_start', 'trip_complete', 'trip_cancelled'] }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);