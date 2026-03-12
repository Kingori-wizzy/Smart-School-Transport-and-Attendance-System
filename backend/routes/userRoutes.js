const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.user.id}_${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// All user routes require authentication
router.use(authMiddleware);

// 📱 Save push notification token
router.post('/push-token', async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { 
        pushToken: token,
        pushTokenUpdatedAt: new Date()
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log(`✅ Push token saved for user ${userId}: ${token}`);

    res.json({ 
      success: true, 
      message: 'Push token saved successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('❌ Error saving push token:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 🗑️ Remove push token (when user logs out)
router.delete('/push-token', async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        pushToken: null,
        pushTokenUpdatedAt: null 
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log(`✅ Push token removed for user ${userId}`);

    res.json({ 
      success: true, 
      message: 'Push token removed successfully' 
    });
  } catch (error) {
    console.error('❌ Error removing push token:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 📱 Get push token
router.get('/push-token', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('pushToken pushTokenUpdatedAt');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      pushToken: user.pushToken || null,
      updatedAt: user.pushTokenUpdatedAt || null
    });
  } catch (error) {
    console.error('❌ Error fetching push token:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 👤 Get user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -pushToken -__v -resetCode -resetCodeExpiry')
      .populate('children', 'name grade classLevel photo');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Add full URL to profile image if exists
    const userObj = user.toObject();
    if (userObj.profileImage) {
      // You might want to add base URL here
      userObj.profileImageUrl = userObj.profileImage;
    }

    res.json({ 
      success: true, 
      user: userObj
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ✏️ Update user profile
router.put('/profile', async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const userId = req.user.id;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        firstName, 
        lastName, 
        phone,
        name: `${firstName} ${lastName}`.trim()
      },
      { new: true, runValidators: true }
    ).select('-password -pushToken -__v -resetCode -resetCodeExpiry');

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log(`✅ Profile updated for user ${userId}`);

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 📸 Upload profile photo - FIXED with better error handling
router.post('/profile/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const userId = req.user.id;
    
    // Get the old user to delete previous photo if needed
    const oldUser = await User.findById(userId);
    
    // Construct the photo URL
    const photoUrl = `/uploads/${req.file.filename}`;
    
    // Update user with new profile image
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: photoUrl },
      { new: true }
    ).select('-password');
    
    // Optionally delete old photo file
    if (oldUser && oldUser.profileImage) {
      const oldFilePath = path.join(__dirname, '..', oldUser.profileImage);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Profile photo updated successfully',
      photoUrl,
      user 
    });
  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// 🔐 Change password
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 6 characters long' 
      });
    }
    
    const user = await User.findById(userId).select('+password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    console.log(`✅ Password changed for user ${userId}`);

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// 🗑️ Delete account
router.delete('/account', async (req, res) => {
  try {
    const userId = req.user.id;

    const deletedUser = await User.findByIdAndDelete(userId);
    
    if (!deletedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log(`✅ Account deleted for user ${userId}`);

    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting account:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ✅ Get user activity summary
router.get('/activity-summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('lastLogin createdAt pushTokenUpdatedAt')
      .lean();

    res.json({
      success: true,
      data: {
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
        pushTokenRegistered: !!user.pushTokenUpdatedAt,
        pushTokenLastUpdated: user.pushTokenUpdatedAt
      }
    });
  } catch (error) {
    console.error('❌ Error fetching activity summary:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Serve uploaded files statically (add this to your server.js)
// app.use('/uploads', express.static('uploads'));

module.exports = router;