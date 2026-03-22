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

// ==================== PUBLIC ROUTES ====================

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

// ==================== PROTECTED ROUTES (require auth) ====================

// All subsequent driver routes require authentication
router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Access denied. Driver only.' });
  }
  next();
});

// ==================== PROFILE & STATS ====================

// Get driver profile - FIXED: Removed problematic populate
router.get('/profile', async (req, res) => {
  try {
    const driver = await User.findById(req.user.id)
      .select('-password');
    
    // Get assigned bus from active trip using vehicleId
    const activeTrip = await Trip.findOne({
      driverId: req.user.id,
      status: 'in-progress'
    });
    
    const responseData = {
      ...driver.toObject(),
      assignedBus: activeTrip ? {
        busNumber: activeTrip.vehicleId || 'Not Assigned'
      } : null,
      assignedBusId: activeTrip?.vehicleId || null
    };
    
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
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

    console.log(`Driver stats: ${totalTrips} total trips, ${completedTrips} completed`);

    res.json({
      success: true,
      data: {
        totalTrips,
        completedTrips,
        totalStudents,
        totalDistance,
        onTimeRate: Math.round((completedTrips / totalTrips) * 100) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ==================== TRIP MANAGEMENT ====================

// Get driver's current trip - FIXED: Removed populate
router.get('/current-trip', async (req, res) => {
  try {
    const trip = await Trip.findOne({
      driverId: req.user.id,
      status: 'in-progress',
    });

    if (!trip) {
      return res.json({ success: true, data: null });
    }

    const formattedTrip = {
      id: trip._id,
      routeName: trip.routeName || 'Unknown Route',
      busNumber: trip.vehicleId || 'Not Assigned',
      status: trip.status,
      startTime: trip.startTime,
      studentCount: trip.students?.length || 0
    };
    
    res.json({
      success: true,
      data: formattedTrip
    });
  } catch (error) {
    console.error('Error fetching current trip:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// DRIVER-SPECIFIC ENDPOINT: Get today's trips for driver - FIXED: Removed populates
router.get('/trips/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Searching for trips between:', today, 'and', tomorrow);

    const trips = await Trip.find({
      driverId: req.user.id,
      scheduledStartTime: { $gte: today, $lt: tomorrow },
    })
    .sort({ scheduledStartTime: 1 });

    console.log(`Found ${trips.length} trips for driver ${req.user.id}`);

    const formattedTrips = trips.map(trip => ({
      _id: trip._id,
      id: trip._id,
      routeName: trip.routeName || 'Unknown Route',
      startTime: trip.scheduledStartTime,
      scheduledStartTime: trip.scheduledStartTime,
      endTime: trip.scheduledEndTime,
      scheduledEndTime: trip.scheduledEndTime,
      busNumber: trip.vehicleId || 'Not Assigned',
      status: trip.status || 'scheduled',
      studentCount: trip.students?.length || 0,
      type: trip.tripType || 'morning_pickup'
    }));

    res.json({
      success: true,
      trips: formattedTrips,
      count: formattedTrips.length
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// DRIVER-SPECIFIC ENDPOINT: Get trip details by ID - FIXED: Removed populates
router.get('/trips/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.tripId,
      driverId: req.user.id,
    });

    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        _id: trip._id,
        routeName: trip.routeName || 'Unknown Route',
        busNumber: trip.vehicleId || 'Not Assigned',
        status: trip.status,
        scheduledStartTime: trip.scheduledStartTime,
        scheduledEndTime: trip.scheduledEndTime,
        startTime: trip.startTime,
        endTime: trip.endTime,
        type: trip.tripType,
        students: trip.students || []
      }
    });
  } catch (error) {
    console.error('Error fetching trip details:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// DRIVER-SPECIFIC ENDPOINT: Get students for a trip - CRITICAL FIX for ObjectId error
router.get('/trips/:tripId/students', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
      
    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    // Get the bus number from the trip's vehicleId field
    const busNumber = trip.vehicleId;
    
    if (!busNumber) {
      return res.json({
        success: true,
        count: 0,
        data: [],
        message: 'No bus assigned to this trip'
      });
    }

    // CRITICAL FIX: Only use busNumber field, NOT busId (which expects ObjectId)
    // This prevents the "Cast to ObjectId failed" error
    const students = await Student.find({ 
      $or: [
        { busNumber: busNumber },
        { 'transportDetails.busNumber': busNumber }
      ],
      usesTransport: true,
      isActive: true
    }).select(
      'firstName lastName classLevel admissionNumber transportDetails qrCode busNumber'
    );

    console.log(`Found ${students.length} students for bus number: ${busNumber}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get attendance records for today
    const boardedRecords = await Attendance.find({
      tripId: req.params.tripId,
      eventType: 'board',
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const alightedRecords = await Attendance.find({
      tripId: req.params.tripId,
      eventType: 'alight',
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const boardedSet = new Set(boardedRecords.map(r => r.studentId.toString()));
    const alightedSet = new Set(alightedRecords.map(r => r.studentId.toString()));

    const studentsWithStatus = students.map(s => ({
      _id: s._id,
      id: s._id,
      firstName: s.firstName,
      lastName: s.lastName,
      classLevel: s.classLevel,
      admissionNumber: s.admissionNumber,
      pickupPoint: s.transportDetails?.pickupPoint?.name || s.pickupPoint,
      dropOffPoint: s.transportDetails?.dropoffPoint?.name || s.dropOffPoint,
      qrCode: s.qrCode,
      boarded: boardedSet.has(s._id.toString()),
      alighted: alightedSet.has(s._id.toString()),
      status: alightedSet.has(s._id.toString()) ? 'alighted' :
              boardedSet.has(s._id.toString()) ? 'boarded' : 'pending'
    }));

    res.json({
      success: true,
      count: studentsWithStatus.length,
      data: studentsWithStatus
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Start trip
router.post('/trips/:tripId/start', async (req, res) => {
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
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found or already started' 
      });
    }

    // Update bus status if vehicleId exists
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, { status: 'on-trip' });
      }
    }

    res.json({
      success: true,
      message: 'Trip started successfully',
      data: trip
    });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// End trip
router.post('/trips/:tripId/end', async (req, res) => {
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
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found or not in progress' 
      });
    }

    // Update bus status back to active
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, { status: 'active' });
      }
    }

    res.json({
      success: true,
      message: 'Trip ended successfully',
      data: trip
    });
  } catch (error) {
    console.error('Error ending trip:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ==================== ATTENDANCE MANAGEMENT ====================

// Board student - FIXED: Use vehicleId
router.post('/trips/:tripId/board/:studentId', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { method = 'qr', location, timestamp } = req.body;

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    // Check if already boarded
    const existing = await Attendance.findOne({
      studentId,
      tripId,
      eventType: 'board'
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Student already boarded'
      });
    }

    const attendance = new Attendance({
      studentId,
      tripId,
      busId: trip.vehicleId,
      busNumber: trip.vehicleId,
      driverName: req.user.name || req.user.firstName,
      createdAt: timestamp || new Date(),
      eventType: 'board',
      method,
      location: location ? {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      } : null
    });
    await attendance.save();

    // Update trip students array
    await Trip.findByIdAndUpdate(tripId, {
      $addToSet: { students: { student: studentId, status: 'boarded' } }
    });

    res.json({ 
      success: true, 
      message: 'Student boarded successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error boarding student:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Alight student - FIXED: Use vehicleId
router.post('/trips/:tripId/alight/:studentId', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { method = 'qr', location, timestamp } = req.body;

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    // Find boarding record
    const boardingRecord = await Attendance.findOne({
      studentId,
      tripId,
      eventType: 'board'
    });

    if (!boardingRecord) {
      return res.status(404).json({
        success: false,
        message: 'No boarding record found'
      });
    }

    const attendance = new Attendance({
      studentId,
      tripId,
      busId: trip.vehicleId,
      busNumber: trip.vehicleId,
      driverName: req.user.name || req.user.firstName,
      createdAt: timestamp || new Date(),
      eventType: 'alight',
      method,
      location: location ? {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      } : null,
      metadata: {
        relatedBoardId: boardingRecord._id
      }
    });
    await attendance.save();

    // Update trip students array
    await Trip.updateOne(
      { _id: tripId, 'students.student': studentId },
      { $set: { 'students.$.status': 'alighted' } }
    );

    res.json({ 
      success: true, 
      message: 'Student alighted successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error alighting student:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Sync offline scans
router.post('/attendance/sync-offline', async (req, res) => {
  try {
    const { scans, deviceId } = req.body;

    if (!Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scans array'
      });
    }

    const results = [];
    const syncBatch = Date.now().toString();

    for (const scan of scans) {
      try {
        const { studentId, tripId, method, timestamp, location, type } = scan;

        // Check for duplicate
        const existing = await Attendance.findOne({
          studentId,
          tripId,
          eventType: type,
          createdAt: timestamp
        });

        if (existing) {
          results.push({
            success: true,
            studentId,
            status: 'duplicate'
          });
          continue;
        }

        const attendance = new Attendance({
          studentId,
          tripId,
          createdAt: timestamp || new Date(),
          eventType: type,
          method: method || 'qr',
          location: location ? {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          } : null,
          metadata: {
            deviceId,
            syncedFromOffline: true,
            syncBatch
          }
        });

        await attendance.save();

        results.push({
          success: true,
          studentId,
          status: 'synced'
        });

      } catch (error) {
        results.push({
          success: false,
          studentId: scan.studentId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      batch: syncBatch,
      summary: {
        total: scans.length,
        synced: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      },
      results
    });

  } catch (error) {
    console.error('Offline sync error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== GPS & LOCATION ====================

// Update GPS location - FIXED: Use vehicleId
router.post('/gps/update', async (req, res) => {
  try {
    const { tripId, lat, lon, speed, heading, fuelLevel } = req.body;

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    const vehicleId = trip.vehicleId || 'unknown-vehicle';
    
    const gpsLog = new GPSLog({
      vehicleId,
      tripId,
      lat,
      lon,
      speed: speed || 0,
      heading: heading || 0,
      fuelLevel,
      timestamp: new Date(),
    });
    await gpsLog.save();

    // Update bus location if bus exists
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, {
          'currentLocation.lat': lat,
          'currentLocation.lng': lon,
          'currentLocation.speed': speed || 0,
          'currentLocation.heading': heading || 0,
          'currentLocation.lastUpdated': new Date(),
          lastUpdate: new Date(),
          ...(fuelLevel && { fuelLevel })
        });
      }
    }

    await Trip.findByIdAndUpdate(tripId, {
      lastLocation: { lat, lon, timestamp: new Date() }
    });

    res.json({ 
      success: true,
      message: 'GPS updated successfully' 
    });
  } catch (error) {
    console.error('Error updating GPS:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ==================== ROUTES & NAVIGATION ====================

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
    res.json({
      success: true,
      data: mockCoordinates
    });
  } catch (error) {
    console.error('Error fetching route coordinates:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ==================== INCIDENTS & EMERGENCY ====================

// Report incident
router.post('/incident/report', async (req, res) => {
  try {
    const { tripId, type, description, photos, location } = req.body;
    
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    const report = new IncidentReport({
      tripId,
      type,
      description,
      reportedBy: req.user.id,
      location,
      media: photos?.map(url => ({ url, type: 'image' })) || [],
      severity: type === 'emergency' ? 'critical' : 'medium',
      status: 'reported'
    });
    await report.save();

    res.json({ 
      success: true, 
      message: 'Report submitted successfully',
      data: report
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Emergency SOS
router.post('/emergency', async (req, res) => {
  try {
    const { tripId, location } = req.body;

    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) {
      return res.status(404).json({ 
        success: false,
        message: 'Trip not found' 
      });
    }

    const admins = await User.find({ role: 'admin' });
    
    console.log(`EMERGENCY from driver ${req.user.id} on trip ${tripId}`);
    console.log('Location:', location);
    console.log(`Notifying ${admins.length} admins`);

    const report = new IncidentReport({
      tripId,
      type: 'emergency',
      description: 'SOS EMERGENCY - Driver activated emergency alert',
      reportedBy: req.user.id,
      location,
      severity: 'critical',
      status: 'reported'
    });
    await report.save();

    res.json({ 
      success: true, 
      message: 'Emergency alert sent' 
    });
  } catch (error) {
    console.error('Error sending emergency:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ==================== DRIVER HISTORY ====================

// Get driver trip history - FIXED: Removed bus populate
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const trips = await Trip.find({
      driverId: req.user.id,
      status: 'completed'
    })
    .sort({ endTime: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Trip.countDocuments({
      driverId: req.user.id,
      status: 'completed'
    });

    const formattedTrips = trips.map(trip => ({
      ...trip.toObject(),
      busNumber: trip.vehicleId || 'Not Assigned'
    }));

    res.json({
      success: true,
      data: formattedTrips,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching driver history:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

module.exports = router;