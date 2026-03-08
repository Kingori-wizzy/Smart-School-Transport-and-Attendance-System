// docker-test-data.js - Updated to match your schema
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/smartSchoolDB';

const client = new MongoClient(uri);

async function createTestData() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    console.log('📁 Database:', db.databaseName);
    
    // Clear existing data
    await db.collection('students').deleteMany({});
    await db.collection('buses').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('attendances').deleteMany({});
    await db.collection('trips').deleteMany({});
    await db.collection('routes').deleteMany({});

    // 1. Create Users (Admin, Driver, Parent)
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      {
        name: 'Admin User',
        email: 'admin@demo.com',
        password: hashedPassword,
        role: 'admin',
        phone: '+254700000001',
        createdAt: new Date()
      },
      {
        name: 'Demo Driver',
        email: 'driver@demo.com',
        password: hashedPassword,
        role: 'driver',
        phone: '+254700000002',
        licenseNumber: 'DRV-001',
        createdAt: new Date()
      },
      {
        name: 'Demo Parent',
        email: 'parent@demo.com',
        password: hashedPassword,
        role: 'parent',
        phone: '+254700000003',
        pushToken: 'demo-push-token',
        createdAt: new Date()
      }
    ];
    
    const userResult = await db.collection('users').insertMany(users);
    console.log(`✅ Created ${userResult.insertedCount} users`);
    
    const parentId = userResult.insertedIds[2];
    
    // 2. Create Students
    const students = [
      { 
        name: 'John Junior',
        firstName: 'John',
        lastName: 'Junior',
        grade: 'Grade 5',
        classLevel: '5A',
        parentId: parentId,
        active: true,
        photo: 'https://randomuser.me/api/portraits/boys/1.jpg',
        createdAt: new Date()
      },
      { 
        name: 'Jane Junior',
        firstName: 'Jane',
        lastName: 'Junior',
        grade: 'Grade 3',
        classLevel: '3B',
        parentId: parentId,
        active: true,
        photo: 'https://randomuser.me/api/portraits/girls/1.jpg',
        createdAt: new Date()
      }
    ];
    
    const studentResult = await db.collection('students').insertMany(students);
    console.log(`✅ Created ${studentResult.insertedCount} students`);
    
    const studentIds = Object.values(studentResult.insertedIds);
    
    // 3. Create Buses
    const buses = [
      {
        number: 'DEMO-001',
        plate: 'KXX 123A',
        capacity: 40,
        driver: userResult.insertedIds[1],
        active: true,
        currentLocation: {
          coordinates: [36.8219, -1.2921],
          timestamp: new Date()
        },
        lastUpdate: new Date()
      }
    ];
    
    const busResult = await db.collection('buses').insertMany(buses);
    console.log(`✅ Created ${busResult.insertedCount} buses`);
    
    const busId = busResult.insertedIds[0];
    
    // 4. Create Routes
    const routes = [
      {
        name: 'Demo Route - Kasarani',
        busId: busId,
        stops: [
          {
            name: 'Kasarani Stage',
            location: { lat: -1.2321, lng: 36.8919 },
            order: 1
          },
          {
            name: 'Mwiki',
            location: { lat: -1.2421, lng: 36.9019 },
            order: 2
          },
          {
            name: 'Kahawa West',
            location: { lat: -1.2621, lng: 36.9119 },
            order: 3
          }
        ],
        distance: 12.5,
        estimatedDuration: 35,
        active: true,
        createdAt: new Date()
      }
    ];
    
    const routeResult = await db.collection('routes').insertMany(routes);
    console.log(`✅ Created ${routeResult.insertedCount} route`);
    
    const routeId = routeResult.insertedIds[0];
    
    // 5. Create Active Trip
    const trips = [
      {
        busId: busId,
        routeId: routeId,
        driverId: userResult.insertedIds[1],
        startTime: new Date(),
        status: 'active',
        students: studentIds,
        currentStop: 0,
        createdAt: new Date()
      }
    ];
    
    const tripResult = await db.collection('trips').insertMany(trips);
    console.log(`✅ Created ${tripResult.insertedCount} active trip`);
    
    const tripId = tripResult.insertedIds[0];
    
    // 6. Create Sample Attendance Records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendanceRecords = studentIds.map((studentId, index) => ({
      studentId: studentId,
      tripId: tripId,
      busId: busId,
      eventType: 'board',
      method: 'qr',
      createdAt: new Date(today.getTime() + 7 * 60 * 60 * 1000 + index * 60000),
      location: {
        type: 'Point',
        coordinates: [36.8219, -1.2921]
      },
      verifiedByGeofence: true
    }));
    
    const attendanceResult = await db.collection('attendancerecords').insertMany(attendanceRecords);
    console.log(`✅ Created ${attendanceResult.insertedCount} attendance records`);
    
    // Summary
    console.log('\n📊 DATABASE SUMMARY:');
    console.log(`   Users: ${await db.collection('users').countDocuments()}`);
    console.log(`   Students: ${await db.collection('students').countDocuments()}`);
    console.log(`   Buses: ${await db.collection('buses').countDocuments()}`);
    console.log(`   Routes: ${await db.collection('routes').countDocuments()}`);
    console.log(`   Trips: ${await db.collection('trips').countDocuments()}`);
    console.log(`   Attendance: ${await db.collection('attendancerecords').countDocuments()}`);
    
    console.log('\n🎉 Test data created successfully!');
    console.log('\n📱 Login Credentials:');
    console.log('   Admin: admin@demo.com / password123');
    console.log('   Driver: driver@demo.com / password123');
    console.log('   Parent: parent@demo.com / password123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    process.exit();
  }
}

createTestData();