const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables
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
    'http://192.168.100.3:8081',        // Alternative Expo port
    'http://localhost:19006',            // Expo web
    'http://localhost:19002',            // Expo dev tools
    /\.exp\.direct$/                     // Expo tunnel domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Make mongoose accessible globally
global.mongoose = mongoose;

// Routes - Each only once!
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/user', userRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      ai: 'initialized'
    }
  });
});

// API info route
app.get('/', (req, res) => {
  res.json({
    name: 'Smart School Transport API',
    version: '1.0.0',
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
      users: '/api/users',
      drivers: '/api/drivers',
      sms: '/api/sms',
      analytics: '/api/analytics'
    }
  });
});

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup with updated CORS
const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:5173', 
      'http://localhost:3000',
      'http://192.168.100.3:8081',
      'http://localhost:19006',
      /\.exp\.direct$/
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
    
    // Also notify parent if they're online (parent room would be set up elsewhere)
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler - FIXED (removed the '*')
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running securely on port ${PORT} (all interfaces)`);
  console.log(`📱 Mobile app can connect to: http://YOUR_IP:${PORT}`);
  console.log(`💻 Admin frontend: http://localhost:5173`);
  console.log(`🤖 AI Analytics Service: ${analyticsService ? 'Initialized' : 'Pending'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    mongoose.connection.close();
    console.log('Process terminated');
  });
});

module.exports = { app, server, io };