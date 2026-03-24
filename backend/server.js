const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const path = require('path');

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

// Import AI services (optional - for initialization)
const analyticsService = require('./ai/services/analyticsService');

// Create Express app
const app = express();

// ✅ Updated CORS for admin frontend and mobile apps
app.use(cors({
  origin: [
    'http://localhost:5173',           // Admin frontend (Vite default)
    'http://localhost:3000',            // Alternative frontend port
    'http://192.168.100.3:8081',        // Expo mobile (your IP)
    'http://192.168.100.3:19000',       // Expo default port
    'http://localhost:19006',            // Expo web
    'http://localhost:19002',            // Expo dev tools
    /\.exp\.direct$/,                    // Expo tunnel domains
    /\.ngrok\.io$/,                      // ngrok tunnels
    'http://10.0.2.2:5000'              // Android emulator
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
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Make mongoose accessible globally
global.mongoose = mongoose;

// ==================== ROUTES ====================
// Mount routes - including both singular and plural for parent routes

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

// Parent routes - MOUNTED ON BOTH SINGULAR AND PLURAL for mobile app compatibility
app.use('/api/parents', parentRoutes);   // Plural version (for admin panel)
app.use('/api/parent', parentRoutes);    // Singular version (for mobile app)

// User and role-specific routes
app.use('/api/users', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/drivers', driverRoutes);   // Also mount on plural for consistency

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

// ==================== HEALTH & INFO ROUTES ====================

// Health check route
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

// API info route
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
      parent: '/api/parent',      // Singular version for mobile
      users: '/api/users',
      drivers: '/api/drivers',
      sms: '/api/sms',
      analytics: '/api/analytics',
      reports: '/api/reports',
      transport: '/api/transport',
      settings: '/api/settings'
    }
  });
});

// ==================== SOCKET.IO SETUP ====================

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup with updated CORS
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'http://localhost:3000',
      'http://192.168.100.3:8081',
      'http://192.168.100.3:19000',
      'http://localhost:19006',
      /\.exp\.direct$/,
      /\.ngrok\.io$/
    ],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket authentication middleware
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

// Socket connection handler
io.on('connection', (socket) => {
  console.log('🟢 Client connected:', socket.id, 'Role:', socket.userRole, 'User:', socket.userId);

  // Join rooms based on role
  if (socket.userRole === 'parent') {
    socket.join(`parent-${socket.userId}`);
    console.log(`Parent ${socket.userId} joined their room`);
  } else if (socket.userRole === 'driver') {
    socket.join(`driver-${socket.userId}`);
    console.log(`Driver ${socket.userId} joined their room`);
  } else if (socket.userRole === 'admin') {
    socket.join('admins');
    console.log(`Admin ${socket.userId} joined admin room`);
  }

  // Subscribe to bus updates
  socket.on('subscribe-to-bus', (busId) => {
    socket.join(`bus-${busId}`);
    console.log(`Socket ${socket.id} subscribed to bus ${busId}`);
    
    // Confirm subscription
    socket.emit('subscribed', { busId, success: true });
  });

  // Unsubscribe from bus
  socket.on('unsubscribe-from-bus', (busId) => {
    socket.leave(`bus-${busId}`);
    console.log(`Socket ${socket.id} unsubscribed from bus ${busId}`);
  });

  // Join trip room
  socket.on('join-trip', (tripId) => {
    socket.join(`trip-${tripId}`);
    console.log(`Socket ${socket.id} joined trip ${tripId}`);
  });

  // Leave trip room
  socket.on('leave-trip', (tripId) => {
    socket.leave(`trip-${tripId}`);
    console.log(`Socket ${socket.id} left trip ${tripId}`);
  });

  // Location updates from drivers
  socket.on('driver-location', (data) => {
    const { tripId, busId, location } = data;
    
    // Broadcast to all interested parties
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

  // Boarding confirmation
  socket.on('student-boarded', (data) => {
    const { tripId, studentId, studentName } = data;
    
    io.to(`trip-${tripId}`).emit('student-boarded-confirmed', {
      studentId,
      studentName,
      timestamp: new Date()
    });
  });

  // Test connection
  socket.on('ping', (callback) => {
    if (typeof callback === 'function') {
      callback({ pong: true, timestamp: new Date() });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('🔴 Client disconnected:', socket.id, 'Reason:', reason);
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Make io accessible to routes
app.set('io', io);
app.locals.io = io;

// ==================== ERROR HANDLING ====================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler - Catch all unmatched routes
app.use((req, res) => {
  // Log the requested path for debugging
  console.log(`⚠️ 404 Not Found: ${req.method} ${req.originalUrl}`);
  
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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Host: ${HOST}`);
  console.log(`📱 Mobile app: http://192.168.100.3:${PORT}`);
  console.log(`💻 Admin frontend: http://localhost:5173`);
  console.log(`🤖 AI Analytics: ${analyticsService ? '✅ Initialized' : '⏳ Pending'}`);
  console.log(`🗄️  MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}`);
  console.log('=================================\n');
  
  // Log all mounted routes for debugging
  console.log('📁 Mounted Routes:');
  console.log('   - /api/auth');
  console.log('   - /api/students');
  console.log('   - /api/buses');
  console.log('   - /api/trips');
  console.log('   - /api/attendance');
  console.log('   - /api/gps');
  console.log('   - /api/geofences');
  console.log('   - /api/notifications');
  console.log('   - /api/parents (plural)');
  console.log('   - /api/parent (singular) ← For mobile app');
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
  console.log('=================================\n');
});

// ==================== GRACEFUL SHUTDOWN ====================

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
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server, io };