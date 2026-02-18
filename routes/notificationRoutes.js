const express = require('express');
const router = express.Router();

const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');


/*
=====================================================
👨‍👩‍👧 PARENT - Get My Notifications
=====================================================
*/
router.get(
  '/',
  authMiddleware,
  roleMiddleware('parent'),
  async (req, res) => {
    try {
      const notifications = await Notification.find({
        parentId: req.user.id
      })
        .sort({ createdAt: -1 })
        .populate('studentId', 'firstName lastName')
        .populate('tripId');

      res.json(notifications);

    } catch (error) {
      res.status(500).json({ error: error.message });
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
        return res.status(404).json({ message: 'Notification not found' });
      }

      if (notification.parentId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      notification.isRead = true;
      await notification.save();

      res.json({ message: 'Notification marked as read' });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
