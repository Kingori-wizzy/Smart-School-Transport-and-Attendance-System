const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('../middleware/authMiddleware');

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many login attempts, try again later' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many registration attempts' }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many password reset attempts' }
});

// Configure email transporter
let transporter;

const initTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email credentials not configured. Email sending disabled.');
    return null;
  }
  
  const transport = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    },
    debug: true,
    logger: true
  });
  
  transport.verify((error, success) => {
    if (error) {
      console.error('Email transporter error:', error.message);
    } else {
      console.log('Email service ready to send messages');
    }
  });
  
  return transport;
};

// Helper function to send emails
const sendEmail = async (to, subject, text, html = null) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email credentials not configured. Email would be sent but credentials missing.');
      console.log(`Email would be sent to: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Body: ${text}`);
      return true;
    }
    
    const transporterInstance = transporter || initTransporter();
    if (!transporterInstance) {
      console.error('Email transporter not initialized');
      return false;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    };

    const info = await transporterInstance.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Email sending error:', error.message);
    return false;
  }
};

// Generate HTML email template for reset code
const generateResetEmailHTML = (userName, resetCode) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">Password Reset</h1>
      </div>
      <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 18px;">Dear ${userName},</p>
        <p>We received a request to reset your password for your Smart School account.</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 14px; margin: 0;">Your verification code is:</p>
          <h1 style="font-size: 36px; letter-spacing: 5px; margin: 10px 0; color: #2196F3;">${resetCode}</h1>
          <p style="font-size: 12px; margin: 0;">This code expires in 15 minutes</p>
        </div>
        <p>If you did not request this password reset, please ignore this email.</p>
        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Smart School Transport System</p>
      </div>
    </div>
  `;
};

// ==================== GET CURRENT USER ====================

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -pushToken -resetCode -resetCodeExpiry -__v')
      .populate({
        path: 'children',
        select: 'firstName lastName name classLevel admissionNumber photo transportDetails'
      });

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
    console.error('Error fetching current user:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== REGISTER ====================

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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      console.log('Registration attempt:', { 
        email: req.body.email,
        timestamp: new Date().toISOString()
      });

      const { firstName, lastName, email, password, phone, role } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ 
          success: false,
          message: 'First name and last name are required' 
        });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        console.log('User already exists:', email);
        return res.status(400).json({ 
          success: false,
          message: 'User already exists' 
        });
      }

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
      console.log('User registered successfully:', { 
        id: newUser._id, 
        email: newUser.email,
        role: newUser.role 
      });

      const token = jwt.sign(
        { id: newUser._id, role: newUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const userResponse = newUser.toObject();
      delete userResponse.password;

      res.status(201).json({ 
        success: true,
        message: 'User registered successfully', 
        token,
        user: userResponse
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

// ==================== LOGIN WITH SPECIFIC ERROR MESSAGES ====================

router.post('/login', 
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required')
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

      const { email, password } = req.body;
      
      console.log('Login attempt:', { 
        email, 
        timestamp: new Date().toISOString() 
      });

      // Find user by email
      const user = await User.findOne({ email }).select('+password');

      // Check if user exists
      if (!user) {
        console.log('User not found:', email);
        return res.status(401).json({ 
          success: false,
          message: 'Invalid email or password' 
        });
      }

      // Check if account is active
      if (!user.isActive) {
        console.log('Account deactivated:', email);
        return res.status(403).json({ 
          success: false,
          message: 'Account is deactivated. Please contact administrator.' 
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match result:', isMatch);

      if (!isMatch) {
        console.log('Password mismatch for:', email);
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

      console.log('Login successful for:', email);

      // Prepare user response
      const userResponse = user.toObject();
      delete userResponse.password;
      delete userResponse.resetCode;
      delete userResponse.resetCodeExpiry;

      // Update last login time (async, don't wait)
      User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).catch(err => 
        console.log('Failed to update last login:', err.message)
      );

      res.json({ 
        success: true,
        message: 'Login successful', 
        token, 
        user: userResponse
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error. Please try again later.' 
      });
    }
  }
);

// ==================== VERIFY TOKEN ====================

router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('No token provided');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    console.log('Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded:', { id: decoded.id, role: decoded.role });

    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('User not found for token');
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

    console.log('Token valid for user:', user.email);
    
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      success: true,
      valid: true, 
      user: userResponse
    });
  } catch (error) {
    console.error('Token verification failed:', error.message);
    
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

// ==================== LOGOUT ====================

router.post('/logout', (req, res) => {
  console.log('Logout request received');
  res.json({ 
    success: true,
    message: 'Logged out successfully' 
  });
});

// ==================== FORGOT PASSWORD ====================

// Send reset code
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
      
      if (!user) {
        console.log(`Forgot password attempt for non-existent email: ${email}`);
        return res.json({ 
          success: true, 
          message: 'If your email exists in our system, you will receive a verification code.' 
        });
      }

      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      const resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);

      user.resetCode = resetCode;
      user.resetCodeExpiry = resetCodeExpiry;
      await user.save();

      console.log(`Reset code for ${email}: ${resetCode}`);

      const emailSent = await sendEmail(
        email,
        'Smart School - Password Reset Code',
        `Your password reset code is: ${resetCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.`,
        generateResetEmailHTML(user.firstName || 'User', resetCode)
      );

      if (emailSent) {
        console.log(`Reset code sent to ${email}`);
        res.json({ 
          success: true, 
          message: 'Verification code sent to your email.',
          ...(process.env.NODE_ENV === 'development' && { debugCode: resetCode })
        });
      } else {
        console.error(`Failed to send reset code to ${email}`);
        res.json({ 
          success: true, 
          message: 'If your email exists in our system, you will receive a verification code.',
          emailError: true
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  }
);

// Verify reset code
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
      console.error('Verify reset code error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  }
);

// Reset password
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

      user.password = newPassword;
      user.resetCode = null;
      user.resetCodeExpiry = null;
      await user.save();

      console.log(`Password reset successful for ${email}`);

      await sendEmail(
        email,
        'Smart School - Password Reset Successful',
        'Your password has been successfully reset. You can now login with your new password.\n\nIf you did not perform this action, please contact support immediately.',
        '<div style="font-family: Arial, sans-serif; padding: 20px;"><h2>Password Reset Successful</h2><p>Your password has been successfully reset. You can now login with your new password.</p><hr><p style="color: #666;">Smart School Transport System</p></div>'
      );

      res.json({ 
        success: true, 
        message: 'Password reset successfully. You can now login with your new password.' 
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Server error' 
      });
    }
  }
);

module.exports = router;