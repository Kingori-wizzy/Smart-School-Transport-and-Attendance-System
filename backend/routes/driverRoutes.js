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
    
    // Find driver user
    const driver = await User.findOne({ 
      email, 
      role: 'driver' 
    }).select('+password');

    if (!driver) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if driver is active
    if (!driver.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Update last login
    driver.lastLogin = new Date();
    await driver.save();

    // Generate token
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
    res.status(500).json({ message: error.message });
  }
});

// Get driver's current trip
router.get('/current-trip', async (req, res) => {
  try {
    const trip = await Trip.findOne({
      driverId: req.user.id,
      status: 'in-progress',
    }).populate('busId', 'number route').populate('routeId', 'name');
    
    if (!trip) {
      return res.json(null);
    }

    const formattedTrip = {
      id: trip._id,
      routeName: trip.routeId?.name || 'Unknown Route',
      busNumber: trip.busId?.number || 'Unknown',
      status: trip.status
    };
    
    res.json(formattedTrip);
  } catch (error) {
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

    const trips = await Trip.find({
      driverId: req.user.id,
      date: { $gte: today, $lt: tomorrow },
    }).sort({ startTime: 1 }).populate('busId', 'number').populate('routeId', 'name');

    // Format trips to match what the app expects
    const formattedTrips = trips.map(trip => ({
      id: trip._id,
      routeName: trip.routeId?.name || 'Unknown Route',
      startTime: trip.startTime ? new Date(trip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '07:00',
      endTime: trip.endTime ? new Date(trip.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:30',
      busNumber: trip.busId?.number || 'BUS-001',
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
    
    // Get date range for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Find all trips for this driver this month
    const trips = await Trip.find({
      driverId: driverId,
      date: { $gte: startOfMonth, $lt: endOfMonth }
    });

    // Calculate statistics
    const totalTrips = trips.length;
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    
    // Get total students transported
    const totalStudents = trips.reduce((sum, trip) => sum + (trip.students?.length || 0), 0);
    
    // Calculate total distance (you can customize this logic)
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 15), 0); // Default 15km per trip

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
    }).populate('busId', 'number').populate('routeId', 'name stops');
    
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    
    res.json(trip);
  } catch (error) {
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
      'firstName lastName classLevel pickupPoint dropOffPoint'
    );

    // Check which students have already boarded from attendance records
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

    // Update bus status
    await Bus.findByIdAndUpdate(trip.busId, { status: 'on-trip' });

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

    // Update bus status
    await Bus.findByIdAndUpdate(trip.busId, { status: 'active' });

    res.json(trip);
  } catch (error) {
    console.error('Error ending trip:', error);
    res.status(500).json({ message: error.message });
  }
});

// Board student
router.post('/trip/:tripId/board/:studentId', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { method = 'qr' } = req.body;

    // Verify trip belongs to driver
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Record attendance
    const attendance = new Attendance({
      studentId,
      tripId,
      eventType: 'board',
      timestamp: new Date(),
      method,
    });
    await attendance.save();

    res.json({ success: true, message: 'Student boarded successfully' });
  } catch (error) {
    console.error('Error boarding student:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update GPS location
router.post('/gps/update', async (req, res) => {
  try {
    const { tripId, lat, lon, speed, heading } = req.body;

    // Verify trip belongs to driver
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const gpsLog = new GPSLog({
      vehicleId: trip.busId,
      tripId,
      lat,
      lon,
      speed,
      heading,
      timestamp: new Date(),
    });
    await gpsLog.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating GPS:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get route coordinates
router.get('/route/:routeId/coordinates', async (req, res) => {
  try {
    // This would come from your route planning system
    // You might have a Route model to fetch actual coordinates
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
    
    // Verify trip belongs to driver
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Save incident report
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

    // Verify trip belongs to driver
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Send notifications to school admins
    const admins = await User.find({ role: 'admin' });
    
    console.log(`🚨 EMERGENCY from driver ${req.user.id} on trip ${tripId}`);
    console.log(`📍 Location:`, location);
    console.log(`👥 Notifying ${admins.length} admins`);

    // Create emergency incident report
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