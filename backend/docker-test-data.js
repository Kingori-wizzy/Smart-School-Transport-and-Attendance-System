// docker-test-data.js - Standalone test data creator
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

const client = new MongoClient(uri);

async function createTestData() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    console.log('📁 Database:', db.databaseName);
    
    // 1. Create test students
    const students = [
      { 
        studentId: 'STU1001',
        name: 'John Doe', 
        class: 'Grade 5', 
        parentName: 'Jane Doe', 
        parentPhone: '+254700000001',
        createdAt: new Date()
      },
      { 
        studentId: 'STU1002',
        name: 'Jane Smith', 
        class: 'Grade 6', 
        parentName: 'John Smith', 
        parentPhone: '+254700000002',
        createdAt: new Date()
      },
      { 
        studentId: 'STU1003',
        name: 'Bob Johnson', 
        class: 'Grade 5', 
        parentName: 'Mary Johnson', 
        parentPhone: '+254700000003',
        createdAt: new Date()
      },
      { 
        studentId: 'STU1004',
        name: 'Alice Brown', 
        class: 'Grade 7', 
        parentName: 'Tom Brown', 
        parentPhone: '+254700000004',
        createdAt: new Date()
      },
      { 
        studentId: 'STU1005',
        name: 'Charlie Wilson', 
        class: 'Grade 6', 
        parentName: 'Sarah Wilson', 
        parentPhone: '+254700000005',
        createdAt: new Date()
      }
    ];
    
    // Clear existing students
    await db.collection('students').deleteMany({});
    const studentResult = await db.collection('students').insertMany(students);
    console.log(`✅ Created ${studentResult.insertedCount} students`);
    
    // 2. Create test buses
    const buses = [
      {
        busNumber: 'BUS001',
        driverName: 'James Driver',
        capacity: 40,
        route: 'Route A - North',
        status: 'active',
        currentLocation: {
          lat: -1.2864,
          lng: 36.8172,
          speed: 35,
          timestamp: new Date()
        },
        lastUpdate: new Date()
      },
      {
        busNumber: 'BUS002',
        driverName: 'Peter Driver',
        capacity: 35,
        route: 'Route B - East',
        status: 'active',
        currentLocation: {
          lat: -1.2964,
          lng: 36.8272,
          speed: 42,
          timestamp: new Date()
        },
        lastUpdate: new Date()
      },
      {
        busNumber: 'BUS003',
        driverName: 'John Driver',
        capacity: 45,
        route: 'Route C - South',
        status: 'active',
        currentLocation: {
          lat: -1.2764,
          lng: 36.8072,
          speed: 28,
          timestamp: new Date()
        },
        lastUpdate: new Date()
      }
    ];
    
    // Clear existing buses
    await db.collection('buses').deleteMany({});
    const busResult = await db.collection('buses').insertMany(buses);
    console.log(`✅ Created ${busResult.insertedCount} buses`);
    
    // 3. Create test admin user if not exists
    const adminExists = await db.collection('users').findOne({ email: 'admin@school.com' });
    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.collection('users').insertOne({
        name: 'Admin User',
        email: 'admin@school.com',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date()
      });
      console.log('✅ Created admin user (admin@school.com / admin123)');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    // 4. Create some sample attendance records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendanceRecords = [];
    for (let i = 1; i <= 5; i++) {
      attendanceRecords.push({
        studentId: `STU100${i}`,
        studentName: students[i-1].name,
        busId: `BUS00${Math.ceil(i/2)}`,
        type: 'boarding',
        timestamp: new Date(today.getTime() + 7 * 60 * 60 * 1000 + i * 60000), // 7am + i minutes
        date: today
      });
      
      attendanceRecords.push({
        studentId: `STU100${i}`,
        studentName: students[i-1].name,
        busId: `BUS00${Math.ceil(i/2)}`,
        type: 'alighting',
        timestamp: new Date(today.getTime() + 16 * 60 * 60 * 1000 + i * 60000), // 4pm + i minutes
        date: today
      });
    }
    
    await db.collection('attendances').deleteMany({ date: today });
    const attendanceResult = await db.collection('attendances').insertMany(attendanceRecords);
    console.log(`✅ Created ${attendanceResult.insertedCount} attendance records`);
    
    // Summary
    console.log('\n📊 DATABASE SUMMARY:');
    console.log(`   Students: ${await db.collection('students').countDocuments()}`);
    console.log(`   Buses: ${await db.collection('buses').countDocuments()}`);
    console.log(`   Users: ${await db.collection('users').countDocuments()}`);
    console.log(`   Attendance: ${await db.collection('attendances').countDocuments()}`);
    
    console.log('\n🎉 Test data created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    process.exit();
  }
}

createTestData();