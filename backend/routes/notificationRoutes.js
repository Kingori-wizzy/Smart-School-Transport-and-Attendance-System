const express = require('express');
const router = express.Router();

const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const paginate = require('../utils/pagination');

/*
=====================================================
👨‍👩‍👧 PARENT - Get My Notifications (Paginated)
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
        Notification.find({ parentId: req.user.id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('studentId', 'firstName lastName')
          .populate('tripId'),
        Notification.countDocuments({ parentId: req.user.id })
      ]);

      // Mark unread count
      const unreadCount = await Notification.countDocuments({
        parentId: req.user.id,
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
👨‍👩‍👧 PARENT - Get Unread Count
=====================================================
*/
router.get(
  '/unread/count',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const count = await Notification.countDocuments({
        parentId: req.user.id,
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
👨‍👩‍👧 PARENT - Mark Notification as Read
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

      if (notification.parentId.toString() !== req.user.id) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized' 
        });
      }

      notification.isRead = true;
      await notification.save();

      // Get updated unread count
      const unreadCount = await Notification.countDocuments({
        parentId: req.user.id,
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
👨‍👩‍👧 PARENT - Mark All as Read
=====================================================
*/
router.put(
  '/read-all',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      await Notification.updateMany(
        { 
          parentId: req.user.id,
          isRead: false 
        },
        { 
          isRead: true,
          readAt: new Date()
        }
      );

      res.json({ 
        success: true,
        message: 'All notifications marked as read'
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
👨‍👩‍👧 PARENT - Delete Notification
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

      if (notification.parentId.toString() !== req.user.id) {
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
👨‍👩‍👧 PARENT - Clear All Notifications
=====================================================
*/
router.delete(
  '/clear/all',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      await Notification.deleteMany({ parentId: req.user.id });

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

module.exports = router;