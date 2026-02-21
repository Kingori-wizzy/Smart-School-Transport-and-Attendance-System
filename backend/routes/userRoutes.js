const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');

// All user routes require authentication
router.use(authMiddleware);

// 📱 Save push notification token
router.post('/push-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    await User.findByIdAndUpdate(req.user.id, {
      pushToken: token,
      pushTokenUpdatedAt: new Date()
    });

    res.json({ 
      success: true, 
      message: 'Push token saved successfully' 
    });
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🗑️ Remove push token (when user logs out)
router.delete('/push-token', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      pushToken: null,
      pushTokenUpdatedAt: null
    });

    res.json({ 
      success: true, 
      message: 'Push token removed successfully' 
    });
  } catch (error) {
    console.error('Error removing push token:', error);
    res.status(500).json({ message: error.message });
  }
});

// 👤 Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -pushToken');
    res.json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✏️ Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, phone },
      { new: true, runValidators: true }
    ).select('-password -pushToken');

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔐 Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🗑️ Delete account
router.delete('/account', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;