const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const User = require('../models/User');  // ✅ Only need this once

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

// ==================== DRIVER CREATION VALIDATION ====================
const validateDriver = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().matches(/^\+?[\d\s-]{10,}$/).withMessage('Valid phone number required'),
  body('driverDetails.licenseNumber').optional().notEmpty(),
  body('driverDetails.licenseExpiry').optional().isISO8601().toDate()
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
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
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
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }

    // Create user
    const user = new User(req.body);
    const newUser = await user.save();

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    console.log(`✅ New user created: ${newUser.email} (${newUser.role})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
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
    // Don't allow password update through this endpoint
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

    console.log(`✅ User updated: ${user.email}`);

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

    console.log(`✅ User deactivated: ${user.email}`);

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

// ==================== PROFILE MANAGEMENT ENDPOINTS (for logged-in user) ====================

// 📱 Save push notification token
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

    console.log(`✅ Push token saved for user ${userId}`);

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

// 🗑️ Remove push token (when user logs out)
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

// ✏️ Update user profile
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
    if (firstName && lastName) updateData.name = `${firstName} ${lastName}`.trim();
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

    console.log(`✅ Profile updated for user ${userId}`);

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

// 📸 Upload profile photo
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
    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    
    // Update user with new profile image
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: photoUrl },
      { new: true }
    ).select('-password');
    
    // Optionally delete old photo file
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

// 🔐 Change password
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

// 🗑️ Delete account (soft delete)
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

    console.log(`✅ Account soft deleted for user ${userId}`);

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

// ✅ Verify account ownership
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