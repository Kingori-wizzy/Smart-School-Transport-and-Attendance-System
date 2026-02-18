// 🌍 Core Imports
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
require('dotenv').config();

// 🚀 Initialize Express
const app = express();
const server = http.createServer(app);

// 🔴 Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 🛠 Middleware
app.use(express.json());
app.use(cors());

// 📦 Database
require('./config/db');

// 📁 Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const tripRoutes = require('./routes/tripRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const gpsRoutes = require('./routes/gpsRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/analytics', analyticsRoutes);

// 🌐 Root Route
app.get('/', (req, res) => {
  res.send('🚀 Smart School System - Secure Real-Time Running');
});

/*
====================================================
🔐 SOCKET JWT AUTHENTICATION MIDDLEWARE
====================================================
*/
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: No token'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;
    next();

  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

/*
====================================================
🔴 SOCKET CONNECTION
====================================================
*/
const connectedUsers = {};

io.on('connection', (socket) => {
  console.log('🟢 Secure Client connected:', socket.id);

  const userId = socket.user.id;
  connectedUsers[userId] = socket.id;

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
    delete connectedUsers[userId];
  });
});

// Make globally accessible
app.set('io', io);
app.set('connectedUsers', connectedUsers);

// 🚀 Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running securely on port ${PORT}`);
});
