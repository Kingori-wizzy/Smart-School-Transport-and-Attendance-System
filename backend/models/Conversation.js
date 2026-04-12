const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  type: {
    type: String,
    enum: ['direct', 'group', 'broadcast'],
    default: 'direct'
  },
  name: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastMessageAt: {
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
conversationSchema.index({ participants: 1 });
conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ isActive: 1, updatedAt: -1 });

// Static method to find conversation between two users
conversationSchema.statics.findBetweenUsers = async function(userId1, userId2) {
  return await this.findOne({
    participants: { $all: [userId1, userId2] },
    type: 'direct',
    isActive: true
  });
};

// Static method to get or create direct conversation
conversationSchema.statics.getOrCreateDirect = async function(userId1, userId2, createdBy) {
  let conversation = await this.findOne({
    participants: { $all: [userId1, userId2] },
    type: 'direct',
    isActive: true
  });
  
  if (!conversation) {
    conversation = new this({
      participants: [userId1, userId2],
      type: 'direct',
      createdBy: createdBy || userId1,
      isActive: true
    });
    await conversation.save();
  }
  
  return conversation;
};

// Method to add participant
conversationSchema.methods.addParticipant = async function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    await this.save();
  }
  return this;
};

// Method to remove participant
conversationSchema.methods.removeParticipant = async function(userId) {
  this.participants = this.participants.filter(p => p.toString() !== userId.toString());
  if (this.participants.length === 0) {
    this.isActive = false;
  }
  await this.save();
  return this;
};

module.exports = mongoose.model('Conversation', conversationSchema);