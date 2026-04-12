const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const smsProvider = require('../services/smsProvider');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Helper: Send SMS via TextBee
async function sendParentSMS(phoneNumber, message, parentName) {
  if (!phoneNumber) {
    console.log(`No phone number for ${parentName}, SMS skipped`);
    return false;
  }
  
  try {
    const result = await smsProvider.sendSMS(phoneNumber, message);
    if (result.success) {
      console.log(`SMS sent to ${phoneNumber} for ${parentName} via ${result.provider}`);
      return true;
    } else {
      console.error(`SMS failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('SMS error:', error.message);
    return false;
  }
}

// Helper: Create in-app notification
async function createInAppNotification(userId, title, message, type, relatedId = null, relatedModel = null) {
  try {
    const notification = new Notification({
      userId: userId,
      recipientId: userId,
      recipientType: 'parent',
      title,
      message,
      type,
      relatedId,
      relatedModel,
      createdAt: new Date(),
      isRead: false
    });
    await notification.save();
    
    if (global.io) {
      global.io.to(`user-${userId}`).emit('new-notification', notification);
      console.log(`[NOTIFICATION] In-app notification sent to user ${userId}`);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Helper: Send email
async function sendParentEmail(email, subject, htmlContent, textContent) {
  if (!email) {
    console.log('No email address, email skipped');
    return false;
  }
  
  try {
    const result = await emailService.sendEmail(email, subject, htmlContent, textContent);
    if (result.success) {
      console.log(`Email sent to ${email}`);
      return true;
    } else {
      console.error(`Email failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('Email error:', error.message);
    return false;
  }
}

// Helper: Get or create conversation between parent and driver
async function getOrCreateConversation(parentId, driverId, driverName) {
  let conversation = await Conversation.findOne({
    participants: { $all: [parentId, driverId] },
    type: 'direct'
  });
  
  if (!conversation) {
    conversation = new Conversation({
      participants: [parentId, driverId],
      type: 'direct',
      name: driverName,
      createdBy: parentId,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await conversation.save();
    console.log(`[CONVERSATION] Created new conversation between parent ${parentId} and driver ${driverId}`);
  }
  
  return conversation;
}

/**
 * @route   GET /api/messaging/recipients
 * @desc    Get list of recipients (drivers/parents) for messaging
 * @access  Admin only
 */
router.get('/recipients', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.query;
    
    let query = { isActive: true };
    if (role === 'driver') {
      query.role = 'driver';
    } else if (role === 'parent') {
      query.role = 'parent';
    } else {
      query.role = { $in: ['driver', 'parent'] };
    }
    
    const recipients = await User.find(query)
      .select('firstName lastName email phone role isActive driverDetails children')
      .lean();
    
    const formattedRecipients = recipients.map(r => ({
      id: r._id,
      name: `${r.firstName} ${r.lastName}`.trim(),
      email: r.email,
      phone: r.phone,
      role: r.role,
      isActive: r.isActive
    }));
    
    res.json({
      success: true,
      data: formattedRecipients,
      count: formattedRecipients.length
    });
  } catch (error) {
    logger.error('Error fetching recipients:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/messaging/send
 * @desc    Send messages to selected recipients (Admin Broadcast)
 * @access  Admin only
 */
router.post('/send', 
  authMiddleware, 
  authorizeRoles('admin'),
  [
    body('recipients').isObject().withMessage('Recipients object required'),
    body('message').isLength({ min: 1, max: 500 }).withMessage('Message must be between 1-500 characters'),
    body('type').isIn(['sms', 'email', 'both', 'push']).withMessage('Invalid message type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { recipients, message, type } = req.body;
      
      const driverIds = recipients.drivers || [];
      const parentIds = recipients.parents || [];
      const allRecipientIds = [...driverIds, ...parentIds];
      
      if (allRecipientIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No recipients selected' 
        });
      }
      
      const recipientsList = await User.find({
        _id: { $in: allRecipientIds },
        isActive: true
      }).select('firstName lastName email phone role');
      
      if (recipientsList.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No valid recipients found' 
        });
      }
      
      const results = [];
      let smsSuccessCount = 0;
      let emailSuccessCount = 0;
      let pushSuccessCount = 0;
      
      for (const recipient of recipientsList) {
        const result = { 
          id: recipient._id,
          name: `${recipient.firstName} ${recipient.lastName}`.trim(),
          email: recipient.email, 
          phone: recipient.phone
        };
        
        if ((type === 'sms' || type === 'both') && recipient.phone) {
          const smsResult = await sendParentSMS(recipient.phone, message, result.name);
          result.sms = smsResult;
          if (smsResult) smsSuccessCount++;
        } else if ((type === 'sms' || type === 'both') && !recipient.phone) {
          result.sms = false;
        }
        
        if ((type === 'email' || type === 'both') && recipient.email) {
          const emailSubject = 'Smart School Transport System - Admin Message';
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
              <h2 style="color: #2196F3;">Message from Admin</h2>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="font-size: 16px;">${message.replace(/\n/g, '<br>')}</p>
              </div>
              <hr>
              <p style="font-size: 12px; color: #666;">Smart School Transport System</p>
            </div>
          `;
          const emailResult = await sendParentEmail(recipient.email, emailSubject, emailHtml, message);
          result.email = emailResult;
          if (emailResult) emailSuccessCount++;
        } else if ((type === 'email' || type === 'both') && !recipient.email) {
          result.email = false;
        }
        
        const notification = await createInAppNotification(
          recipient._id, 
          'Admin Message', 
          message, 
          'admin_broadcast'
        );
        
        if (notification) {
          pushSuccessCount++;
          result.push = true;
        }
        
        results.push(result);
      }
      
      res.json({
        success: true,
        summary: {
          total: recipientsList.length,
          smsSent: smsSuccessCount,
          emailSent: emailSuccessCount,
          pushSent: pushSuccessCount,
          failed: recipientsList.length - Math.max(smsSuccessCount, emailSuccessCount, pushSuccessCount)
        },
        results,
        message: `Message sent to ${recipientsList.length} recipient(s)`
      });
      
    } catch (error) {
      logger.error('Error sending messages:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/messaging/history
 * @desc    Get message history (Admin broadcasts)
 * @access  Admin only
 */
router.get('/history', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const messages = await Notification.find({ type: 'admin_broadcast' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('recipientId', 'firstName lastName email phone');
    
    const total = await Notification.countDocuments({ type: 'admin_broadcast' });
    
    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching message history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== PARENT MESSAGING ENDPOINTS ====================

/**
 * @route   GET /api/messaging/parent/conversations
 * @desc    Get all conversations for a parent
 * @access  Parent only
 */
router.get('/parent/conversations', authMiddleware, authorizeRoles('parent'), async (req, res) => {
  try {
    const parentId = req.user.id;
    console.log(`[PARENT CONVERSATIONS] Fetching for user: ${parentId}`);
    
    const conversations = await Conversation.find({
      participants: parentId,
      isActive: { $ne: false }
    })
    .populate('participants', 'firstName lastName email phone role')
    .sort({ updatedAt: -1 });
    
    console.log(`[PARENT CONVERSATIONS] Found ${conversations.length} raw conversations`);
    
    const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
      const lastMessage = await Message.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .limit(1);
      
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        recipientId: parentId,
        isRead: false
      });
      
      const otherParticipant = conv.participants.find(p => p._id.toString() !== parentId);
      
      return {
        id: conv._id,
        name: otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}`.trim() : 'Unknown',
        type: otherParticipant?.role === 'driver' ? 'driver' : 'staff',
        lastMessage: lastMessage ? {
          text: lastMessage.message,
          timestamp: lastMessage.createdAt,
          smsSent: lastMessage.smsSent || false
        } : null,
        unread: unreadCount,
        updatedAt: conv.updatedAt,
        driverId: otherParticipant?._id
      };
    }));
    
    const filteredConversations = conversationsWithDetails.filter(c => c.lastMessage !== null);
    
    filteredConversations.sort((a, b) => {
      const dateA = a.lastMessage?.timestamp || a.updatedAt;
      const dateB = b.lastMessage?.timestamp || b.updatedAt;
      return new Date(dateB) - new Date(dateA);
    });
    
    console.log(`[PARENT CONVERSATIONS] Returning ${filteredConversations.length} conversations`);
    
    res.json({
      success: true,
      data: filteredConversations
    });
  } catch (error) {
    console.error('[PARENT CONVERSATIONS] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/messaging/parent/conversations/:conversationId/messages
 * @desc    Get messages for a specific conversation
 * @access  Parent only
 */
router.get('/parent/conversations/:conversationId/messages', authMiddleware, authorizeRoles('parent'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const parentId = req.user.id;
    
    console.log(`[PARENT MESSAGES] Fetching for conversation ${conversationId}`);
    
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: parentId
    });
    
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email');
    
    console.log(`[PARENT MESSAGES] Found ${messages.length} messages`);
    
    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      conversationId: msg.conversationId,
      senderId: msg.senderId._id,
      senderName: `${msg.senderId.firstName} ${msg.senderId.lastName}`.trim(),
      recipientId: msg.recipientId?._id,
      recipientName: msg.recipientId ? `${msg.recipientId.firstName} ${msg.recipientId.lastName}`.trim() : null,
      text: msg.message,
      timestamp: msg.createdAt,
      read: msg.isRead,
      delivered: msg.isDelivered,
      smsSent: msg.smsSent || false
    }));
    
    res.json({
      success: true,
      data: formattedMessages,
      conversation: {
        id: conversation._id,
        name: conversation.name,
        type: conversation.type
      }
    });
  } catch (error) {
    console.error('[PARENT MESSAGES] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/messaging/parent/conversations/:conversationId/messages
 * @desc    Send a message from parent to driver
 * @access  Parent only
 */
router.post('/parent/conversations/:conversationId/messages', 
  authMiddleware, 
  authorizeRoles('parent'),
  [
    body('text').isLength({ min: 1, max: 500 }).withMessage('Message must be between 1-500 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const { conversationId } = req.params;
      const { text } = req.body;
      const parentId = req.user.id;
      
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: parentId
      }).populate('participants', 'firstName lastName email phone role');
      
      if (!conversation) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const driver = conversation.participants.find(p => p._id.toString() !== parentId && p.role === 'driver');
      if (!driver) {
        return res.status(400).json({ success: false, error: 'No driver found in conversation' });
      }
      
      const message = new Message({
        conversationId,
        senderId: parentId,
        recipientId: driver._id,
        message: text,
        type: 'text',
        isRead: false,
        isDelivered: false,
        createdAt: new Date()
      });
      
      await message.save();
      
      conversation.updatedAt = new Date();
      await conversation.save();
      
      const formattedMessage = {
        id: message._id,
        conversationId: message.conversationId,
        senderId: parentId,
        senderName: `${req.user.firstName} ${req.user.lastName}`.trim(),
        recipientId: driver._id,
        recipientName: `${driver.firstName} ${driver.lastName}`.trim(),
        text: message.message,
        timestamp: message.createdAt,
        read: false,
        delivered: false,
        smsSent: false
      };
      
      // Emit socket events for real-time delivery
      if (global.io) {
        global.io.to(`user-${driver._id}`).emit('new-message', formattedMessage);
        console.log(`[SOCKET] Emitted new-message to user-${driver._id}`);
        
        global.io.to(`conversation-${conversationId}`).emit('new-message', formattedMessage);
        console.log(`[SOCKET] Emitted new-message to conversation-${conversationId}`);
      }
      
      if (driver.phone && process.env.SMS_ENABLED === 'true') {
        const smsMessage = `Smart School: New message from parent ${req.user.firstName} ${req.user.lastName}: ${text.substring(0, 100)}`;
        await sendParentSMS(driver.phone, smsMessage, driver.firstName);
        message.smsSent = true;
        await message.save();
        formattedMessage.smsSent = true;
      }
      
      res.json({
        success: true,
        data: formattedMessage,
        message: 'Message sent successfully'
      });
      
    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/messaging/parent/conversations/:conversationId/read
 * @desc    Mark all messages in a conversation as read
 * @access  Parent only
 */
router.post('/parent/conversations/:conversationId/read', authMiddleware, authorizeRoles('parent'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const parentId = req.user.id;
    
    const result = await Message.updateMany(
      {
        conversationId,
        recipientId: parentId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    if (global.io && result.modifiedCount > 0) {
      global.io.to(`conversation-${conversationId}`).emit('messages-read', {
        conversationId,
        readBy: parentId,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      message: `${result.modifiedCount} messages marked as read`
    });
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== DRIVER MESSAGING ENDPOINTS ====================

/**
 * @route   GET /api/messaging/driver/conversations
 * @desc    Get all conversations for a driver
 * @access  Driver only
 */
router.get('/driver/conversations', authMiddleware, authorizeRoles('driver'), async (req, res) => {
  try {
    const driverId = req.user.id;
    
    const conversations = await Conversation.find({
      participants: driverId,
      isActive: true
    })
    .populate('participants', 'firstName lastName email phone role')
    .sort({ updatedAt: -1 });
    
    const conversationsWithLastMessage = await Promise.all(conversations.map(async (conv) => {
      const lastMessage = await Message.findOne({ conversationId: conv._id })
        .sort({ createdAt: -1 })
        .limit(1);
      
      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        recipientId: driverId,
        isRead: false
      });
      
      const otherParticipant = conv.participants.find(p => p._id.toString() !== driverId);
      
      return {
        id: conv._id,
        name: otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}`.trim() : 'Unknown',
        type: otherParticipant?.role === 'parent' ? 'parent' : 'staff',
        lastMessage: lastMessage || null,
        unread: unreadCount,
        updatedAt: conv.updatedAt
      };
    }));
    
    conversationsWithLastMessage.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || a.updatedAt;
      const dateB = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(dateB) - new Date(dateA);
    });
    
    res.json({
      success: true,
      data: conversationsWithLastMessage
    });
  } catch (error) {
    logger.error('Error fetching driver conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/messaging/driver/conversations/:conversationId/messages
 * @desc    Get messages for a specific conversation (Driver)
 * @access  Driver only
 */
router.get('/driver/conversations/:conversationId/messages', authMiddleware, authorizeRoles('driver'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const driverId = req.user.id;
    
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: driverId
    });
    
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'firstName lastName email')
      .populate('recipientId', 'firstName lastName email');
    
    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      conversationId: msg.conversationId,
      senderId: msg.senderId._id,
      senderName: `${msg.senderId.firstName} ${msg.senderId.lastName}`.trim(),
      recipientId: msg.recipientId?._id,
      recipientName: msg.recipientId ? `${msg.recipientId.firstName} ${msg.recipientId.lastName}`.trim() : null,
      text: msg.message,
      timestamp: msg.createdAt,
      read: msg.isRead,
      delivered: msg.isDelivered,
      smsSent: msg.smsSent || false
    }));
    
    res.json({
      success: true,
      data: formattedMessages,
      conversation: {
        id: conversation._id,
        name: conversation.name,
        type: conversation.type
      }
    });
  } catch (error) {
    logger.error('Error fetching driver messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/messaging/driver/conversations/:conversationId/messages
 * @desc    Send a message from driver to parent (SMS + Email + Push)
 * @access  Driver only
 */
router.post('/driver/conversations/:conversationId/messages',
  authMiddleware,
  authorizeRoles('driver'),
  [
    body('text').isLength({ min: 1, max: 500 }).withMessage('Message must be between 1-500 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }
      
      const { conversationId } = req.params;
      const { text } = req.body;
      const driverId = req.user.id;
      
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: driverId
      }).populate('participants', 'firstName lastName email phone role');
      
      if (!conversation) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }
      
      const parent = conversation.participants.find(p => p._id.toString() !== driverId && p.role === 'parent');
      if (!parent) {
        return res.status(400).json({ success: false, error: 'No parent found in conversation' });
      }
      
      const message = new Message({
        conversationId,
        senderId: driverId,
        recipientId: parent._id,
        message: text,
        type: 'text',
        isRead: false,
        isDelivered: false,
        createdAt: new Date()
      });
      
      await message.save();
      
      conversation.updatedAt = new Date();
      await conversation.save();
      
      const formattedMessage = {
        id: message._id,
        conversationId: message.conversationId,
        senderId: driverId,
        senderName: `${req.user.firstName} ${req.user.lastName}`.trim(),
        recipientId: parent._id,
        recipientName: `${parent.firstName} ${parent.lastName}`.trim(),
        text: message.message,
        timestamp: message.createdAt,
        read: false,
        delivered: false,
        smsSent: false
      };
      
      // Emit socket events for real-time delivery
      if (global.io) {
        global.io.to(`user-${parent._id}`).emit('new-message', formattedMessage);
        console.log(`[SOCKET] Emitted new-message to user-${parent._id}`);
        
        global.io.to(`conversation-${conversationId}`).emit('new-message', formattedMessage);
        console.log(`[SOCKET] Emitted new-message to conversation-${conversationId}`);
        
        // Also emit a notification
        global.io.to(`user-${parent._id}`).emit('new-notification', {
          id: Date.now(),
          title: `Message from ${req.user.firstName} ${req.user.lastName}`,
          message: text.length > 100 ? text.substring(0, 100) + '...' : text,
          type: 'driver_message',
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        });
        console.log(`[SOCKET] Emitted new-notification to user-${parent._id}`);
      }
      
      let smsSent = false;
      if (parent.phone && process.env.SMS_ENABLED === 'true') {
        const smsMessage = `Smart School: Message from driver ${req.user.firstName} ${req.user.lastName}: ${text.substring(0, 100)}. Reply via the parent app.`;
        smsSent = await sendParentSMS(parent.phone, smsMessage, parent.firstName);
        if (smsSent) {
          message.smsSent = true;
          await message.save();
          formattedMessage.smsSent = true;
        }
      }
      
      let emailSent = false;
      if (parent.email && process.env.EMAIL_ENABLED === 'true') {
        const emailSubject = `Message from Driver - ${req.user.firstName} ${req.user.lastName}`;
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
            <h2 style="color: #FF9800;">Message from Your Driver</h2>
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p><strong>Driver:</strong> ${req.user.firstName} ${req.user.lastName}</p>
              <p><strong>Message:</strong></p>
              <p style="font-size: 16px; margin-top: 10px;">${text.replace(/\n/g, '<br>')}</p>
            </div>
            <div style="background-color: #e3f2fd; padding: 10px; border-radius: 8px; margin-top: 15px;">
              <p style="font-size: 12px; color: #666;">Reply through the Smart School Transport app.</p>
            </div>
            <hr>
            <p style="font-size: 12px; color: #666;">Smart School Transport System</p>
          </div>
        `;
        emailSent = await sendParentEmail(parent.email, emailSubject, emailHtml, text);
      }
      
      await createInAppNotification(parent._id, `Message from ${req.user.firstName} ${req.user.lastName}`, text.length > 100 ? text.substring(0, 100) + '...' : text, 'driver_message', conversationId, 'Conversation');
      
      res.json({
        success: true,
        data: formattedMessage,
        message: `Message sent successfully. Parent notified via ${smsSent ? 'SMS, ' : ''}${emailSent ? 'Email, ' : ''}and In-App notification.`
      });
      
    } catch (error) {
      logger.error('Error sending driver message:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/messaging/driver/conversations/:conversationId/read
 * @desc    Mark all messages in a conversation as read (Driver)
 * @access  Driver only
 */
router.post('/driver/conversations/:conversationId/read', authMiddleware, authorizeRoles('driver'), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const driverId = req.user.id;
    
    const result = await Message.updateMany(
      {
        conversationId,
        recipientId: driverId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    if (global.io && result.modifiedCount > 0) {
      global.io.to(`conversation-${conversationId}`).emit('messages-read', {
        conversationId,
        readBy: driverId,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      message: `${result.modifiedCount} messages marked as read`
    });
  } catch (error) {
    logger.error('Error marking driver messages as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/messaging/initiate-conversation
 * @desc    Initiate a conversation between parent and driver
 * @access  Parent or Driver
 */
router.post('/initiate-conversation', authMiddleware, async (req, res) => {
  try {
    const { driverId, parentId } = req.body;
    const userId = req.user.id;
    
    let driver, parent;
    
    if (req.user.role === 'parent') {
      parent = await User.findById(userId);
      driver = await User.findById(driverId);
      if (!driver || driver.role !== 'driver') {
        return res.status(400).json({ success: false, error: 'Invalid driver selected' });
      }
    } else if (req.user.role === 'driver') {
      driver = await User.findById(userId);
      parent = await User.findById(parentId);
      if (!parent || parent.role !== 'parent') {
        return res.status(400).json({ success: false, error: 'Invalid parent selected' });
      }
    } else {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    const conversation = await getOrCreateConversation(
      parent._id,
      driver._id,
      `${driver.firstName} ${driver.lastName}`.trim()
    );
    
    res.json({
      success: true,
      data: {
        conversationId: conversation._id,
        driverName: `${driver.firstName} ${driver.lastName}`.trim(),
        parentName: `${parent.firstName} ${parent.lastName}`.trim()
      },
      message: 'Conversation initiated successfully'
    });
  } catch (error) {
    logger.error('Error initiating conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;