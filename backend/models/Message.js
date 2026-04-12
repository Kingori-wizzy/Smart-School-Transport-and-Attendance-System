const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['text', 'image', 'location', 'alert', 'broadcast'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDelivered: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
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

// Indexes for faster queries
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, isRead: 1 });
messageSchema.index({ conversationId: 1, recipientId: 1, isRead: 1 });

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(conversationId, userId) {
  const result = await this.updateMany(
    {
      conversationId: conversationId,
      recipientId: userId,
      isRead: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
  return result;
};

// Static method to mark messages as delivered
messageSchema.statics.markAsDelivered = async function(conversationId, userId) {
  const result = await this.updateMany(
    {
      conversationId: conversationId,
      recipientId: userId,
      isDelivered: false
    },
    {
      isDelivered: true,
      deliveredAt: new Date()
    }
  );
  return result;
};

// Static method to get unread count for a user
messageSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipientId: userId,
    isRead: false
  });
};

// Static method to get unread count per conversation
messageSchema.statics.getUnreadCountByConversation = async function(userId) {
  return await this.aggregate([
    { $match: { recipientId: userId, isRead: false } },
    { $group: { _id: '$conversationId', count: { $sum: 1 } } }
  ]);
};

// Static method to get last message in conversation
messageSchema.statics.getLastMessage = async function(conversationId) {
  return await this.findOne({ conversationId })
    .sort({ createdAt: -1 })
    .limit(1);
};

// Method to mark single message as read
messageSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
  return this;
};

// Method to mark single message as delivered
messageSchema.methods.markAsDelivered = async function() {
  this.isDelivered = true;
  this.deliveredAt = new Date();
  await this.save();
  return this;
};

// Virtual for message preview
messageSchema.virtual('preview').get(function() {
  if (this.message.length > 50) {
    return this.message.substring(0, 47) + '...';
  }
  return this.message;
});

module.exports = mongoose.model('Message', messageSchema);