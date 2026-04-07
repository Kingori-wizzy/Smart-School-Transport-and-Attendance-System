const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function createAdminOnly() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@demo.com' });
    
    if (existingAdmin) {
      console.log('⚠️ Admin already exists:', existingAdmin.email);
      console.log('✅ You can login with admin@demo.com / password123');
      
      // Optional: Reset password if needed
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.updateOne(
        { email: 'admin@demo.com' },
        { $set: { password: hashedPassword, isActive: true } }
      );
      console.log('🔄 Admin password reset to: password123');
      
    } else {
      // Create new admin
      const admin = {
        email: 'admin@demo.com',
        password: await bcrypt.hash('password123', 10),
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        phone: '+254712345680',
        isActive: true,
        createdAt: new Date()
      };
      
      await User.create(admin);
      console.log('✅ Admin account created successfully!');
      console.log('\n📋 LOGIN CREDENTIALS:');
      console.log('   Email: admin@demo.com');
      console.log('   Password: password123');
      console.log('   Role: Administrator');
    }

    // Verify admin exists
    const admin = await User.findOne({ email: 'admin@demo.com' }).select('+password');
    if (admin) {
      console.log('\n✅ Verification:');
      console.log(`   Admin found: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Has password: ${admin.password ? 'Yes' : 'No'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

createAdminOnly();