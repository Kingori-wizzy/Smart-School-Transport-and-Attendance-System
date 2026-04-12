const express = require('express');
const router = express.Router();

const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const paginate = require('../utils/pagination');
const smsProvider = require('../services/smsProvider');

/*
=====================================================
📱 PARENT - Get My Notifications (Paginated)
=====================================================
*/
router.get(
  '/',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const { page, limit, skip } = paginate(req);
      
      const [notifications, total] = await Promise.all([
        Notification.find({ userId: req.user.id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('studentId', 'firstName lastName admissionNumber')
          .populate('tripId', 'routeName vehicleId status'),
        Notification.countDocuments({ userId: req.user.id })
      ]);

      const unreadCount = await Notification.countDocuments({
        userId: req.user.id,
        isRead: false
      });

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          unread: unreadCount
        }
      });

    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
📱 PARENT - Get Unread Count
=====================================================
*/
router.get(
  '/unread/count',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const count = await Notification.countDocuments({
        userId: req.user.id,
        isRead: false
      });

      res.json({
        success: true,
        data: { unreadCount: count }
      });

    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
📱 PARENT - Get Notification by ID
=====================================================
*/
router.get(
  '/:id',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id)
        .populate('studentId', 'firstName lastName admissionNumber')
        .populate('tripId', 'routeName vehicleId status');

      if (!notification) {
        return res.status(404).json({ 
          success: false,
          message: 'Notification not found' 
        });
      }

      if (notification.userId.toString() !== req.user.id) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized' 
        });
      }

      res.json({
        success: true,
        data: notification
      });

    } catch (error) {
      console.error('Error fetching notification:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
📱 PARENT - Mark Notification as Read
=====================================================
*/
router.put(
  '/:id/read',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return res.status(404).json({ 
          success: false,
          message: 'Notification not found' 
        });
      }

      if (notification.userId.toString() !== req.user.id) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized' 
        });
      }

      await notification.markAsRead();

      const unreadCount = await Notification.countDocuments({
        userId: req.user.id,
        isRead: false
      });

      res.json({ 
        success: true,
        message: 'Notification marked as read',
        data: {
          notification,
          unreadCount
        }
      });

    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
📱 PARENT - Mark All Notifications as Read
=====================================================
*/
router.put(
  '/read-all',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const result = await Notification.markAllAsRead(req.user.id);

      res.json({ 
        success: true,
        message: 'All notifications marked as read',
        data: { modifiedCount: result.modifiedCount }
      });

    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
📱 PARENT - Delete Notification
=====================================================
*/
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const notification = await Notification.findById(req.params.id);

      if (!notification) {
        return res.status(404).json({ 
          success: false,
          message: 'Notification not found' 
        });
      }

      if (notification.userId.toString() !== req.user.id) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized' 
        });
      }

      await notification.deleteOne();

      res.json({ 
        success: true,
        message: 'Notification deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
📱 PARENT - Clear All Notifications
=====================================================
*/
router.delete(
  '/clear/all',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      await Notification.deleteMany({ userId: req.user.id });

      res.json({ 
        success: true,
        message: 'All notifications cleared'
      });

    } catch (error) {
      console.error('Error clearing notifications:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
📱 PARENT - Get Notifications by Type
=====================================================
*/
router.get(
  '/type/:type',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const { type } = req.params;
      const { limit = 20 } = req.query;

      const notifications = await Notification.getByType(req.user.id, type, parseInt(limit));

      res.json({
        success: true,
        count: notifications.length,
        data: notifications
      });

    } catch (error) {
      console.error('Error fetching notifications by type:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
📱 PARENT - Get Recent Notifications (Last 7 days)
=====================================================
*/
router.get(
  '/recent',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const notifications = await Notification.find({
        userId: req.user.id,
        createdAt: { $gte: sevenDaysAgo }
      })
      .sort({ createdAt: -1 })
      .populate('studentId', 'firstName lastName')
      .populate('tripId', 'routeName');

      res.json({
        success: true,
        count: notifications.length,
        data: notifications
      });

    } catch (error) {
      console.error('Error fetching recent notifications:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
👑 ADMIN - Get All Notifications (System-wide)
=====================================================
*/
router.get(
  '/admin/all',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { page, limit, skip } = paginate(req);
      
      const [notifications, total] = await Promise.all([
        Notification.find()
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'firstName lastName email')
          .populate('studentId', 'firstName lastName admissionNumber')
          .populate('tripId', 'routeName vehicleId'),
        Notification.countDocuments()
      ]);

      // Get statistics
      const stats = {
        total: total,
        unread: await Notification.countDocuments({ isRead: false }),
        sentToday: await Notification.countDocuments({
          createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        }),
        smsSent: await Notification.countDocuments({ smsSent: true }),
        byType: await Notification.aggregate([
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ])
      };

      res.json({
        success: true,
        data: notifications,
        stats,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
👑 ADMIN - Send Broadcast Notification to All Parents
=====================================================
*/
router.post(
  '/admin/broadcast',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { title, message, type = 'admin_broadcast', sendSms = false } = req.body;

      if (!title || !message) {
        return res.status(400).json({ 
          success: false,
          message: 'Title and message are required' 
        });
      }

      const User = require('../models/User');
      const parents = await User.find({ role: 'parent', isActive: true });

      let smsResults = { success: 0, failed: 0 };
      const notifications = [];

      for (const parent of parents) {
        const notification = new Notification({
          userId: parent._id,
          userType: 'parent',
          type: type,
          title: title,
          message: message,
          priority: 'high'
        });

        if (sendSms && parent.phone) {
          const smsResult = await smsProvider.sendSMS(parent.phone, message);
          if (smsResult.success) {
            await notification.markSmsSent(smsResult.messageId);
            smsResults.success++;
          } else {
            await notification.markSmsFailed(smsResult.error);
            smsResults.failed++;
          }
        }

        await notification.save();
        notifications.push(notification);
      }

      res.json({
        success: true,
        message: `Broadcast sent to ${parents.length} parents`,
        data: {
          recipients: parents.length,
          smsResults,
          notifications: notifications.slice(0, 10) // Return first 10
        }
      });

    } catch (error) {
      console.error('Error sending broadcast:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
👑 ADMIN - Get SMS Delivery Stats
=====================================================
*/
router.get(
  '/admin/sms-stats',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const stats = {
        totalSmsSent: await Notification.countDocuments({ smsSent: true }),
        totalSmsFailed: await Notification.countDocuments({ 
          smsSent: false, 
          smsError: { $ne: null } 
        }),
        pendingSms: await Notification.countDocuments({ 
          smsSent: false, 
          type: { $in: ['boarding_alert', 'alighting_alert', 'trip_start', 'trip_complete'] }
        }),
        byProvider: await Notification.aggregate([
          { $unwind: '$deliveryStatus' },
          { $match: { 'deliveryStatus.channel': 'sms' } },
          { $group: { _id: '$deliveryStatus.provider', count: { $sum: 1 } } }
        ]),
        byType: await Notification.aggregate([
          { $match: { smsSent: true } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),
        today: await Notification.countDocuments({
          smsSent: true,
          smsSentAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        })
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error fetching SMS stats:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
👑 ADMIN - Retry Failed SMS Notifications
=====================================================
*/
router.post(
  '/admin/retry-sms',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const failedNotifications = await Notification.getFailedSmsNotifications();

      let retried = 0;
      let success = 0;
      let failed = 0;

      for (const notification of failedNotifications) {
        retried++;
        
        if (notification.smsRecipient && notification.smsMessage) {
          const result = await smsProvider.sendSMS(notification.smsRecipient, notification.smsMessage);
          
          if (result.success) {
            await notification.markSmsSent(result.messageId);
            success++;
          } else {
            await notification.markSmsFailed(result.error);
            failed++;
          }
        }
      }

      res.json({
        success: true,
        message: `Retried ${retried} failed SMS notifications`,
        data: {
          retried,
          success,
          failed
        }
      });

    } catch (error) {
      console.error('Error retrying SMS:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
👑 ADMIN - Delete Old Notifications
=====================================================
*/
router.delete(
  '/admin/cleanup',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true
      });

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} old notifications`,
        data: {
          deletedCount: result.deletedCount,
          olderThanDays: parseInt(days)
        }
      });

    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

/*
=====================================================
🔧 TEST - Send Test SMS (Development only)
=====================================================
*/
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/test-sms',
    authMiddleware,
    async (req, res) => {
      try {
        const { phone, message } = req.body;

        if (!phone || !message) {
          return res.status(400).json({ 
            success: false,
            message: 'Phone and message are required' 
          });
        }

        const result = await smsProvider.sendSMS(phone, message);

        res.json({
          success: result.success,
          data: result,
          message: result.success ? 'Test SMS sent successfully' : 'Test SMS failed'
        });

      } catch (error) {
        console.error('Error sending test SMS:', error);
        res.status(500).json({ 
          success: false,
          error: error.message 
        });
      }
    }
  );
}

module.exports = router;