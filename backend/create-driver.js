const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

async function createDriver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete old driver if exists
    await User.deleteOne({ email: 'driver@test.com' });
    
    // Create new driver
    const hashed = await bcrypt.hash('driver123', 10);
    const driver = await User.create({
      firstName: 'Test',
      lastName: 'Driver',
      email: 'driver@test.com',
      password: hashed,
      role: 'driver',
      phone: '0712345678',
      isActive: true
    });

    console.log('✅ Driver created successfully!');
    console.log('📧 Email: driver@test.com');
    console.log('🔑 Password: driver123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

createDriver();