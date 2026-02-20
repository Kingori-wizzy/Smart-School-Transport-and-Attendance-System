const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import your models (adjust paths as needed)
const User = require('./models/User');
const Student = require('./models/Student');
const Bus = require('./models/Bus');

const createTestData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create test admin if not exists
    let admin = await User.findOne({ email: 'admin@school.com' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@school.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('✅ Test admin created');
    }

    // 2. Create test students
    const students = [
      { name: 'John Doe', class: 'Grade 5', parentName: 'Jane Doe', parentPhone: '+254700000001' },
      { name: 'Jane Smith', class: 'Grade 6', parentName: 'John Smith', parentPhone: '+254700000002' },
      { name: 'Bob Johnson', class: 'Grade 5', parentName: 'Mary Johnson', parentPhone: '+254700000003' },
      { name: 'Alice Brown', class: 'Grade 7', parentName: 'Tom Brown', parentPhone: '+254700000004' },
      { name: 'Charlie Wilson', class: 'Grade 6', parentName: 'Sarah Wilson', parentPhone: '+254700000005' }
    ];

    for (const studentData of students) {
      const existing = await Student.findOne({ name: studentData.name });
      if (!existing) {
        await Student.create({
          ...studentData,
          studentId: `STU${Math.floor(1000 + Math.random() * 9000)}`
        });
        console.log(`✅ Test student created: ${studentData.name}`);
      }
    }

    // 3. Create test buses
    const buses = [
      { busNumber: 'BUS001', driverName: 'James Driver', capacity: 40, route: 'Route A' },
      { busNumber: 'BUS002', driverName: 'Peter Driver', capacity: 35, route: 'Route B' },
      { busNumber: 'BUS003', driverName: 'John Driver', capacity: 45, route: 'Route C' }
    ];

    for (const busData of buses) {
      const existing = await Bus.findOne({ busNumber: busData.busNumber });
      if (!existing) {
        await Bus.create({
          ...busData,
          status: 'active',
          currentLocation: {
            lat: -1.2864 + (Math.random() * 0.1),
            lng: 36.8172 + (Math.random() * 0.1)
          }
        });
        console.log(`✅ Test bus created: ${busData.busNumber}`);
      }
    }

    // 4. Simulate some GPS updates
    const activeBuses = await Bus.find({ status: 'active' });
    for (const bus of activeBuses) {
      // Update location every 5 seconds (we'll just set initial location)
      bus.currentLocation = {
        lat: -1.2864 + (Math.random() * 0.2),
        lng: 36.8172 + (Math.random() * 0.2),
        speed: Math.floor(20 + Math.random() * 40),
        timestamp: new Date()
      };
      await bus.save();
      console.log(`📍 Location updated for bus ${bus.busNumber}`);
    }

    console.log('\n🎉 TEST DATA CREATION COMPLETE!');
    console.log('📊 Summary:');
    console.log(`   Users: ${await User.countDocuments()}`);
    console.log(`   Students: ${await Student.countDocuments()}`);
    console.log(`   Buses: ${await Bus.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
};

createTestData();