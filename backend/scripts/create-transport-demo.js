const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
const User = require('../models/User');
const Student = require('../models/Student');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const Attendance = require('../models/AttendanceRecord');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school-transport';
const PASSWORD = 'password123';

// Helper function to generate random phone number
const randomPhone = () => {
  const prefix = ['+2547', '+25411', '+25412'];
  return prefix[Math.floor(Math.random() * prefix.length)] + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
};

// Helper to generate random coordinates around Nairobi
const randomCoord = (baseLat = -1.2864, baseLng = 36.8172, range = 0.05) => {
  return {
    lat: baseLat + (Math.random() - 0.5) * range,
    lng: baseLng + (Math.random() - 0.5) * range
  };
};

// Helper to generate admission number
const generateAdmission = (year, classLevel, index) => {
  const classMap = {
    'PP1': 'PP1', 'PP2': 'PP2',
    'Grade 1': 'G1', 'Grade 2': 'G2', 'Grade 3': 'G3', 'Grade 4': 'G4',
    'Grade 5': 'G5', 'Grade 6': 'G6', 'Grade 7': 'G7', 'Grade 8': 'G8',
    'Form 1': 'F1', 'Form 2': 'F2', 'Form 3': 'F3', 'Form 4': 'F4'
  };
  const classCode = classMap[classLevel] || 'XX';
  return `${year}/${classCode}/${index.toString().padStart(3, '0')}`;
};

// Main function
async function createDemoData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Student.deleteMany({}),
      Bus.deleteMany({}),
      Trip.deleteMany({}),
      Route.deleteMany({}),
      Attendance.deleteMany({})
    ]);
    console.log('✅ Database cleared\n');

    // ==================== CREATE USERS ====================
    console.log('👥 Creating users...');

    // Hash password once
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);

    // ===== CREATE ADMIN =====
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+254700000001',
      isActive: true
    });
    console.log(`  ✅ Admin: admin@demo.com / ${PASSWORD}`);

    // ===== CREATE DRIVERS =====
    const drivers = [];
    const driverNames = [
      'John Kamau', 'Peter Omondi', 'Mary Wanjiku', 'David Mwangi', 
      'Sarah Akinyi', 'James Kariuki', 'Lucy Achieng', 'Joseph Njoroge'
    ];

    for (let i = 0; i < driverNames.length; i++) {
      const nameParts = driverNames[i].split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const driver = await User.create({
        firstName,
        lastName,
        name: driverNames[i],
        email: `driver${i + 1}@demo.com`,
        password: hashedPassword,
        role: 'driver',
        phone: randomPhone(),
        isActive: true,
        driverDetails: {
          licenseNumber: `DL${Math.floor(100000 + Math.random() * 900000)}`,
          licenseExpiry: new Date(2026, 11, 31),
          experience: Math.floor(3 + Math.random() * 10)
        }
      });
      drivers.push(driver);
      console.log(`  ✅ Driver ${i + 1}: driver${i + 1}@demo.com / ${PASSWORD}`);
    }

    // ===== CREATE PARENTS =====
    const parents = [];
    const parentFirstNames = [
      'John', 'Mary', 'Peter', 'Jane', 'David', 'Sarah', 'Michael', 'Esther',
      'James', 'Lucy', 'Robert', 'Grace', 'William', 'Anne', 'Charles', 'Ruth'
    ];
    const parentLastNames = [
      'Kamau', 'Omondi', 'Mwangi', 'Akinyi', 'Kariuki', 'Achieng', 'Njoroge', 'Wanjiku',
      'Odhiambo', 'Wambui', 'Kipchoge', 'Chebet', 'Mutua', 'Nduta', 'Kiprop', 'Jeruto'
    ];

    for (let i = 0; i < 16; i++) {
      const firstName = parentFirstNames[i];
      const lastName = parentLastNames[i];
      const parent = await User.create({
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email: `parent${i + 1}@demo.com`,
        password: hashedPassword,
        role: 'parent',
        phone: randomPhone(),
        isActive: true,
        parentDetails: {
          emergencyContact: randomPhone(),
          notificationPreferences: {
            sms: true,
            push: true,
            email: true
          }
        }
      });
      parents.push(parent);
      console.log(`  ✅ Parent ${i + 1}: parent${i + 1}@demo.com / ${PASSWORD}`);
    }

    // ==================== CREATE BUSES ====================
    console.log('\n🚍 Creating buses...');

    const busNumbers = [
      'KAA 123A', 'KBB 456B', 'KCC 789C', 'KDD 012D', 'KEE 345E',
      'KFF 678F', 'KGG 901G', 'KHH 234H', 'KII 567I', 'KJJ 890J'
    ];

    const busStatuses = ['active', 'active', 'active', 'maintenance', 'active', 'active', 'active', 'inactive', 'active', 'active'];
    const busCapacities = [54, 48, 62, 54, 48, 62, 54, 48, 62, 54];

    const buses = [];
    for (let i = 0; i < 8; i++) {
      const bus = await Bus.create({
        busNumber: busNumbers[i],
        registrationNumber: busNumbers[i],
        capacity: busCapacities[i],
        status: busStatuses[i],
        features: ['gps', 'ac', 'cctv', 'seatbelts'],
        campus: i < 4 ? 'Main' : 'East',
        driverName: i < drivers.length ? drivers[i].name : null,
        currentLocation: {
          lat: -1.2864 + (Math.random() - 0.5) * 0.1,
          lng: 36.8172 + (Math.random() - 0.5) * 0.1,
          lastUpdated: new Date(),
          speed: Math.random() * 40,
          heading: Math.floor(Math.random() * 360)
        }
      });
      buses.push(bus);
      console.log(`  ✅ Bus ${i + 1}: ${busNumbers[i]} (Capacity: ${busCapacities[i]})`);
    }

    // ==================== CREATE ROUTES ====================
    console.log('\n🗺️  Creating routes...');

    const routeNames = ['North Route', 'South Route', 'East Route', 'West Route', 'Central Route'];
    const routes = [];

    for (let i = 0; i < routeNames.length; i++) {
      const stops = [];
      const numStops = 5 + Math.floor(Math.random() * 5);
      
      for (let j = 0; j < numStops; j++) {
        const coord = randomCoord(-1.2864, 36.8172, 0.15);
        stops.push({
          name: `Stop ${j + 1}`,
          coordinates: coord,
          scheduledTime: `${6 + Math.floor(j / 2)}:${(j % 2) * 30}`.padStart(5, '0'),
          radius: 100
        });
      }

      const route = await Route.create({
        name: routeNames[i],
        description: `${routeNames[i]} for school transport`,
        bus: i < buses.length ? buses[i]._id : null,
        stops: stops,
        path: stops.map(s => s.coordinates),
        distance: 10 + Math.random() * 15,
        estimatedDuration: 30 + Math.floor(Math.random() * 30),
        isActive: true
      });
      routes.push(route);
      
      console.log(`  ✅ Route ${i + 1}: ${routeNames[i]} (${stops.length} stops)`);
    }

    // ==================== CREATE STUDENTS ====================
    console.log('\n🧑‍🎓 Creating students...');

    const classLevels = [
      'PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
      'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Form 1', 'Form 2', 'Form 3', 'Form 4'
    ];

    const firstNames = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah',
      'Ian', 'Julia', 'Kevin', 'Linda', 'Michael', 'Nancy', 'Oscar', 'Patricia',
      'Quentin', 'Rachel', 'Samuel', 'Tina', 'Ulysses', 'Victoria', 'William', 'Xena',
      'Yvonne', 'Zachary', 'Aaron', 'Brenda', 'Caleb', 'Deborah', 'Elijah', 'Faith'
    ];

    const lastNames = [
      'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
      'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
      'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris',
      'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen'
    ];

    const students = [];
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < 60; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const classLevel = classLevels[Math.floor(Math.random() * classLevels.length)];
      const usesTransport = Math.random() > 0.3;
      
      const parent = parents[i % parents.length];
      const busIndex = i % buses.length;
      const routeIndex = i % routes.length;
      
      const pickupCoord = randomCoord(-1.2864, 36.8172, 0.2);
      const dropoffCoord = randomCoord(-1.2864, 36.8172, 0.2);

      const studentData = {
        firstName,
        lastName,
        admissionNumber: generateAdmission(currentYear, classLevel, i + 1),
        age: Math.floor(5 + Math.random() * 15),
        gender: Math.random() > 0.5 ? 'Male' : 'Female',
        classLevel,
        stream: ['East', 'West', 'North', 'South'][Math.floor(Math.random() * 4)],
        guardianContact: randomPhone(),
        usesTransport,
        isActive: true,
        ...(i < 40 ? { parentId: parent._id } : {})
      };

      if (usesTransport) {
        studentData.transportDetails = {
          pickupPoint: {
            name: `Pickup Point ${i + 1}`,
            coordinates: pickupCoord,
            time: `${6 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            instructions: Math.random() > 0.7 ? 'Wait at the gate' : ''
          },
          dropoffPoint: {
            name: `Dropoff Point ${i + 1}`,
            coordinates: dropoffCoord,
            time: `${15 + Math.floor(Math.random() * 2)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            instructions: Math.random() > 0.7 ? 'Ring the bell' : ''
          },
          busId: buses[busIndex]._id,
          routeId: routes[routeIndex]._id,
          status: Math.random() > 0.2 ? 'active' : 'pending',
          feePaid: Math.random() > 0.3,
          feeAmount: 2500 + Math.floor(Math.random() * 1500),
          specialNotes: Math.random() > 0.8 ? 'Allergic to peanuts' : ''
        };

        studentData.qrCode = `STU-${studentData.admissionNumber}-${Date.now() + i}`;
      }

      const student = await Student.create(studentData);
      students.push(student);
      
      if (student.parentId) {
        await User.findByIdAndUpdate(student.parentId, {
          $push: { 'parentDetails.children': student._id }
        });
      }
      
      if (i < 20) {
        console.log(`  ✅ Student ${i + 1}: ${firstName} ${lastName} (${classLevel}) - ${usesTransport ? '🚌 Transport' : '🚶 No Transport'}`);
      }
    }
    console.log(`  ... and ${students.length - 20} more students (${students.filter(s => s.usesTransport).length} transport students)`);

    // ==================== CREATE TODAY'S TRIPS ====================
    console.log('\n🚌 Creating today\'s trips...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Store trips for later use in attendance
    const createdTrips = [];

    for (let i = 0; i < buses.length; i++) {
      const bus = buses[i];
      const driver = drivers[i % drivers.length];
      const route = routes[i % routes.length];
      
      // Get students assigned to this bus
      const busStudents = students.filter(s => 
        s.usesTransport && 
        s.transportDetails?.busId?.toString() === bus._id.toString()
      );

      if (busStudents.length === 0) continue;

      // Get route name
      const routeName = route?.name || 'Unknown Route';
      
      // Get vehicle ID (bus number)
      const vehicleId = bus.busNumber || bus.registrationNumber || `BUS-${i + 1}`;

      // Morning trip
      const morningTrip = await Trip.create({
        routeName: routeName,
        vehicleId: vehicleId,
        driverId: driver._id,
        tripType: 'morning',
        scheduledStartTime: new Date(new Date().setHours(6, 30, 0, 0)),
        scheduledEndTime: new Date(new Date().setHours(8, 0, 0, 0)),
        status: 'scheduled',
        lateStart: false
      });
      
      createdTrips.push(morningTrip);

      // Afternoon trip
      const afternoonTrip = await Trip.create({
        routeName: routeName,
        vehicleId: vehicleId,
        driverId: driver._id,
        tripType: 'afternoon',
        scheduledStartTime: new Date(new Date().setHours(15, 30, 0, 0)),
        scheduledEndTime: new Date(new Date().setHours(17, 0, 0, 0)),
        status: 'scheduled',
        lateStart: false
      });
      
      createdTrips.push(afternoonTrip);

      console.log(`  ✅ Trips for Bus ${bus.busNumber}: Morning (${busStudents.length} students), Afternoon (${busStudents.length} students)`);
    }

    // ==================== CREATE ATTENDANCE RECORDS ====================
    console.log('\n📊 Creating attendance records...');

    const transportStudents = students.filter(s => s.usesTransport);
    let boardCount = 0;
    let alightCount = 0;

    // Create BOARD records for today
    for (const student of transportStudents.slice(0, 30)) {
      // Find the bus for this student
      const bus = buses.find(b => b._id.toString() === student.transportDetails?.busId?.toString());
      
      if (!bus) {
        console.log(`  ⚠️ No bus found for student ${student.firstName} ${student.lastName}, skipping`);
        continue;
      }

      // Find a morning trip for this bus
      const vehicleId = bus.busNumber || bus.registrationNumber;
      const trip = await Trip.findOne({ 
        vehicleId: vehicleId,
        tripType: 'morning'
      });

      if (!trip) {
        console.log(`  ⚠️ No trip found for bus ${bus.busNumber}, skipping attendance`);
        continue;
      }

      // 90% of students board
      const willBoard = Math.random() > 0.1;
      
      if (willBoard) {
        await Attendance.create({
          studentId: student._id,
          tripId: trip._id,
          eventType: 'board',
          scannerId: `scanner_${Math.floor(Math.random() * 5)}`,
          gpsSnapshot: {
            lat: -1.2864 + (Math.random() - 0.5) * 0.01,
            lon: 36.8172 + (Math.random() - 0.5) * 0.01
          },
          createdAt: new Date(new Date().setHours(6, 30 + Math.floor(Math.random() * 30), 0, 0))
        });
        boardCount++;
      }
    }

    // Create ALIGHT records for yesterday (students who boarded yesterday)
    console.log('\n  Creating alight records for previous day...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(16, 0, 0, 0);

    for (const student of transportStudents.slice(0, 25)) {
      const bus = buses.find(b => b._id.toString() === student.transportDetails?.busId?.toString());
      if (!bus) continue;
      
      const vehicleId = bus.busNumber || bus.registrationNumber;
      const trip = await Trip.findOne({ 
        vehicleId: vehicleId,
        tripType: 'afternoon' 
      });

      if (trip) {
        await Attendance.create({
          studentId: student._id,
          tripId: trip._id,
          eventType: 'alight',
          scannerId: `scanner_${Math.floor(Math.random() * 5)}`,
          gpsSnapshot: {
            lat: -1.2864 + (Math.random() - 0.5) * 0.01,
            lon: 36.8172 + (Math.random() - 0.5) * 0.01
          },
          createdAt: yesterday
        });
        alightCount++;
      }
    }

    console.log(`  ✅ Created ${boardCount} BOARD records and ${alightCount} ALIGHT records`);

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(50));
    console.log('📋 DEMO DATA CREATION COMPLETE!');
    console.log('='.repeat(50));
    console.log(`\n👥 Users:`);
    console.log(`  - Admin: 1 (admin@demo.com)`);
    console.log(`  - Drivers: ${drivers.length} (driver1@demo.com ... driver${drivers.length}@demo.com)`);
    console.log(`  - Parents: ${parents.length} (parent1@demo.com ... parent${parents.length}@demo.com)`);
    console.log(`\n🚍 Buses: ${buses.length}`);
    console.log(`🗺️  Routes: ${routes.length}`);
    console.log(`🧑‍🎓 Students: ${students.length} (${students.filter(s => s.usesTransport).length} use transport)`);
    console.log(`  - Linked to parents: ${students.filter(s => s.parentId).length}`);
    console.log(`  - Unlinked: ${students.filter(s => !s.parentId).length}`);
    console.log(`\n🚌 Today's Trips: ${createdTrips.length}`);
    console.log(`📊 Attendance Records: ${await Attendance.countDocuments()}`);
    console.log('\n✅ All passwords: password123');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
createDemoData();