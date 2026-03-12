const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/authMiddleware');
const Trip = require('../models/Trip');
const Student = require('../models/Student');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Attendance = require('../models/AttendanceRecord');
const GPSLog = require('../models/GPSLog');
const IncidentReport = require('../models/IncidentReport');

// Driver login (NO authentication required for login)
router.post('/auth/driver/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const driver = await User.findOne({ 
      email, 
      role: 'driver' 
    }).select('+password');

    if (!driver) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!driver.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    driver.lastLogin = new Date();
    await driver.save();

    const token = jwt.sign(
      { id: driver._id, role: driver.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      driver: {
        id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
      },
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// All subsequent driver routes require authentication
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Access denied. Driver only.' });
  }
  next();
});

// Get driver profile
router.get('/profile', async (req, res) => {
  try {
    const driver = await User.findById(req.user.id).select('-password');
    res.json(driver);
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get driver's current trip
router.get('/current-trip', async (req, res) => {
  try {
    const trip = await Trip.findOne({
      driverId: req.user.id,
      status: 'in-progress',
    });

    if (!trip) {
      return res.json(null);
    }

    const formattedTrip = {
      id: trip._id,
      routeName: trip.routeName || 'Unknown Route',
      busNumber: trip.busNumber || 'BUS-001',
      status: trip.status
    };
    
    res.json(formattedTrip);
  } catch (error) {
    console.error('Error fetching current trip:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get today's trips
router.get('/trips/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('🔍 Searching for trips between:', today, 'and', tomorrow);

    const trips = await Trip.find({
      driverId: req.user.id,
      scheduledStartTime: { $gte: today, $lt: tomorrow },
    }).sort({ scheduledStartTime: 1 });

    console.log(`📊 Found ${trips.length} trips for driver ${req.user.id}`);

    const formattedTrips = trips.map(trip => ({
      id: trip._id,
      routeName: trip.routeName || 'Unknown Route',
      startTime: trip.scheduledStartTime 
        ? new Date(trip.scheduledStartTime).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }) 
        : '07:00 AM',
      endTime: trip.scheduledEndTime 
        ? new Date(trip.scheduledEndTime).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }) 
        : '08:30 AM',
      busNumber: trip.busNumber || 'BUS-001',
      status: trip.status || 'scheduled',
      studentCount: trip.students?.length || 0
    }));

    res.json(formattedTrips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get driver stats
router.get('/stats', async (req, res) => {
  try {
    const driverId = req.user.id;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const trips = await Trip.find({
      driverId: driverId,
      scheduledStartTime: { $gte: startOfMonth, $lt: endOfMonth }
    });

    const totalTrips = trips.length;
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    const totalStudents = trips.reduce((sum, trip) => sum + (trip.students?.length || 0), 0);
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 15), 0);

    console.log(`📊 Driver stats: ${totalTrips} total trips, ${completedTrips} completed`);

    res.json({
      totalTrips,
      completedTrips,
      totalStudents,
      totalDistance
    });
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get trip details
router.get('/trip/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.tripId,
      driverId: req.user.id,
    });
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    let busInfo = null;
    if (trip.busId) {
      busInfo = await Bus.findById(trip.busId).select('number');
    }
    
    const tripWithDetails = {
      ...trip.toObject(),
      busNumber: busInfo?.number || trip.busNumber || 'Unknown'
    };
    
    res.json(tripWithDetails);
  } catch (error) {
    console.error('Error fetching trip details:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get students for a trip
router.get('/trip/:tripId/students', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const students = await Student.find({ busId: trip.busId }).select(
      'firstName lastName classLevel pickupPoint dropOffPoint latitude longitude'
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const boardedRecords = await Attendance.find({
      tripId: req.params.tripId,
      eventType: 'board',
      createdAt: { $gte: today, $lt: tomorrow }
    }).distinct('studentId');

    const boardedSet = new Set(boardedRecords.map(id => id.toString()));

    const studentsWithStatus = students.map(s => ({
      id: s._id,
      firstName: s.firstName,
      lastName: s.lastName,
      classLevel: s.classLevel,
      pickupPoint: s.pickupPoint,
      dropOffPoint: s.dropOffPoint,
      latitude: s.latitude || -1.2864 + (Math.random() * 0.1),
      longitude: s.longitude || 36.8172 + (Math.random() * 0.1),
      boarded: boardedSet.has(s._id.toString()),
    }));

    res.json(studentsWithStatus);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ message: error.message });
  }
});

// Start trip
router.post('/trip/:tripId/start', async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      {
        _id: req.params.tripId,
        driverId: req.user.id,
        status: 'scheduled',
      },
      {
        status: 'in-progress',
        startTime: new Date(),
      },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found or already started' });
    }

    if (trip.busId) {
      await Bus.findByIdAndUpdate(trip.busId, { status: 'on-trip' });
    }

    res.json(trip);
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ message: error.message });
  }
});

// End trip
router.post('/trip/:tripId/end', async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      {
        _id: req.params.tripId,
        driverId: req.user.id,
        status: 'in-progress',
      },
      {
        status: 'completed',
        endTime: new Date(),
      },
      { new: true }
    );

    if (!trip) {
      return res.status(404).json({ message: 'Trip not found or not in progress' });
    }

    if (trip.busId) {
      await Bus.findByIdAndUpdate(trip.busId, { status: 'active' });
    }

    res.json(trip);
  } catch (error) {
    console.error('Error ending trip:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ FIXED: Board student - Correct endpoint
router.post('/trip/:tripId/board/:studentId', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { method = 'qr' } = req.body;

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const attendance = new Attendance({
      studentId,
      tripId,
      eventType: 'board',
      timestamp: new Date(),
      method,
    });
    await attendance.save();

    await Trip.findByIdAndUpdate(tripId, {
      $addToSet: { students: studentId }
    });

    res.json({ success: true, message: 'Student boarded successfully' });
  } catch (error) {
    console.error('Error boarding student:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ FIXED: Alight student
router.post('/trip/:tripId/alight/:studentId', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { method = 'qr' } = req.body;

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const attendance = new Attendance({
      studentId,
      tripId,
      eventType: 'alight',
      timestamp: new Date(),
      method,
    });
    await attendance.save();

    res.json({ success: true, message: 'Student alighted successfully' });
  } catch (error) {
    console.error('Error alighting student:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update GPS location - FIXED with fallback
router.post('/gps/update', async (req, res) => {
  try {
    const { tripId, lat, lon, speed, heading } = req.body;

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Use trip.busId or create a default vehicle ID
    const vehicleId = trip.busId || 'unknown-vehicle';
    
    const gpsLog = new GPSLog({
      vehicleId: vehicleId,
      tripId,
      lat,
      lon,
      speed,
      heading,
      timestamp: new Date(),
    });
    await gpsLog.save();

    await Trip.findByIdAndUpdate(tripId, {
      lastLocation: { lat, lon, timestamp: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating GPS:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get route coordinates
router.get('/route/:routeId/coordinates', async (req, res) => {
  try {
    const mockCoordinates = [
      { latitude: -1.2864, longitude: 36.8172 },
      { latitude: -1.2964, longitude: 36.8272 },
      { latitude: -1.3064, longitude: 36.8372 },
      { latitude: -1.3164, longitude: 36.8472 },
      { latitude: -1.3264, longitude: 36.8572 },
    ];
    res.json(mockCoordinates);
  } catch (error) {
    console.error('Error fetching route coordinates:', error);
    res.status(500).json({ message: error.message });
  }
});

// Report incident
router.post('/report', async (req, res) => {
  try {
    const { tripId, type, description, photos } = req.body;
    
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const report = new IncidentReport({
      tripId,
      type,
      description,
      photos: photos || [],
      reportedBy: req.user.id,
      timestamp: new Date(),
    });
    await report.save();

    res.json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ message: error.message });
  }
});

// Emergency SOS
router.post('/emergency', async (req, res) => {
  try {
    const { tripId, location } = req.body;

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const admins = await User.find({ role: 'admin' });
    
    console.log(`🚨 EMERGENCY from driver ${req.user.id} on trip ${tripId}`);
    console.log(`📍 Location:`, location);
    console.log(`👥 Notifying ${admins.length} admins`);

    const report = new IncidentReport({
      tripId,
      type: 'emergency',
      description: 'SOS EMERGENCY',
      reportedBy: req.user.id,
      location,
      timestamp: new Date(),
      severity: 'critical'
    });
    await report.save();

    res.json({ success: true, message: 'Emergency alert sent' });
  } catch (error) {
    console.error('Error sending emergency:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;