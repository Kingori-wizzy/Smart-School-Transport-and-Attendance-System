const express = require('express');
const router = express.Router();
const smsProvider = require('../services/smsProvider');
const Notification = require('../models/Notification');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// Get SMS provider stats (admin only)
router.get('/stats', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const providerStats = await smsProvider.getStats();
    
    // Get SMS usage from database
    const smsUsage = await Notification.aggregate([
      {
        $match: {
          'deliveryStatus.channel': 'sms',
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $unwind: '$deliveryStatus'
      },
      {
        $match: { 'deliveryStatus.channel': 'sms' }
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
      { $sort: { '_id.date': -1 } }
    ]);

    // Calculate summary
    const summary = {
      totalSMS: smsUsage.reduce((acc, curr) => acc + curr.count, 0),
      totalCost: smsUsage.reduce((acc, curr) => acc + (curr.totalCost || 0), 0).toFixed(2),
      byProvider: {}
    };

    smsUsage.forEach(item => {
      const provider = item._id.provider || 'unknown';
      if (!summary.byProvider[provider]) {
        summary.byProvider[provider] = { count: 0, cost: 0 };
      }
      summary.byProvider[provider].count += item.count;
      summary.byProvider[provider].cost += item.totalCost || 0;
    });

    res.json({
      success: true,
      providers: providerStats,
      usage: smsUsage,
      summary
    });
  } catch (error) {
    console.error('Error fetching SMS stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test SMS provider (admin only)
router.post('/test', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { phone, message, provider } = req.body;

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone number is required' 
      });
    }

    let result;
    const testMessage = message || 'Test message from Smart School System';
    
    if (provider === 'smsLeopard') {
      result = await smsProvider.sendViaSMSLeopard(phone, testMessage);
    } else if (provider === 'textBee') {
      result = await smsProvider.sendViaTextBee(phone, testMessage);
    } else {
      // Test both with fallback
      result = await smsProvider.sendSMS(phone, testMessage);
    }
    
    res.json({ 
      success: true, 
      result 
    });
  } catch (error) {
    console.error('SMS test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get SMS history (admin only)
router.get('/history', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { startDate, endDate, provider, status, limit = 100 } = req.query;

    const query = {
      'deliveryStatus.channel': 'sms'
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await Notification.find(query)
      .populate('studentId', 'name')
      .populate('recipientId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Filter by provider if specified
    let filtered = notifications;
    if (provider) {
      filtered = notifications.filter(n => 
        n.deliveryStatus.some(d => d.channel === 'sms' && d.provider === provider)
      );
    }

    // Filter by status if specified
    if (status) {
      filtered = filtered.filter(n => 
        n.deliveryStatus.some(d => d.channel === 'sms' && d.status === status)
      );
    }

    // Format response
    const history = filtered.map(n => {
      const smsDelivery = n.deliveryStatus.find(d => d.channel === 'sms');
      return {
        id: n._id,
        recipient: n.recipientId,
        student: n.studentId,
        message: n.message,
        type: n.type,
        provider: smsDelivery?.provider,
        status: smsDelivery?.status,
        sentAt: smsDelivery?.sentAt,
        deliveredAt: smsDelivery?.deliveredAt,
        cost: smsDelivery?.cost || 0,
        error: smsDelivery?.error
      };
    });

    res.json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (error) {
    console.error('Error fetching SMS history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get provider balance (admin only)
router.get('/balance/:provider', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { provider } = req.params;
    
    let balance = null;
    
    if (provider === 'smsLeopard') {
      // You would implement a balance check endpoint with SMSLeopard
      balance = { available: 1000, currency: 'KES' }; // Placeholder
    } else if (provider === 'textBee') {
      balance = { available: 'Unlimited', type: 'free' };
    }

    res.json({
      success: true,
      provider,
      balance
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Retry failed SMS (admin only)
router.post('/retry/:notificationId', authMiddleware, authorizeRoles('admin'), async (req, res) => {
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

    await notification.save();

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error retrying SMS:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get cost summary (admin only)
router.get('/cost-summary', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {
      'deliveryStatus.channel': 'sms'
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
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
              $cond: [{ $eq: ['$deliveryStatus.status', 'failed'] }, 1, 0]
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
        acc.byProvider[item._id.provider] = { count: 0, cost: 0 };
      }
      acc.byProvider[item._id.provider].count += item.count;
      acc.byProvider[item._id.provider].cost += item.totalCost;
      
      return acc;
    }, { totalSMS: 0, totalCost: 0, successful: 0, failed: 0, byProvider: {} });

    res.json({
      success: true,
      daily: costSummary,
      totals: {
        ...totals,
        totalCost: totals.totalCost.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Error generating cost summary:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;