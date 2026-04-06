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
      'admin_broadcast',     // ✅ ADDED: For admin mass messages
      'attendance_alert',    // ✅ ADDED: For attendance notifications
      'route_deviation',     // ✅ ADDED: For route deviation alerts
      'emergency'            // ✅ ADDED: For emergency alerts
    ],
    required: true
  },

  // Delivery tracking
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
      messageId: String,
      sentAt: Date,
      deliveredAt: Date,
      readAt: Date,
      error: String,
      retryCount: {
        type: Number,
        default: 0
      },
      cost: {
        type: Number,
        default: 0
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

// Virtual for unread count
notificationSchema.virtual('isUnread').get(function() {
  return !this.isRead;
});

// Method to mark as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  this.status = 'read';
  
  // Update delivery status for in_app channel
  const inAppDelivery = this.deliveryStatus.find(d => d.channel === 'in_app');
  if (inAppDelivery) {
    inAppDelivery.status = 'read';
    inAppDelivery.readAt = new Date();
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
  
  // Update overall status if all channels delivered
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
    .populate('studentId', 'firstName lastName')
    .populate('tripId', 'routeName vehicleId');
};

module.exports = mongoose.model('Notification', notificationSchema);