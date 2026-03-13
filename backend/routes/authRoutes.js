const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, message: 'Too many login attempts, try again later' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: { success: false, message: 'Too many registration attempts' }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: { success: false, message: 'Too many password reset attempts' }
});

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Helper function to send actual emails
const sendEmail = async (to, subject, text) => {
  try {
    console.log(`📧 Sending email to ${to}:`);
    console.log(`   Subject: ${subject}`);
    
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${info.messageId}`);
      return true;
    } else {
      console.log(`   Body: ${text}`);
      console.log('⚠️ Email credentials not configured. Using console log only.');
      return true;
    }
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return false;
  }
};

// Validation rules
const validateEmail = (email) => {
  const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

// 📝 Register a new user
router.post('/register', 
  registerLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
    body('phone').optional().matches(/^\+?[\d\s-]{10,}$/).withMessage('Valid phone number required')
  ],
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

      console.log('📝 Registration attempt:', { 
        email: req.body.email,
        timestamp: new Date().toISOString()
      });

      const { firstName, lastName, email, password, phone, role } = req.body;

      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          success: false,
          message: 'First name and last name are required' 
        });
      }

      // Check if user exists
      const existing = await User.findOne({ email });
      if (existing) {
        console.log('❌ User already exists:', email);
        return res.status(400).json({ 
          success: false,
          message: 'User already exists' 
        });
      }

      // Create new user
      const newUser = new User({ 
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        email, 
        password, 
        phone: phone || '', 
        role: role || 'parent',
        isActive: true
      });
      
      await newUser.save();
      console.log('✅ User registered successfully:', { 
        id: newUser._id, 
        email: newUser.email,
        role: newUser.role 
      });

      // Generate token for immediate login
      const token = jwt.sign(
        { id: newUser._id, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Remove password from response
      const userResponse = newUser.toObject();
      delete userResponse.password;

      res.status(201).json({ 
        success: true,
        message: 'User registered successfully', 
        token,
        user: userResponse
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

// 🔐 Login User
router.post('/login', 
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
  ],
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

      const { email, password } = req.body;
      
      console.log('🔐 Login attempt:', { 
        email, 
        timestamp: new Date().toISOString() 
      });

      // Find user and include password field for comparison
      const user = await User.findOne({ email }).select('+password').lean();

      if (!user) {
        console.log('❌ User not found:', email);
        return res.status(401).json({ 
          success: false,
          message: 'Invalid email or password' 
        });
      }

      // Check if account is active
      if (!user.isActive) {
        console.log('❌ Account deactivated:', email);
        return res.status(403).json({ 
          success: false,
          message: 'Account is deactivated' 
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      console.log('🔑 Password match:', isMatch);

      if (!isMatch) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid email or password' 
        });
      }

      // Generate token
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      console.log('✅ Login successful for:', email);

      // Remove password from response
      delete user.password;

      // Update last login in the background
      User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(err => 
        console.log('⚠️ Failed to update last login:', err.message)
      );

      res.json({ 
        success: true,
        message: 'Login successful', 
        token, 
        user 
      });
    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

// 🔑 Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    console.log('🔑 Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', { id: decoded.id, role: decoded.role });

    const user = await User.findById(decoded.id).lean();

    if (!user) {
      console.log('❌ User not found for token');
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    console.log('✅ Token valid for user:', user.email);
    
    // Remove sensitive data
    delete user.password;

    res.json({ 
      success: true,
      valid: true, 
      user 
    });
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        valid: false, 
        message: 'Token expired' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      valid: false, 
      message: 'Invalid token' 
    });
  }
});

// 🚪 Logout
router.post('/logout', (req, res) => {
  console.log('🚪 Logout request received');
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
});

// ============================================
// FORGOT PASSWORD ENDPOINTS
// ============================================

// 📧 Send reset code
router.post('/forgot-password', 
  forgotPasswordLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required')
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

      const { email } = req.body;

      const user = await User.findOne({ email });
      
      // For security, don't reveal if user exists or not
      if (!user) {
        console.log(`❌ Forgot password attempt for non-existent email: ${email}`);
        return res.json({ 
          success: true, 
          message: 'If your email exists in our system, you will receive a verification code.' 
        });
      }

      // Generate 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      user.resetCode = resetCode;
      user.resetCodeExpiry = resetCodeExpiry;
      await user.save();

      // Send email with code
      await sendEmail(
        email,
        'Password Reset Code',
        `Your password reset code is: ${resetCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.`
      );

      console.log(`✅ Reset code ${resetCode} sent to ${email}`);
      
      res.json({ 
        success: true, 
        message: 'If your email exists in our system, you will receive a verification code.' 
      });
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  }
);

// ✅ Verify reset code
router.post('/verify-reset-code', 
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }).isNumeric()
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

      const { email, code } = req.body;

      const user = await User.findOne({ 
        email,
        resetCode: code,
        resetCodeExpiry: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired verification code' 
        });
      }

      res.json({ 
        success: true, 
        message: 'Code verified successfully' 
      });
    } catch (error) {
      console.error('❌ Verify reset code error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  }
);

// 🔐 Reset password
router.post('/reset-password', 
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }).isNumeric(),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

      const { email, code, newPassword } = req.body;

      const user = await User.findOne({ 
        email,
        resetCode: code,
        resetCodeExpiry: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired verification code' 
        });
      }

      // Update password and clear reset fields
      user.password = newPassword;
      user.resetCode = null;
      user.resetCodeExpiry = null;
      await user.save();

      console.log(`✅ Password reset successful for ${email}`);

      // Send confirmation email
      await sendEmail(
        email,
        'Password Reset Successful',
        'Your password has been successfully reset. If you did not perform this action, please contact support immediately.'
      );

      res.json({ 
        success: true, 
        message: 'Password reset successfully. You can now login with your new password.' 
      });
    } catch (error) {
      console.error('❌ Reset password error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  }
);

module.exports = router;