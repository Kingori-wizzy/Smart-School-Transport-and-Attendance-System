const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const smsProvider = require('../services/smsProvider');
const Notification = require('../models/Notification');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');
const paginate = require('../utils/pagination');
const logger = require('../utils/logger');

// Rate limiting for SMS endpoints
const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: { 
    success: false, 
    error: 'Too many SMS requests, please try again later' 
  }
});

const testSMSLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // 2 test SMS per minute
  message: { 
    success: false, 
    error: 'Test SMS limit reached, please try again later' 
  }
});

// Phone number validation
const validatePhoneNumber = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
  return phoneRegex.test(phone);
};

// Validation rules
const validateTestSMS = [
  body('phone').custom(validatePhoneNumber).withMessage('Valid phone number required in E.164 format (e.g., +254712345678)'),
  body('message').optional().isLength({ max: 160 }).withMessage('Message must be less than 160 characters'),
  body('provider').optional().isIn(['smsLeopard', 'textBee']).withMessage('Invalid provider')
];

/**
 * @route   GET /api/sms/stats
 * @desc    Get SMS provider stats
 * @access  Admin only
 */
router.get('/stats', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const providerStats = await smsProvider.getStats();
    
    // Get SMS usage from database with pagination
    const { page, limit, skip } = paginate(req, 50);
    
    const [smsUsage, total] = await Promise.all([
      Notification.aggregate([
        {
          $match: {
            'deliveryStatus.channel': 'sms',
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        { $unwind: '$deliveryStatus' },
        {
          $match: { 
            'deliveryStatus.channel': 'sms' 
          }
        },
        {
          $group: {
            _id: {
              provider: '$deliveryStatus.provider',
              status: '$deliveryStatus.status',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 },
            totalCost: { $sum: { $ifNull: ['$deliveryStatus.cost', 0] } }
          }
        },
        { $sort: { '_id.date': -1 } },
        { $skip: skip },
        { $limit: limit }
      ]),
      Notification.countDocuments({
        'deliveryStatus.channel': 'sms',
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Calculate summary
    const summary = {
      totalSMS: 0,
      totalCost: 0,
      byProvider: {}
    };

    const allUsage = await Notification.aggregate([
      {
        $match: {
          'deliveryStatus.channel': 'sms',
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      { $unwind: '$deliveryStatus' },
      { $match: { 'deliveryStatus.channel': 'sms' } },
      {
        $group: {
          _id: '$deliveryStatus.provider',
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ['$deliveryStatus.cost', 0] } }
        }
      }
    ]);

    allUsage.forEach(item => {
      const provider = item._id || 'unknown';
      summary.byProvider[provider] = {
        count: item.count,
        cost: item.totalCost.toFixed(2)
      };
      summary.totalSMS += item.count;
      summary.totalCost += item.totalCost;
    });

    summary.totalCost = summary.totalCost.toFixed(2);

    res.json({
      success: true,
      providers: providerStats,
      usage: smsUsage,
      summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching SMS stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/sms/test
 * @desc    Test SMS provider
 * @access  Admin only
 */
router.post('/test', 
  authMiddleware, 
  authorizeRoles('admin'), 
  testSMSLimiter,
  validateTestSMS,
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { phone, message, provider } = req.body;

      let result;
      const testMessage = message || 'Test message from Smart School System';
      
      logger.info(`SMS test requested by admin ${req.user.id} to ${phone} via ${provider || 'auto'}`);

      if (provider === 'smsLeopard') {
        result = await smsProvider.sendViaSMSLeopard(phone, testMessage);
      } else if (provider === 'textBee') {
        // Check if TextBee is enabled
        if (process.env.TEXTBEE_ENABLED !== 'true') {
          return res.status(400).json({
            success: false,
            error: 'TextBee is disabled in configuration'
          });
        }
        result = await smsProvider.sendViaTextBee(phone, testMessage);
      } else {
        // Test both with fallback
        result = await smsProvider.sendSMS(phone, testMessage, { testMode: true });
      }
      
      // Log the test result
      logger.info(`SMS test result: ${result.success ? 'SUCCESS' : 'FAILED'}`, {
        provider: result.provider,
        messageId: result.messageId,
        error: result.error
      });

      res.json({ 
        success: true, 
        result: {
          ...result,
          // Don't expose API keys in response
          apiKeyUsed: undefined
        }
      });
    } catch (error) {
      logger.error('SMS test error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

/**
 * @route   GET /api/sms/history
 * @desc    Get SMS history with pagination and filters
 * @access  Admin only
 */
router.get('/history', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { startDate, endDate, provider, status, phone } = req.query;
    const { page, limit, skip } = paginate(req, 100);

    const query = {
      'deliveryStatus.channel': 'sms'
    };

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          query.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          query.createdAt.$lte = end;
        }
      }
    }

    // Phone number filter
    if (phone) {
      query.recipientPhone = { $regex: phone, $options: 'i' };
    }

    // Provider filter - need to use aggregation for nested filtering
    const pipeline = [
      { $match: query },
      { $unwind: '$deliveryStatus' },
      { $match: { 'deliveryStatus.channel': 'sms' } }
    ];

    if (provider) {
      pipeline.push({ $match: { 'deliveryStatus.provider': provider } });
    }

    if (status) {
      pipeline.push({ $match: { 'deliveryStatus.status': status } });
    }

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Notification.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'studentInfo'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'recipientId',
          foreignField: '_id',
          as: 'recipientInfo'
        }
      }
    );

    const notifications = await Notification.aggregate(pipeline);

    // Format response
    const history = notifications.map(n => ({
      id: n._id,
      recipient: n.recipientInfo[0] ? {
        id: n.recipientInfo[0]._id,
        name: n.recipientInfo[0].name,
        phone: n.recipientInfo[0].phone
      } : null,
      student: n.studentInfo[0] ? {
        id: n.studentInfo[0]._id,
        name: n.studentInfo[0].name
      } : null,
      message: n.message,
      type: n.type,
      provider: n.deliveryStatus.provider,
      status: n.deliveryStatus.status,
      sentAt: n.deliveryStatus.sentAt,
      deliveredAt: n.deliveryStatus.deliveredAt,
      cost: n.deliveryStatus.cost || 0,
      error: n.deliveryStatus.error,
      createdAt: n.createdAt
    }));

    res.json({
      success: true,
      data: history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching SMS history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/sms/balance/:provider
 * @desc    Get provider balance
 * @access  Admin only
 */
router.get('/balance/:provider', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!['smsLeopard', 'textBee'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be smsLeopard or textBee'
      });
    }

    let balance = null;
    
    if (provider === 'smsLeopard') {
      // Check if API key is configured
      if (!process.env.SMSLEOPARD_API_KEY) {
        return res.status(503).json({
          success: false,
          error: 'SMSLeopard API key not configured'
        });
      }

      try {
        // You'll need to implement this endpoint based on SMSLeopard's API
        const response = await axios.get('https://api.smsleopard.com/v1/balance', {
          headers: {
            'Authorization': `Bearer ${process.env.SMSLEOPARD_API_KEY}`
          },
          timeout: 10000
        });

        balance = {
          available: response.data.balance || 0,
          currency: response.data.currency || 'KES',
          expiresAt: response.data.expiresAt
        };
      } catch (apiError) {
        logger.error('SMSLeopard balance check failed:', apiError.message);
        balance = { 
          available: 'Unknown', 
          currency: 'KES',
          error: 'Could not fetch balance' 
        };
      }
    } else if (provider === 'textBee') {
      if (process.env.TEXTBEE_ENABLED !== 'true') {
        balance = { 
          available: 'Disabled', 
          type: 'free',
          message: 'TextBee is currently disabled' 
        };
      } else {
        balance = { 
          available: 'Unlimited (Free)', 
          type: 'free',
          limit: '100 SMS/day' 
        };
      }
    }

    res.json({
      success: true,
      provider,
      balance,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching balance:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/sms/retry/:notificationId
 * @desc    Retry failed SMS
 * @access  Admin only
 */
router.post('/retry/:notificationId', 
  authMiddleware, 
  authorizeRoles('admin'),
  smsLimiter,
  async (req, res) => {
    try {
      const { notificationId } = req.params;

      const notification = await Notification.findById(notificationId);
      if (!notification) {
        return res.status(404).json({ 
          success: false, 
          error: 'Notification not found' 
        });
      }

      const smsDelivery = notification.deliveryStatus.find(d => d.channel === 'sms');
      if (!smsDelivery) {
        return res.status(400).json({ 
          success: false, 
          error: 'No SMS delivery record found' 
        });
      }

      // Check if we haven't exceeded max retries
      if (smsDelivery.retryCount >= 3) {
        return res.status(400).json({
          success: false,
          error: 'Maximum retry attempts reached'
        });
      }

      logger.info(`Retrying SMS for notification ${notificationId}`);

      // Retry sending SMS
      const result = await smsProvider.sendSMS(
        notification.recipientPhone,
        notification.message,
        { maxRetries: 3 }
      );

      // Update notification
      smsDelivery.status = result.success ? 'sent' : 'failed';
      smsDelivery.sentAt = new Date();
      smsDelivery.provider = result.provider;
      smsDelivery.messageId = result.messageId;
      smsDelivery.error = result.error;
      smsDelivery.retryCount = (smsDelivery.retryCount || 0) + 1;

      await notification.save();

      res.json({
        success: true,
        result: {
          success: result.success,
          provider: result.provider,
          messageId: result.messageId,
          retryCount: smsDelivery.retryCount
        }
      });
    } catch (error) {
      logger.error('Error retrying SMS:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

/**
 * @route   GET /api/sms/cost-summary
 * @desc    Get cost summary with daily breakdown
 * @access  Admin only
 */
router.get('/cost-summary', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {
      'deliveryStatus.channel': 'sms'
    };

    // Date range filter
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          matchStage.createdAt.$gte = start;
        }
      }
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          matchStage.createdAt.$lte = end;
        }
      }
    }

    const costSummary = await Notification.aggregate([
      { $match: matchStage },
      { $unwind: '$deliveryStatus' },
      { $match: { 'deliveryStatus.channel': 'sms' } },
      {
        $group: {
          _id: {
            provider: '$deliveryStatus.provider',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          count: { $sum: 1 },
          totalCost: { $sum: { $ifNull: ['$deliveryStatus.cost', 0] } },
          successful: {
            $sum: {
              $cond: [{ $eq: ['$deliveryStatus.status', 'sent'] }, 1, 0]
            }
          },
          failed: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$deliveryStatus.status', 'failed'] },
                  { $eq: ['$deliveryStatus.status', 'error'] }
                ]}, 
                1, 0
              ]
            }
          }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]);

    // Calculate totals
    const totals = costSummary.reduce((acc, item) => {
      acc.totalSMS += item.count;
      acc.totalCost += item.totalCost;
      acc.successful += item.successful;
      acc.failed += item.failed;
      
      if (!acc.byProvider[item._id.provider]) {
        acc.byProvider[item._id.provider] = { count: 0, cost: 0, successful: 0, failed: 0 };
      }
      acc.byProvider[item._id.provider].count += item.count;
      acc.byProvider[item._id.provider].cost += item.totalCost;
      acc.byProvider[item._id.provider].successful += item.successful;
      acc.byProvider[item._id.provider].failed += item.failed;
      
      return acc;
    }, { 
      totalSMS: 0, 
      totalCost: 0, 
      successful: 0, 
      failed: 0, 
      byProvider: {} 
    });

    // Format provider costs to 2 decimal places
    Object.keys(totals.byProvider).forEach(provider => {
      totals.byProvider[provider].cost = totals.byProvider[provider].cost.toFixed(2);
    });

    // Format daily costs
    const daily = costSummary.map(day => ({
      date: day._id.date,
      provider: day._id.provider,
      count: day.count,
      cost: day.totalCost.toFixed(2),
      successful: day.successful,
      failed: day.failed,
      successRate: day.count > 0 ? Math.round((day.successful / day.count) * 100) : 0
    }));

    res.json({
      success: true,
      daily,
      totals: {
        totalSMS: totals.totalSMS,
        totalCost: totals.totalCost.toFixed(2),
        successful: totals.successful,
        failed: totals.failed,
        successRate: totals.totalSMS > 0 
          ? Math.round((totals.successful / totals.totalSMS) * 100) 
          : 0,
        byProvider: totals.byProvider
      }
    });
  } catch (error) {
    logger.error('Error generating cost summary:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/sms/bulk
 * @desc    Send bulk SMS (for announcements)
 * @access  Admin only
 */
router.post('/bulk',
  authMiddleware,
  authorizeRoles('admin'),
  smsLimiter,
  [
    body('message').isLength({ min: 1, max: 160 }).withMessage('Message must be between 1-160 characters'),
    body('recipients').isArray().withMessage('Recipients must be an array'),
    body('recipients.*.phone').custom(validatePhoneNumber).withMessage('Valid phone numbers required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { message, recipients, type = 'bulk_announcement' } = req.body;

      // Limit bulk send to 100 recipients at a time
      if (recipients.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 recipients per bulk send'
        });
      }

      logger.info(`Bulk SMS requested by admin ${req.user.id} to ${recipients.length} recipients`);

      const results = await Promise.allSettled(
        recipients.map(async (recipient) => {
          try {
            const result = await smsProvider.sendSMS(recipient.phone, message);
            
            // Create notification record
            const notification = new Notification({
              type,
              message,
              recipientId: recipient.userId,
              recipientPhone: recipient.phone,
              studentId: recipient.studentId,
              deliveryStatus: [{
                channel: 'sms',
                status: result.success ? 'sent' : 'failed',
                provider: result.provider,
                messageId: result.messageId,
                sentAt: new Date(),
                cost: result.cost || 0
              }]
            });
            
            await notification.save();
            
            return {
              phone: recipient.phone,
              success: result.success,
              messageId: result.messageId
            };
          } catch (error) {
            return {
              phone: recipient.phone,
              success: false,
              error: error.message
            };
          }
        })
      );

      const summary = {
        total: recipients.length,
        successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
        failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
      };

      res.json({
        success: true,
        summary,
        results: results.map(r => r.status === 'fulfilled' ? r.value : r.reason)
      });

    } catch (error) {
      logger.error('Error sending bulk SMS:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
);

module.exports = router;