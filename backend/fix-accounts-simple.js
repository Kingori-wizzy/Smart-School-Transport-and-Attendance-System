const mongoose = require('mongoose');
const User = require('./models/User');

const uri = 'mongodb+srv://smartschool_system:364VTPjose@cluster0.4u783we.mongodb.net/smartSchoolDB?retryWrites=true&w=majority';

console.log('Connecting to MongoDB...');

mongoose.connect(uri).then(async () => {
  console.log('✅ Connected to MongoDB\n');
  
  // Check all users
  const allUsers = await User.find().select('email role isActive');
  console.log('CURRENT USERS:');
  console.log('==============');
  
  if (allUsers.length === 0) {
    console.log('No users found');
  } else {
    for(let i = 0; i < allUsers.length; i++) {
      const u = allUsers[i];
      console.log((i+1) + '. ' + u.email + ' (' + u.role + ')');
      console.log('   Active: ' + (u.isActive ? 'YES' : 'NO'));
    }
  }
  
  console.log('\nFIXING ADMIN...');
  console.log('===============');
  
  // Update admin directly
  const adminResult = await User.updateOne(
    { email: 'admin@demo.com' },
    { isActive: true }
  );
  
  if (adminResult.matchedCount > 0) {
    console.log('✅ Admin found and ' + (adminResult.modifiedCount > 0 ? 'activated' : 'already active'));
  } else {
    console.log('❌ Admin not found - creating new one');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const newAdmin = new User({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+254700000000',
      isActive: true
    });
    
    await newAdmin.save();
    console.log('✅ New admin created');
  }
  
  console.log('\nFIXING PARENT...');
  console.log('================');
  
  const parentResult = await User.updateOne(
    { email: 'parent@demo.com' },
    { isActive: true }
  );
  
  if (parentResult.matchedCount > 0) {
    console.log('✅ Parent found and ' + (parentResult.modifiedCount > 0 ? 'activated' : 'already active'));
  } else {
    console.log('❌ Parent not found - creating new one');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const newParent = new User({
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
    
    await newParent.save();
    console.log('✅ New parent created');
  }
  
  console.log('\nFIXING DRIVER...');
  console.log('================');
  
  const driverResult = await User.updateOne(
    { email: 'driver@demo.com' },
    { isActive: true }
  );
  
  if (driverResult.matchedCount > 0) {
    console.log('✅ Driver found and ' + (driverResult.modifiedCount > 0 ? 'activated' : 'already active'));
  } else {
    console.log('❌ Driver not found - creating new one');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const newDriver = new User({
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
    
    await newDriver.save();
    console.log('✅ New driver created');
  }
  
  console.log('\n✅ FIX COMPLETE!');
  console.log('You can now login with:');
  console.log('Admin:  admin@demo.com / password123');
  console.log('Parent: parent@demo.com / password123');
  console.log('Driver: driver@demo.com / password123');
  
  process.exit();
  
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
