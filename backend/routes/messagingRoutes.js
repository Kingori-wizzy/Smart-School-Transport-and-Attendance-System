const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Notification = require('../models/Notification');
const smsProvider = require('../services/smsProvider');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

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
    
    res.json({
      success: true,
      data: recipients
    });
  } catch (error) {
    logger.error('Error fetching recipients:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   POST /api/messaging/send
 * @desc    Send messages to selected recipients
 * @access  Admin only
 */
router.post('/send', 
  authMiddleware, 
  authorizeRoles('admin'),
  [
    body('recipients').isObject().withMessage('Recipients object required'),
    body('message').isLength({ min: 1, max: 160 }).withMessage('Message must be between 1-160 characters'),
    body('type').isIn(['sms', 'email', 'both']).withMessage('Invalid message type')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { recipients, message, type } = req.body;
      
      // Get all recipient IDs
      const driverIds = recipients.drivers || [];
      const parentIds = recipients.parents || [];
      const allRecipientIds = [...driverIds, ...parentIds];
      
      if (allRecipientIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'No recipients selected' 
        });
      }
      
      // Fetch recipient details
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
      
      // Send messages based on type
      const results = [];
      let smsSuccessCount = 0;
      let emailSuccessCount = 0;
      
      for (const recipient of recipientsList) {
        const result = { 
          email: recipient.email, 
          phone: recipient.phone,
          name: `${recipient.firstName} ${recipient.lastName}`
        };
        
        // Send SMS if enabled
        if ((type === 'sms' || type === 'both') && recipient.phone) {
          const smsResult = await smsProvider.sendSMS(recipient.phone, message);
          result.sms = smsResult;
          if (smsResult.success) smsSuccessCount++;
        } else if ((type === 'sms' || type === 'both') && !recipient.phone) {
          result.sms = { success: false, error: 'No phone number available' };
        }
        
        // Send Email if enabled
        if ((type === 'email' || type === 'both') && recipient.email) {
          try {
            const emailResult = await emailService.sendEmail(
              recipient.email,
              'Smart School Transport System - Admin Message',
              `
                <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px;">
                  <h2 style="color: #2196F3;">Message from Admin</h2>
                  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="font-size: 16px;">${message.replace(/\n/g, '<br>')}</p>
                  </div>
                  <hr>
                  <p style="font-size: 12px; color: #666;">Smart School Transport System</p>
                </div>
              `,
              message
            );
            result.email = emailResult;
            if (emailResult.success) emailSuccessCount++;
          } catch (emailError) {
            result.email = { success: false, error: emailError.message };
          }
        } else if ((type === 'email' || type === 'both') && !recipient.email) {
          result.email = { success: false, error: 'No email address available' };
        }
        
        results.push(result);
        
        // Save notification to database
        const notification = new Notification({
          userId: recipient._id,
          userType: recipient.role,
          parentId: recipient.role === 'parent' ? recipient._id : null,
          message: message,
          title: 'Admin Message',
          type: 'admin_broadcast',
          status: 'sent',
          isRead: false,
          metadata: {
            sentBy: req.user.id,
            sentByEmail: req.user.email,
            sentByName: `${req.user.firstName} ${req.user.lastName}`,
            channel: type,
            timestamp: new Date()
          }
        });
        await notification.save();
      }
      
      res.json({
        success: true,
        summary: {
          total: recipientsList.length,
          smsSent: smsSuccessCount,
          emailSent: emailSuccessCount,
          failed: recipientsList.length - Math.max(smsSuccessCount, emailSuccessCount)
        },
        results
      });
      
    } catch (error) {
      logger.error('Error sending messages:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/messaging/history
 * @desc    Get message history
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
      .populate('userId', 'firstName lastName email');
    
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

module.exports = router;