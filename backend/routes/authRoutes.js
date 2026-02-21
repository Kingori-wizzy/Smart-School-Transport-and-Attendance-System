const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 📝 Register a new user (Admin or Parent)
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Registration attempt:', { 
      body: req.body,
      timestamp: new Date().toISOString()
    });

    // Accept both formats (name or firstName/lastName)
    const { name, firstName, lastName, email, password, phone, role } = req.body;

    // Handle name splitting if full name is provided
    let userFirstName = firstName;
    let userLastName = lastName;

    if (name && !firstName && !lastName) {
      // Split the full name into first and last
      const nameParts = name.trim().split(' ');
      userFirstName = nameParts[0] || '';
      userLastName = nameParts.slice(1).join(' ') || '';
    }

    // Validate required fields
    if (!userFirstName || !userLastName) {
      console.log('❌ Missing name fields:', { userFirstName, userLastName });
      return res.status(400).json({ 
        message: 'First name and last name are required' 
      });
    }

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('❌ User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user with all fields
    const newUser = new User({ 
      firstName: userFirstName,
      lastName: userLastName,
      email, 
      password, 
      phone: phone || '', 
      role: role || 'parent' 
    });
    
    await newUser.save();
    console.log('✅ User registered successfully:', { 
      id: newUser._id, 
      email: newUser.email,
      role: newUser.role 
    });

    // Generate token for immediate login (optional)
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      message: 'User registered successfully', 
      token,
      user: newUser 
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔐 Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', { 
      email, 
      timestamp: new Date().toISOString() 
    });

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user and include password field for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('✅ User found:', { 
      id: user._id, 
      email: user.email,
      role: user.role,
      hasPassword: !!user.password 
    });

    // Check if account is active
    if (!user.isActive) {
      console.log('❌ Account deactivated:', email);
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for:', email);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      message: 'Login successful', 
      token, 
      user: userResponse 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔑 Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('🔑 Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', { id: decoded.id, role: decoded.role });

    const user = await User.findById(decoded.id);

    if (!user) {
      console.log('❌ User not found for token');
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('✅ Token valid for user:', user.email);
    res.json({ valid: true, user });
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    res.status(401).json({ valid: false, message: 'Invalid token' });
  }
});

// 🚪 Logout (optional - client-side mainly)
router.post('/logout', (req, res) => {
  console.log('🚪 Logout request received');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;