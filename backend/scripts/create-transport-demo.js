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

    // Clear existing data (optional - comment out if you want to keep existing data)
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

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+254700000001',
      isActive: true
    });
    console.log(`  ✅ Admin: admin@demo.com / ${PASSWORD}`);

    // Create Drivers
    const drivers = [];
    const driverNames = [
      'John Kamau', 'Peter Omondi', 'Mary Wanjiku', 'David Mwangi', 
      'Sarah Akinyi', 'James Kariuki', 'Lucy Achieng', 'Joseph Njoroge'
    ];

    for (let i = 0; i < driverNames.length; i++) {
      const driver = await User.create({
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

    // Create Parents
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
    for (let i = 0; i < 8; i++) { // Create 8 active buses
      const bus = await Bus.create({
        registrationNumber: busNumbers[i],
        capacity: busCapacities[i],
        status: busStatuses[i],
        features: ['gps', 'ac', 'cctv', 'seatbelts'],
        campus: i < 4 ? 'Main' : 'East',
        driver: i < drivers.length ? drivers[i]._id : null,
        currentLocation: {
          lat: -1.2864 + (Math.random() - 0.5) * 0.1,
          lng: 36.8172 + (Math.random() - 0.5) * 0.1,
          lastUpdated: new Date(),
          speed: Math.random() * 40,
          heading: Math.floor(Math.random() * 360)
        }
      });
      buses.push(bus);
      
      // Assign bus to driver
      if (i < drivers.length) {
        drivers[i].driverDetails.assignedBus = bus._id;
        await drivers[i].save();
      }
      
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
      
      // Assign route to bus
      if (i < buses.length) {
        buses[i].currentRoute = route._id;
        await buses[i].save();
      }
      
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
      const usesTransport = Math.random() > 0.3; // 70% use transport
      
      // Assign to a parent (round-robin)
      const parent = parents[i % parents.length];
      
      // Assign to a bus if uses transport
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
        
        // Only set parent for some students (others will be linked later)
        ...(i < 40 ? { parentId: parent._id } : {})
      };

      // Add transport details if student uses transport
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

        // Generate QR code for transport students
        studentData.qrCode = `STU-${studentData.admissionNumber}-${Date.now() + i}`;
      }

      const student = await Student.create(studentData);
      students.push(student);
      
      // Add student to parent's children list if parent exists
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

      // Morning trip
      const morningTrip = await Trip.create({
        bus: bus._id,
        driver: driver._id,
        route: route._id,
        type: 'morning_pickup',
        date: today,
        scheduledStartTime: new Date(today.setHours(6, 30, 0)),
        scheduledEndTime: new Date(today.setHours(8, 0, 0)),
        students: busStudents.map(s => ({
          student: s._id,
          status: Math.random() > 0.2 ? 'boarded' : 'pending',
          boardingTime: Math.random() > 0.2 ? new Date(today.setHours(6, 30 + Math.floor(Math.random() * 30), 0)) : null,
          pickupPoint: s.transportDetails?.pickupPoint || { name: s.pickupPoint },
          dropoffPoint: s.transportDetails?.dropoffPoint || { name: s.dropOffPoint }
        })),
        status: Math.random() > 0.3 ? 'completed' : 'scheduled'
      });

      // Afternoon trip
      const afternoonTrip = await Trip.create({
        bus: bus._id,
        driver: driver._id,
        route: route._id,
        type: 'evening_dropoff',
        date: today,
        scheduledStartTime: new Date(today.setHours(15, 30, 0)),
        scheduledEndTime: new Date(today.setHours(17, 0, 0)),
        students: busStudents.map(s => ({
          student: s._id,
          status: 'pending',
          pickupPoint: s.transportDetails?.dropoffPoint || { name: s.dropOffPoint },
          dropoffPoint: s.transportDetails?.pickupPoint || { name: s.pickupPoint }
        })),
        status: 'scheduled'
      });

      console.log(`  ✅ Trips for Bus ${bus.registrationNumber}: Morning (${morningTrip.students.length} students), Afternoon (${afternoonTrip.students.length} students)`);
    }

    // ==================== CREATE ATTENDANCE RECORDS ====================
    console.log('\n📊 Creating attendance records...');

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const transportStudents = students.filter(s => s.usesTransport);

    for (const student of transportStudents.slice(0, 30)) {
      // Record for today (if student is in a trip)
      const todayTrip = await Trip.findOne({
        'students.student': student._id,
        type: 'morning_pickup'
      });

      if (todayTrip) {
        const isPresent = Math.random() > 0.1; // 90% attendance
        const isLate = !isPresent ? false : Math.random() > 0.7; // 30% of present are late
        
        await Attendance.create({
          studentId: student._id,
          tripId: todayTrip._id,
          busId: student.transportDetails?.busId,
          busNumber: buses.find(b => b._id.toString() === student.transportDetails?.busId?.toString())?.registrationNumber,
          driverName: drivers[Math.floor(Math.random() * drivers.length)].name,
          createdAt: isPresent ? new Date(today.setHours(6, 30 + (isLate ? 15 : 0), 0)) : new Date(),
          eventType: isPresent ? (isLate ? 'late' : 'board') : 'absent',
          method: 'qr',
          metadata: {
            syncedFromOffline: false
          }
        });
      }

      // Record for yesterday
      const yesterdayTrip = await Trip.findOne({
        'students.student': student._id,
        type: 'morning_pickup',
        date: yesterday
      });

      if (yesterdayTrip) {
        await Attendance.create({
          studentId: student._id,
          tripId: yesterdayTrip._id,
          busId: student.transportDetails?.busId,
          busNumber: buses.find(b => b._id.toString() === student.transportDetails?.busId?.toString())?.registrationNumber,
          driverName: drivers[Math.floor(Math.random() * drivers.length)].name,
          createdAt: new Date(yesterday.setHours(6, 45, 0)),
          eventType: 'board',
          method: 'qr',
          metadata: {
            syncedFromOffline: false
          }
        });
      }
    }

    console.log(`  ✅ Created attendance records for ${transportStudents.slice(0, 30).length} students`);

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
    console.log(`\n🚌 Today's Trips: ${await Trip.countDocuments({ date: today })}`);
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