const mongoose = require('mongoose');
const User = require('./models/User');

// Use MONGODB_URI from your .env
const uri = 'mongodb+srv://smartschool_system:364VTPjose@cluster0.4u783we.mongodb.net/smartSchoolDB?retryWrites=true&w=majority';

console.log('🔌 Connecting to MongoDB...');

mongoose.connect(uri).then(async () => {
  console.log('✅ Connected to MongoDB\n');
  
  // First, let's see ALL users
  const allUsers = await User.find().select('email role isActive');
  console.log('📋 CURRENT USERS IN DATABASE:');
  console.log('=================================');
  
  if (allUsers.length === 0) {
    console.log('❌ No users found! Database might be empty.');
  } else {
    allUsers.forEach((u, index) => {
      console.log(${index + 1}.  ());
      console.log(   Active: );
    });
  }
  
  console.log('\n🔧 FIXING ADMIN ACCOUNT...');
  console.log('=================================');
  
  // Check if admin exists
  let admin = await User.findOne({ email: 'admin@demo.com' });
  
  if (admin) {
    console.log('📧 Admin found:', admin.email);
    console.log('   Current status:', admin.isActive ? 'Active' : 'Inactive');
    
    // Activate admin
    admin.isActive = true;
    await admin.save();
    console.log('✅ Admin account ACTIVATED!');
  } else {
    console.log('❌ Admin not found. Creating new admin...');
    
    // Create admin if doesn't exist
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    admin = new User({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+254700000000',
      isActive: true
    });
    
    await admin.save();
    console.log('✅ New admin account CREATED and ACTIVATED!');
  }
  
  // Now check parent account
  console.log('\n🔧 CHECKING PARENT ACCOUNT...');
  console.log('=================================');
  
  let parent = await User.findOne({ email: 'parent@demo.com' });
  
  if (parent) {
    console.log('📧 Parent found:', parent.email);
    console.log('   Current status:', parent.isActive ? 'Active' : 'Inactive');
    
    if (!parent.isActive) {
      parent.isActive = true;
      await parent.save();
      console.log('✅ Parent account ACTIVATED!');
    } else {
      console.log('✅ Parent already active');
    }
  } else {
    console.log('❌ Parent not found. Creating new parent...');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    parent = new User({
      name: 'Parent User',
      email: 'parent@demo.com',
      password: hashedPassword,
      role: 'parent',
      phone: '+254711111111',
      isActive: true,
      parentDetails: {
        emergencyContact: '+254722222222',
        notificationPreferences: {
          sms: true,
          push: true,
          email: true
        }
      }
    });
    
    await parent.save();
    console.log('✅ New parent account CREATED and ACTIVATED!');
  }
  
  // Check driver account
  console.log('\n🔧 CHECKING DRIVER ACCOUNT...');
  console.log('=================================');
  
  let driver = await User.findOne({ email: 'driver@demo.com' });
  
  if (driver) {
    console.log('📧 Driver found:', driver.email);
    console.log('   Current status:', driver.isActive ? 'Active' : 'Inactive');
    
    if (!driver.isActive) {
      driver.isActive = true;
      await driver.save();
      console.log('✅ Driver account ACTIVATED!');
    } else {
      console.log('✅ Driver already active');
    }
  } else {
    console.log('❌ Driver not found. Creating new driver...');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    driver = new User({
      name: 'Driver User',
      email: 'driver@demo.com',
      password: hashedPassword,
      role: 'driver',
      phone: '+254733333333',
      isActive: true,
      driverDetails: {
        licenseNumber: 'DL123456',
        licenseExpiry: new Date('2026-12-31'),
        experience: 5
      }
    });
    
    await driver.save();
    console.log('✅ New driver account CREATED and ACTIVATED!');
  }
  
  console.log('\n✅ FIX COMPLETE!');
  console.log('=================================');
  console.log('You can now login with:');
  console.log('📧 Admin:  admin@demo.com / password123');
  console.log('📧 Parent: parent@demo.com / password123');
  console.log('📧 Driver: driver@demo.com / password123');
  
  process.exit();
  
}).catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1);
});
