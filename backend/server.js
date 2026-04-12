const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config();
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const busRoutes = require('./routes/busRoutes');
const tripRoutes = require('./routes/tripRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const gpsRoutes = require('./routes/gpsRoutes');
const geofenceRoutes = require('./routes/geofenceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const parentRoutes = require('./routes/parentRoutes');
const userRoutes = require('./routes/userRoutes');
const driverRoutes = require('./routes/driverRoutes');
const smsRoutes = require('./routes/smsRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const transportRoutes = require('./routes/transportRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const messagingRoutes = require('./routes/messagingRoutes');

// Import AI services (optional - for initialization)
const analyticsService = require('./ai/services/analyticsService');

// Create Express app
const app = express();

// Updated CORS for admin frontend and mobile apps
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://192.168.100.3:8081',
    'http://192.168.100.3:19000',
    'http://192.168.100.3:19001',
    'http://localhost:19006',
    'http://localhost:19002',
    /\.exp\.direct$/,
    /\.ngrok\.io$/,
    'http://10.0.2.2:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Make mongoose accessible globally
global.mongoose = mongoose;

// ==================== ROUTES ====================

// Authentication
app.use('/api/auth', authRoutes);

// Core resources
app.use('/api/students', studentRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/geofences', geofenceRoutes);

// Notifications
app.use('/api/notifications', notificationRoutes);

// Parent routes - both singular and plural for compatibility
app.use('/api/parents', parentRoutes);
app.use('/api/parent', parentRoutes);

// User and role-specific routes
app.use('/api/users', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/drivers', driverRoutes);

// Communication
app.use('/api/sms', smsRoutes);

// Analytics and reports
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);

// Transport management
app.use('/api/transport', transportRoutes);
app.use('/api/settings', settingsRoutes);

// Additional routes
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/routes', require('./routes/routeRoutes'));
app.use('/api/messaging', messagingRoutes);

// Aliases for parent and driver conversation endpoints (for mobile app compatibility)
app.use('/api/parent/conversations', messagingRoutes);
app.use('/api/driver/conversations', messagingRoutes);
// ==========================================
// ==================== CUSTOM ASSIGNMENT ENDPOINTS ====================

// Assign student to bus
app.put('/api/students/:studentId/assign-bus', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { busId, busNumber, pickupPoint, dropoffPoint } = req.body;
    
    const Student = mongoose.model('Student');
    const Bus = mongoose.model('Bus');
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    
    student.busId = busId;
    student.busNumber = busNumber || bus.busNumber;
    student.transportDetails = {
      busId: busId,
      busNumber: busNumber || bus.busNumber,
      pickupPoint: pickupPoint || student.pickupPoint || 'School Gate',
      dropoffPoint: dropoffPoint || student.dropoffPoint || 'Home',
      status: 'active',
      assignedDate: new Date()
    };
    student.usesTransport = true;
    
    await student.save();
    
    if (!bus.assignedStudents) {
      bus.assignedStudents = [];
    }
    if (!bus.assignedStudents.includes(studentId)) {
      bus.assignedStudents.push(studentId);
      await bus.save();
    }
    
    res.json({ 
      success: true, 
      message: 'Student assigned to bus successfully',
      data: { studentId, busId }
    });
  } catch (error) {
    console.error('Error assigning student to bus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove student from bus
app.delete('/api/students/:studentId/remove-bus', async (req, res) => {
  try {
    const { studentId } = req.params;
    const Student = mongoose.model('Student');
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    student.busId = null;
    student.busNumber = null;
    student.transportDetails = null;
    student.usesTransport = false;
    
    await student.save();
    
    res.json({ success: true, message: 'Student removed from bus successfully' });
  } catch (error) {
    console.error('Error removing student from bus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign student to trip
app.post('/api/trips/:tripId/assign-student', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { studentId, tripType } = req.body;
    
    const Trip = mongoose.model('Trip');
    const Student = mongoose.model('Student');
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    if (!trip.students) {
      trip.students = [];
    }
    
    if (trip.students.includes(studentId)) {
      return res.status(400).json({ success: false, message: 'Student already assigned to this trip' });
    }
    
    trip.students.push(studentId);
    
    if (!trip.studentDetails) {
      trip.studentDetails = [];
    }
    trip.studentDetails.push({
      studentId: studentId,
      name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      admissionNumber: student.admissionNumber,
      classLevel: student.classLevel,
      pickupPoint: student.transportDetails?.pickupPoint || 'School Gate',
      dropoffPoint: student.transportDetails?.dropoffPoint || 'Home'
    });
    
    await trip.save();
    
    if (!student.assignedTrips) {
      student.assignedTrips = [];
    }
    student.assignedTrips.push({
      tripId: tripId,
      tripType: tripType || trip.tripType,
      assignedDate: new Date()
    });
    await student.save();
    
    res.json({ 
      success: true, 
      message: 'Student assigned to trip successfully',
      data: { studentId, tripId }
    });
  } catch (error) {
    console.error('Error assigning student to trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove student from trip
app.delete('/api/trips/:tripId/remove-student', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { studentId } = req.body;
    
    const Trip = mongoose.model('Trip');
    const Student = mongoose.model('Student');
    
    const trip = await Trip.findById(tripId);
    if (trip) {
      trip.students = trip.students.filter(id => id.toString() !== studentId);
      trip.studentDetails = trip.studentDetails?.filter(d => d.studentId?.toString() !== studentId);
      await trip.save();
    }
    
    const student = await Student.findById(studentId);
    if (student && student.assignedTrips) {
      student.assignedTrips = student.assignedTrips.filter(t => t.tripId?.toString() !== tripId);
      await student.save();
    }
    
    res.json({ success: true, message: 'Student removed from trip successfully' });
  } catch (error) {
    console.error('Error removing student from trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get unassigned students for a trip
app.get('/api/students/unassigned-trips/list', async (req, res) => {
  try {
    const { tripId } = req.query;
    const Student = mongoose.model('Student');
    const Trip = mongoose.model('Trip');
    
    let assignedStudentIds = [];
    
    if (tripId) {
      const trip = await Trip.findById(tripId);
      if (trip && trip.students) {
        assignedStudentIds = trip.students.map(id => id.toString());
      }
    }
    
    const students = await Student.find({
      _id: { $nin: assignedStudentIds },
      role: { $ne: 'admin' }
    }).select('firstName lastName email admissionNumber classLevel busId transportDetails');
    
    res.json({ 
      success: true, 
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching unassigned students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get students assigned to a specific trip
app.get('/api/trips/:tripId/students', async (req, res) => {
  try {
    const { tripId } = req.params;
    const Trip = mongoose.model('Trip');
    
    const trip = await Trip.findById(tripId).populate('students', 'firstName lastName email admissionNumber classLevel');
    
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    res.json({ 
      success: true, 
      data: trip.students || [],
      count: trip.students?.length || 0
    });
  } catch (error) {
    console.error('Error fetching trip students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get students assigned to a specific bus
app.get('/api/buses/:busId/students', async (req, res) => {
  try {
    const { busId } = req.params;
    const Student = mongoose.model('Student');
    
    const students = await Student.find({ 
      busId: busId,
      usesTransport: true
    }).select('firstName lastName email admissionNumber classLevel pickupPoint dropoffPoint');
    
    res.json({ 
      success: true, 
      data: students,
      count: students.length
    });
  } catch (error) {
    console.error('Error fetching bus students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign driver to bus
app.put('/api/buses/:busId/assign-driver', async (req, res) => {
  try {
    const { busId } = req.params;
    const { driverId, driverName, driverPhone } = req.body;
    
    const Bus = mongoose.model('Bus');
    const User = mongoose.model('User');
    
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    
    if (driverId) {
      const driver = await User.findById(driverId);
      if (driver && driver.role === 'driver') {
        bus.driverId = driverId;
        bus.driverName = `${driver.firstName || ''} ${driver.lastName || ''}`.trim();
        bus.driverPhone = driver.phone;
        
        if (!driver.driverDetails) driver.driverDetails = {};
        driver.driverDetails.assignedBus = busId;
        await driver.save();
      }
    } else {
      bus.driverId = null;
      bus.driverName = null;
      bus.driverPhone = null;
    }
    
    await bus.save();
    
    res.json({ success: true, message: 'Driver assigned to bus successfully', data: bus });
  } catch (error) {
    console.error('Error assigning driver to bus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== HEALTH & INFO ROUTES ====================

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      ai: analyticsService ? 'initialized' : 'pending'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Smart School Transport API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      buses: '/api/buses',
      trips: '/api/trips',
      attendance: '/api/attendance',
      gps: '/api/gps',
      geofences: '/api/geofences',
      notifications: '/api/notifications',
      parents: '/api/parents',
      parent: '/api/parent',
      users: '/api/users',
      drivers: '/api/drivers',
      sms: '/api/sms',
      analytics: '/api/analytics',
      reports: '/api/reports',
      transport: '/api/transport',
      settings: '/api/settings',
      assignments: {
        assignStudentToBus: 'PUT /api/students/:studentId/assign-bus',
        assignStudentToTrip: 'POST /api/trips/:tripId/assign-student',
        removeStudentFromTrip: 'DELETE /api/trips/:tripId/remove-student',
        unassignedStudents: 'GET /api/students/unassigned-trips/list',
        tripStudents: 'GET /api/trips/:tripId/students',
        busStudents: 'GET /api/buses/:busId/students',
        assignDriverToBus: 'PUT /api/buses/:busId/assign-driver'
      }
    }
  });
});

// ==================== SOCKET.IO SETUP ====================

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://192.168.100.3:8081',
      'http://192.168.100.3:19000',
      'http://192.168.100.3:19001',
      'http://localhost:19006',
      'http://localhost:19002',
      /\.exp\.direct$/,
      /\.ngrok\.io$/,
      'http://10.0.2.2:5000'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  allowUpgrades: true,
  perMessageDeflate: {
    threshold: 1024
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey12345');
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.userName = decoded.name;
    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'Role:', socket.userRole, 'User:', socket.userId);

  if (socket.userRole === 'parent') {
    socket.join(`user-${socket.userId}`);
    console.log(`Parent ${socket.userId} joined their room for notifications`);
  } else if (socket.userRole === 'driver') {
    socket.join(`driver-${socket.userId}`);
    console.log(`Driver ${socket.userId} joined their room`);
  } else if (socket.userRole === 'admin') {
    socket.join('admins');
    console.log(`Admin ${socket.userId} joined admin room`);
  }

  socket.on('subscribe-to-bus', (busId) => {
    socket.join(`bus-${busId}`);
    console.log(`Socket ${socket.id} subscribed to bus ${busId}`);
    socket.emit('subscribed', { busId, success: true });
  });

  socket.on('unsubscribe-from-bus', (busId) => {
    socket.leave(`bus-${busId}`);
    console.log(`Socket ${socket.id} unsubscribed from bus ${busId}`);
  });

  socket.on('join-trip', (tripId) => {
    socket.join(`trip-${tripId}`);
    console.log(`Socket ${socket.id} joined trip ${tripId}`);
  });

  socket.on('leave-trip', (tripId) => {
    socket.leave(`trip-${tripId}`);
    console.log(`Socket ${socket.id} left trip ${tripId}`);
  });

  socket.on('driver-location', (data) => {
    const { tripId, busId, location } = data;
    
    io.to(`bus-${busId}`).emit('bus-location', {
      busId,
      location,
      timestamp: new Date(),
      driverId: socket.userId
    });
    
    io.to(`trip-${tripId}`).emit('trip-location', {
      tripId,
      location,
      timestamp: new Date()
    });
  });

  socket.on('student-boarded', (data) => {
    const { tripId, studentId, studentName, parentId } = data;
    
    if (parentId) {
      io.to(`user-${parentId}`).emit('student-boarded-confirmed', {
        studentId,
        studentName,
        tripId,
        timestamp: new Date()
      });
    }
    
    io.to(`trip-${tripId}`).emit('student-boarded-confirmed', {
      studentId,
      studentName,
      timestamp: new Date()
    });
  });

  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ pong: true, timestamp: new Date() });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

app.set('io', io);
app.locals.io = io;
global.io = io;

// ==================== ERROR HANDLING ====================

app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log('\n=================================');
  console.log(`Server running on port ${PORT}`);
  console.log(`Host: ${HOST}`);
  console.log(`Mobile app: http://192.168.100.3:${PORT}`);
  console.log(`Admin frontend: http://localhost:5173`);
  console.log(`AI Analytics: ${analyticsService ? 'Initialized' : 'Pending'}`);
  console.log(`MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
  console.log('=================================\n');
  
  console.log('Mounted Routes:');
  console.log('   - /api/auth');
  console.log('   - /api/students');
  console.log('   - /api/buses');
  console.log('   - /api/trips');
  console.log('   - /api/attendance');
  console.log('   - /api/gps');
  console.log('   - /api/geofences');
  console.log('   - /api/notifications');
  console.log('   - /api/parents (plural)');
  console.log('   - /api/parent (singular)');
  console.log('   - /api/users');
  console.log('   - /api/driver');
  console.log('   - /api/drivers');
  console.log('   - /api/sms');
  console.log('   - /api/analytics');
  console.log('   - /api/reports');
  console.log('   - /api/transport');
  console.log('   - /api/settings');
  console.log('   - /api/assignments');
  console.log('   - /api/routes');
  console.log('\nParent Notification Endpoints:');
  console.log('   - GET    /api/notifications');
  console.log('   - GET    /api/notifications/unread/count');
  console.log('   - PUT    /api/notifications/:id/read');
  console.log('   - PUT    /api/notifications/read-all');
  console.log('   - DELETE /api/notifications/:id');
  console.log('   - DELETE /api/notifications/clear/all');
  console.log('\nCustom Assignment Endpoints:');
  console.log('   - PUT    /api/students/:studentId/assign-bus');
  console.log('   - POST   /api/trips/:tripId/assign-student');
  console.log('   - DELETE /api/trips/:tripId/remove-student');
  console.log('   - GET    /api/students/unassigned-trips/list');
  console.log('   - GET    /api/trips/:tripId/students');
  console.log('   - GET    /api/buses/:busId/students');
  console.log('   - PUT    /api/buses/:busId/assign-driver');
  console.log('\nSocket.IO Configuration:');
  console.log('   - Transport: WebSocket + Polling');
  console.log('   - Allow EIO3: Yes');
  console.log('   - Ping Timeout: 60s');
  console.log('\nSocket.IO Rooms:');
  console.log('   - user-{userId} (For parent notifications)');
  console.log('   - driver-{driverId}');
  console.log('   - bus-{busId}');
  console.log('   - trip-{tripId}');
  console.log('   - admins');
  console.log('=================================\n');
});

const shutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      console.log('Process terminated');
      process.exit(0);
    });
  });
  
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server, io };