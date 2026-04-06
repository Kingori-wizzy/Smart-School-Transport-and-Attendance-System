const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const User = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads', 'profiles');
const ensureUploadDir = async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Error creating upload directory:', error);
  }
};
ensureUploadDir();

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
  limits: { fileSize: 5 * 1024 * 1024 },
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

// Validation rules
const validatePushToken = [
  body('token').notEmpty().withMessage('Token is required')
];

const validateProfile = [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('phone').optional().matches(/^\+?[\d\s-]{10,}$/).withMessage('Valid phone number required')
];

const validatePassword = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// ✅ FIXED: Driver validation with firstName and lastName instead of name
const validateDriver = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().matches(/^\+?[\d\s-]{10,}$/).withMessage('Valid phone number required'),
  body('driverDetails.licenseNumber').optional(),
  body('driverDetails.licenseExpiry').optional().isISO8601().toDate(),
  body('driverDetails.experience').optional().isInt({ min: 0, max: 50 })
];

// All user routes require authentication
router.use(authMiddleware);

// ==================== ADMIN USER MANAGEMENT ENDPOINTS ====================

/**
 * @route   GET /api/users
 * @desc    Get all users with optional role filter
 * @access  Private (Admin only)
 */
router.get('/', isAdmin, async (req, res) => {
  try {
    const { role, page = 1, limit = 50, search } = req.query;
    const query = {};
    
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -pushToken -resetCode -resetCodeExpiry')
        .skip(skip)
        .limit(parseInt(limit))
        .sort('-createdAt'),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get single user by ID
 * @access  Private (Admin only)
 */
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -pushToken -resetCode -resetCodeExpiry');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create new user (driver, parent, admin)
 * @access  Private (Admin only)
 */
router.post('/', isAdmin, validateDriver, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    const user = new User(req.body);
    const newUser = await user.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    logger.info(`✅ New user created: ${newUser.email} (${newUser.role})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'Duplicate field value entered' 
      });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        success: false, 
        message: messages.join(', ') 
      });
    }
    
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (Admin only)
 */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -pushToken -resetCode -resetCodeExpiry');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    logger.info(`✅ User updated: ${user.email}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    logger.info(`✅ User deactivated: ${user.email}`);

    res.json({ 
      success: true, 
      message: 'User deactivated successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Toggle user active status
 * @access  Private (Admin only)
 */
router.patch('/:id/status', isAdmin, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password -pushToken -resetCode -resetCodeExpiry');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ✅ NEW: Reset password endpoint (called from frontend)
/**
 * @route   POST /api/users/:id/reset-password
 * @desc    Send password reset email to user
 * @access  Private (Admin only)
 */
router.post('/:id/reset-password', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetCode;
    user.resetCodeExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();
    
    // Send email with reset code
    if (emailService && emailService.sendResetPasswordEmail) {
      await emailService.sendResetPasswordEmail(user.email, user.firstName, resetCode);
    }
    
    logger.info(`Password reset email sent to ${user.email}`);
    
    res.json({ 
      success: true, 
      message: 'Password reset email sent successfully' 
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PROFILE MANAGEMENT ENDPOINTS (for logged-in user) ====================

/**
 * @route   POST /api/users/push-token
 * @desc    Save push notification token
 * @access  Private
 */
router.post('/push-token', validatePushToken, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { token } = req.body;
    const userId = req.user.id;

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

    logger.info(`✅ Push token saved for user ${userId}`);

    res.json({ 
      success: true, 
      message: 'Push token saved successfully',
      data: updatedUser 
    });
  } catch (error) {
    console.error('❌ Error saving push token:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   DELETE /api/users/push-token
 * @desc    Remove push token (when user logs out)
 * @access  Private
 */
router.delete('/push-token', async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $unset: { pushToken: 1, pushTokenUpdatedAt: 1 }
      },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    logger.info(`✅ Push token removed for user ${userId}`);

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

/**
 * @route   GET /api/users/push-token
 * @desc    Get push token
 * @access  Private
 */
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
      data: {
        pushToken: user.pushToken || null,
        updatedAt: user.pushTokenUpdatedAt || null
      }
    });
  } catch (error) {
    console.error('❌ Error fetching push token:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -pushToken -__v -resetCode -resetCodeExpiry')
      .populate('children', 'firstName lastName name grade classLevel');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const userObj = user.toObject();
    if (userObj.profileImage) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      userObj.profileImageUrl = `${baseUrl}${userObj.profileImage}`;
    }

    res.json({ 
      success: true, 
      data: userObj
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', validateProfile, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { firstName, lastName, phone } = req.body;
    const userId = req.user.id;
    
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -pushToken -__v -resetCode -resetCodeExpiry');

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    logger.info(`✅ Profile updated for user ${userId}`);

    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      data: updatedUser 
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/users/profile/photo
 * @desc    Upload profile photo
 * @access  Private
 */
router.post('/profile/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const userId = req.user.id;
    const oldUser = await User.findById(userId);
    
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: photoUrl },
      { new: true }
    ).select('-password');
    
    if (oldUser && oldUser.profileImage) {
      const oldFilePath = path.join(__dirname, '..', oldUser.profileImage);
      try {
        await fs.unlink(oldFilePath);
      } catch (unlinkError) {
        console.warn('Could not delete old profile image:', unlinkError.message);
      }
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({ 
      success: true, 
      message: 'Profile photo updated successfully',
      data: {
        photoUrl,
        photoUrlFull: `${baseUrl}${photoUrl}`,
        user
      }
    });
  } catch (error) {
    console.error('❌ Error uploading photo:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/users/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', validatePassword, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    
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
    
    logger.info(`✅ Password changed for user ${userId}`);

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

/**
 * @route   DELETE /api/users/account
 * @desc    Delete account (soft delete)
 * @access  Private
 */
router.delete('/account', async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        deletedAt: new Date(),
        pushToken: null,
        email: `deleted_${userId}@deleted.user`,
        phone: null
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    logger.info(`✅ Account soft deleted for user ${userId}`);

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

/**
 * @route   GET /api/users/activity-summary
 * @desc    Get user activity summary
 * @access  Private
 */
router.get('/activity-summary', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .select('lastLogin createdAt pushTokenUpdatedAt isActive')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      data: {
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
        accountActive: user.isActive,
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

/**
 * @route   GET /api/users/verify-account
 * @desc    Verify account ownership
 * @access  Private
 */
router.get('/verify-account', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isActive');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'Account not found or deactivated' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Account is active' 
    });
  } catch (error) {
    console.error('❌ Error verifying account:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;