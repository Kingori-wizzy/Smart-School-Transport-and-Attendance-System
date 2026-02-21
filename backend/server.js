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
const analyticsRoutes = require('./routes/analyticsRoutes');
const parentRoutes = require('./routes/parentRoutes'); // ✅ NEW
const userRoutes = require('./routes/userRoutes');

// Create Express app
const app = express();

// ✅ UPDATED CORS for both admin frontend and mobile app
app.use(cors({
  origin: [
    'http://localhost:5173',           // Admin frontend
    'http://192.168.100.3:8081',        // Expo mobile (your IP)
    'http://192.168.100.3:8081',        // Alternative Expo port
    /\.exp\.direct$/                     // Expo tunnel domains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/parents', parentRoutes); // ✅ NEW
app.use('/api/user', userRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server
const server = http.createServer(app);

// Socket.io setup with updated CORS
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://192.168.100.3:8081'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey12345');
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

// Socket connection handler - ✅ UPDATED event names to match parent app
io.on('connection', (socket) => {
  console.log('🟢 Client connected:', socket.id, 'Role:', socket.userRole);

  // Join rooms based on role
  if (socket.userRole === 'parent') {
    socket.join(`parent-${socket.userId}`);
    console.log(`Parent ${socket.userId} joined their room`);
  }

  socket.on('subscribe-to-bus', (busId) => {
    socket.join(`bus-${busId}`);
    console.log(`Socket ${socket.id} subscribed to bus ${busId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running securely on port ${PORT}`);
});

module.exports = { app, server, io };