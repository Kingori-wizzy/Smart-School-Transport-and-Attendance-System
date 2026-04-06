const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const User = require('../models/User');
const Student = require('../models/Student');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin, isAdminOrDriver } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// ==================== TRIP-BUS ASSIGNMENT ENDPOINTS ====================

/**
 * @route   GET /api/trips/:tripId/bus
 * @desc    Get bus assigned to a specific trip
 * @access  Private (Admin/Driver)
 */
router.get('/:tripId/bus', isAdminOrDriver, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }

    const bus = await Bus.findOne({ busNumber: trip.vehicleId });
    
    res.json({
      success: true,
      data: {
        tripId: trip._id,
        tripName: trip.routeName,
        assignedBus: bus || null,
        busNumber: trip.vehicleId || null,
        hasBus: !!trip.vehicleId,
        studentsCount: trip.students ? trip.students.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching trip bus:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PUT /api/trips/:tripId/assign-bus/:busId
 * @desc    Assign a bus to a trip and auto-populate students
 * @access  Private (Admin only)
 */
router.put('/:tripId/assign-bus/:busId', isAdmin, async (req, res) => {
  try {
    const { tripId, busId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }

    if (bus.status === 'maintenance') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot assign bus in maintenance mode' 
      });
    }

    const existingAssignment = await Trip.findOne({
      _id: { $ne: tripId },
      vehicleId: bus.busNumber,
      status: { $in: ['scheduled', 'running'] }
    });

    if (existingAssignment) {
      return res.status(409).json({ 
        success: false, 
        message: `Bus ${bus.busNumber} is already assigned to another active trip` 
      });
    }

    const students = await Student.find({ 
      $or: [
        { 'transportDetails.busId': bus._id },
        { busId: bus._id }
      ],
      usesTransport: true,
      isActive: true
    });
    
    const studentIds = students.map(s => s._id);

    trip.vehicleId = bus.busNumber;
    trip.students = studentIds;
    trip.attendance = [];
    await trip.save();

    console.log(`Bus ${bus.busNumber} assigned to trip ${trip.routeName} with ${studentIds.length} students`);

    const updatedTrip = await Trip.findById(tripId)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber qrCode');

    res.json({
      success: true,
      message: `Bus ${bus.busNumber} assigned to trip with ${studentIds.length} students`,
      data: updatedTrip
    });

  } catch (error) {
    console.error('Error assigning bus to trip:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   DELETE /api/trips/:tripId/unassign-bus
 * @desc    Remove bus assignment from a trip
 * @access  Private (Admin only)
 */
router.delete('/:tripId/unassign-bus', isAdmin, async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }

    const oldBusNumber = trip.vehicleId;

    trip.vehicleId = '';
    trip.students = [];
    trip.attendance = [];
    await trip.save();

    console.log(`Bus unassigned from trip ${trip.routeName} (was ${oldBusNumber})`);

    res.json({
      success: true,
      message: 'Bus unassigned from trip successfully',
      data: trip
    });

  } catch (error) {
    console.error('Error unassigning bus from trip:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/trips/unassigned
 * @desc    Get all trips without bus assignments
 * @access  Private (Admin only)
 */
router.get('/unassigned/list', isAdmin, async (req, res) => {
  try {
    const trips = await Trip.find({
      $or: [
        { vehicleId: { $exists: false } },
        { vehicleId: null },
        { vehicleId: '' }
      ]
    }).select('routeName scheduledStartTime status');

    res.json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    console.error('Error fetching unassigned trips:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/trips/available-buses
 * @desc    Get all buses available for assignment
 * @access  Private (Admin only)
 */
router.get('/available-buses/list', isAdmin, async (req, res) => {
  try {
    const buses = await Bus.find({ 
      status: { $ne: 'maintenance' },
      isActive: { $ne: false }
    });

    const assignedBusNumbers = await Trip.distinct('vehicleId', {
      status: { $in: ['scheduled', 'running'] },
      vehicleId: { $exists: true, $ne: '' }
    });

    const availableBuses = buses.filter(bus => 
      !assignedBusNumbers.includes(bus.busNumber)
    );

    res.json({
      success: true,
      count: availableBuses.length,
      data: availableBuses
    });
  } catch (error) {
    console.error('Error fetching available buses:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/trips/bulk-assign
 * @desc    Bulk assign buses to multiple trips
 * @access  Private (Admin only)
 */
router.post('/bulk-assign', isAdmin, async (req, res) => {
  try {
    const { assignments } = req.body;

    if (!Array.isArray(assignments)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Assignments must be an array' 
      });
    }

    const results = {
      successful: [],
      failed: []
    };

    for (const item of assignments) {
      try {
        const { tripId, busId } = item;

        const trip = await Trip.findById(tripId);
        if (!trip) {
          results.failed.push({ tripId, busId, reason: 'Trip not found' });
          continue;
        }

        const bus = await Bus.findById(busId);
        if (!bus) {
          results.failed.push({ tripId, busId, reason: 'Bus not found' });
          continue;
        }

        const students = await Student.find({ 
          $or: [
            { 'transportDetails.busId': bus._id },
            { busId: bus._id }
          ],
          usesTransport: true
        });

        trip.vehicleId = bus.busNumber;
        trip.students = students.map(s => s._id);
        trip.attendance = [];
        await trip.save();

        results.successful.push({
          tripId,
          tripName: trip.routeName,
          busId,
          busNumber: bus.busNumber,
          studentsCount: students.length
        });

      } catch (error) {
        results.failed.push({ 
          tripId: item.tripId, 
          busId: item.busId, 
          reason: error.message 
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      results
    });

  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== DRIVER APP ENDPOINTS ====================

/**
 * @route   GET /api/trips/current
 * @desc    Get current active trip for the logged-in driver
 * @access  Private (Driver only)
 */
router.get('/current', async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Driver only.' 
      });
    }

    const currentTrip = await Trip.findOne({
      driverId: req.user.id,
      status: { $in: ['scheduled', 'running'] }
    }).populate('students', 'firstName lastName admissionNumber qrCode');

    if (!currentTrip) {
      return res.json({ 
        success: true, 
        data: null, 
        message: 'No active trip found' 
      });
    }

    const tripData = {
      _id: currentTrip._id,
      routeName: currentTrip.routeName,
      vehicleId: currentTrip.vehicleId,
      status: currentTrip.status,
      startTime: currentTrip.startTime,
      scheduledStartTime: currentTrip.scheduledStartTime,
      studentCount: currentTrip.students?.length || 0,
      students: currentTrip.students || []
    };

    res.json({
      success: true,
      data: tripData
    });
  } catch (error) {
    console.error('Error fetching current trip:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/trips/driver/today
 * @desc    Get today's trips for the logged-in driver with students
 * @access  Private (Driver only)
 */
router.get('/driver/today', async (req, res) => {
  try {
    const driverId = req.user.id;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const trips = await Trip.find({
      driverId: driverId,
      scheduledStartTime: { $gte: today, $lt: tomorrow }
    })
    .populate('students', 'firstName lastName admissionNumber qrCode classLevel')
    .populate('driverId', 'firstName lastName email phone')
    .sort({ scheduledStartTime: 1 });
    
    const tripsWithDetails = await Promise.all(trips.map(async (trip) => {
      const tripObj = trip.toObject();
      
      if (trip.vehicleId) {
        const bus = await Bus.findOne({ busNumber: trip.vehicleId });
        if (bus) {
          tripObj.busDetails = {
            busNumber: bus.busNumber,
            driverName: bus.driverName,
            capacity: bus.capacity,
            currentLocation: bus.currentLocation,
            fuelLevel: bus.fuelLevel
          };
        }
      }
      
      tripObj.statistics = {
        totalStudents: trip.students ? trip.students.length : 0,
        boardedCount: trip.attendance ? trip.attendance.filter(a => a.type === 'board').length : 0,
        alightedCount: trip.attendance ? trip.attendance.filter(a => a.type === 'alight').length : 0
      };
      
      return tripObj;
    }));
    
    res.json({
      success: true,
      count: trips.length,
      data: tripsWithDetails
    });
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/trips/:id/with-students
 * @desc    Get a single trip with full student details
 * @access  Private (Driver/Admin)
 */
router.get('/:id/with-students', isAdminOrDriver, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('students', 'firstName lastName admissionNumber qrCode classLevel parentId')
      .populate('driverId', 'firstName lastName email phone')
      .populate('attendance.studentId', 'firstName lastName admissionNumber');
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    const bus = await Bus.findOne({ busNumber: trip.vehicleId });
    
    const result = trip.toObject();
    if (bus) {
      result.busDetails = {
        busNumber: bus.busNumber,
        driverName: bus.driverName,
        capacity: bus.capacity
      };
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching trip with students:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/trips/:id/record-attendance
 * @desc    Record student attendance (board/alight)
 * @access  Private (Driver only)
 */
router.post('/:id/record-attendance', async (req, res) => {
  try {
    const { studentId, type, location } = req.body;
    const tripId = req.params.id;
    
    if (!studentId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and attendance type are required'
      });
    }
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    if (!trip.students.some(s => s.toString() === studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student not assigned to this trip'
      });
    }
    
    const existingAttendance = trip.attendance.find(a => 
      a.studentId.toString() === studentId && a.type === type
    );
    
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: `Student already marked as ${type === 'board' ? 'boarded' : 'alighted'}`
      });
    }
    
    trip.attendance.push({
      studentId,
      scannedAt: new Date(),
      type,
      scannedBy: req.user.id,
      location: location || null
    });
    
    await trip.save();
    
    res.json({
      success: true,
      message: `Student ${type === 'board' ? 'boarded' : 'alighted'} successfully`,
      data: {
        studentId,
        type,
        scannedAt: new Date(),
        tripStatus: trip.status
      }
    });
    
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== MAIN TRIP ENDPOINTS ====================

// GET all trips
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber')
      .sort({ createdAt: -1 });
    
    const transformedTrips = trips.map(trip => ({
      ...trip.toObject(),
      busNumber: trip.vehicleId,
      studentsCount: trip.students ? trip.students.length : 0
    }));
    
    res.json({
      success: true,
      count: trips.length,
      data: transformedTrips
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET active trips (scheduled or running)
router.get('/active', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      status: { $in: ['scheduled', 'running'] } 
    })
    .populate('driverId', 'firstName lastName email phone')
    .populate('students', 'firstName lastName admissionNumber')
    .sort({ scheduledStartTime: 1 });
    
    const transformedTrips = trips.map(trip => ({
      ...trip.toObject(),
      busNumber: trip.vehicleId,
      studentsCount: trip.students ? trip.students.length : 0
    }));
    
    res.json({
      success: true,
      count: trips.length,
      data: transformedTrips
    });
  } catch (error) {
    console.error('Error fetching active trips:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET single trip by ID
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber qrCode classLevel')
      .populate('attendance.studentId', 'firstName lastName admissionNumber');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    const transformedTrip = {
      ...trip.toObject(),
      busNumber: trip.vehicleId,
      studentsCount: trip.students ? trip.students.length : 0
    };
    
    res.json({
      success: true,
      data: transformedTrip
    });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// CREATE trip - status defaults to 'scheduled'
router.post('/', isAdmin, async (req, res) => {
  try {
    const { routeName, vehicleId, driverId, tripType, scheduledStartTime, scheduledEndTime, status } = req.body;
    
    let studentIds = [];
    if (vehicleId) {
      const bus = await Bus.findOne({ busNumber: vehicleId });
      if (bus) {
        const students = await Student.find({ 
          $or: [
            { 'transportDetails.busId': bus._id },
            { busId: bus._id }
          ],
          usesTransport: true,
          isActive: true
        });
        studentIds = students.map(s => s._id);
        console.log(`Found ${studentIds.length} students for bus ${vehicleId}`);
      }
    }
    
    const tripData = {
      routeName,
      vehicleId: vehicleId || '',
      driverId,
      tripType: tripType || 'morning',
      scheduledStartTime: scheduledStartTime || new Date(),
      scheduledEndTime: scheduledEndTime || null,
      status: status || 'scheduled',
      students: studentIds,
      attendance: []
    };
    
    if (!tripData.routeName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Route name is required' 
      });
    }
    if (!tripData.driverId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Driver is required' 
      });
    }
    
    const trip = new Trip(tripData);
    const newTrip = await trip.save();
    
    const populatedTrip = await Trip.findById(newTrip._id)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber');
    
    console.log(`Trip created: ${tripData.routeName} with status: ${tripData.status}, ${studentIds.length} students`);
    
    res.status(201).json({
      success: true,
      data: {
        ...populatedTrip.toObject(),
        busNumber: populatedTrip.vehicleId,
        studentsCount: populatedTrip.students ? populatedTrip.students.length : 0
      },
      message: `Trip created successfully with status: ${tripData.status}`
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// UPDATE trip - preserves status unless explicitly changed
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    if (updateData.vehicleId && updateData.vehicleId !== req.body.oldVehicleId) {
      const bus = await Bus.findOne({ busNumber: updateData.vehicleId });
      if (bus) {
        const students = await Student.find({ 
          $or: [
            { 'transportDetails.busId': bus._id },
            { busId: bus._id }
          ],
          usesTransport: true
        });
        updateData.students = students.map(s => s._id);
        updateData.attendance = [];
      }
    }
    
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('driverId', 'firstName lastName email phone')
    .populate('students', 'firstName lastName admissionNumber');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    console.log(`Trip updated: ${trip.routeName}, new status: ${trip.status}`);
    
    res.json({
      success: true,
      data: {
        ...trip.toObject(),
        busNumber: trip.vehicleId,
        studentsCount: trip.students ? trip.students.length : 0
      },
      message: 'Trip updated successfully'
    });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// START trip - changes status from 'scheduled' to 'running'
router.patch('/:id/start', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    if (trip.status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Trip is already running'
      });
    }
    
    if (trip.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot start a completed trip'
      });
    }
    
    if (trip.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot start a cancelled trip'
      });
    }
    
    if (!trip.vehicleId) {
      return res.status(400).json({
        success: false,
        message: 'No bus assigned to this trip'
      });
    }
    
    const oldStatus = trip.status;
    trip.status = 'running';
    trip.startTime = new Date();
    
    const scheduledStart = new Date(trip.scheduledStartTime);
    const now = new Date();
    if (now > scheduledStart) {
      trip.lateStart = true;
      const lateMinutes = Math.floor((now - scheduledStart) / 60000);
      if (trip.statistics) {
        trip.statistics.lateMinutes = lateMinutes;
      }
    }
    
    await trip.save();
    
    const bus = await Bus.findOne({ busNumber: trip.vehicleId });
    if (bus) {
      await Bus.findByIdAndUpdate(bus._id, { 
        status: 'on-trip',
        currentTripId: trip._id
      });
    }
    
    const populatedTrip = await Trip.findById(trip._id)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber');
    
    console.log(`Trip started: ${trip.routeName}, status changed from ${oldStatus} to running`);
    
    res.json({
      success: true,
      data: {
        ...populatedTrip.toObject(),
        busNumber: populatedTrip.vehicleId
      },
      message: 'Trip started successfully'
    });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// COMPLETE trip - changes status from 'running' to 'completed'
router.patch('/:id/complete', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    if (trip.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Trip is already completed'
      });
    }
    
    if (trip.status !== 'running') {
      return res.status(400).json({
        success: false,
        message: 'Only running trips can be completed'
      });
    }
    
    const oldStatus = trip.status;
    trip.status = 'completed';
    trip.endTime = new Date();
    await trip.save();
    
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, { 
          status: 'active',
          currentTripId: null
        });
      }
    }
    
    const populatedTrip = await Trip.findById(trip._id)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber');
    
    console.log(`Trip completed: ${trip.routeName}, status changed from ${oldStatus} to completed`);
    
    res.json({
      success: true,
      data: {
        ...populatedTrip.toObject(),
        busNumber: populatedTrip.vehicleId
      },
      message: 'Trip completed successfully'
    });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// CANCEL trip - changes status to 'cancelled'
router.patch('/:id/cancel', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    if (trip.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed trip'
      });
    }
    
    if (trip.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Trip is already cancelled'
      });
    }
    
    const oldStatus = trip.status;
    trip.status = 'cancelled';
    trip.endTime = new Date();
    await trip.save();
    
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus && bus.currentTripId?.toString() === trip._id.toString()) {
        await Bus.findByIdAndUpdate(bus._id, { 
          status: 'active',
          currentTripId: null
        });
      }
    }
    
    console.log(`Trip cancelled: ${trip.routeName}, status changed from ${oldStatus} to cancelled`);
    
    res.json({
      success: true,
      data: trip,
      message: 'Trip cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling trip:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET trips by bus number
router.get('/bus/:busNumber', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      vehicleId: req.params.busNumber,
      status: { $in: ['scheduled', 'running'] }
    })
    .populate('driverId', 'firstName lastName email phone')
    .populate('students', 'firstName lastName admissionNumber')
    .sort({ scheduledStartTime: -1 });
    
    res.json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    console.error('Error fetching bus trips:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET trips by driver ID
router.get('/driver/:driverId', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      driverId: req.params.driverId,
      scheduledStartTime: { $gte: new Date() }
    })
    .populate('students', 'firstName lastName admissionNumber')
    .sort({ scheduledStartTime: 1 });
    
    res.json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET today's all trips
router.get('/today/all', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const trips = await Trip.find({
      scheduledStartTime: { $gte: today, $lt: tomorrow }
    })
    .populate('driverId', 'firstName lastName email phone')
    .populate('students', 'firstName lastName admissionNumber')
    .sort({ scheduledStartTime: 1 });
    
    res.json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    console.error('Error fetching today\'s trips:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// GET trip statistics
router.get('/stats/summary', isAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = {
      totalTrips: await Trip.countDocuments(),
      runningTrips: await Trip.countDocuments({ status: 'running' }),
      scheduledTrips: await Trip.countDocuments({ status: 'scheduled' }),
      completedTrips: await Trip.countDocuments({ status: 'completed' }),
      cancelledTrips: await Trip.countDocuments({ status: 'cancelled' }),
      todayTrips: await Trip.countDocuments({
        scheduledStartTime: { $gte: today }
      }),
      totalStudentsAssigned: await Trip.aggregate([
        { $unwind: '$students' },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]),
      totalAttendanceRecords: await Trip.aggregate([
        { $unwind: '$attendance' },
        { $group: { _id: null, count: { $sum: 1 } } }
      ])
    };
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching trip stats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// DELETE trip
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    if (trip.status === 'running') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete a running trip. Cancel or complete it first.' 
      });
    }
    
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus && bus.currentTripId?.toString() === trip._id.toString()) {
        await Bus.findByIdAndUpdate(bus._id, { 
          currentTripId: null,
          status: 'active'
        });
      }
    }
    
    await trip.deleteOne();
    
    console.log(`Trip deleted: ${trip.routeName}`);
    
    res.json({
      success: true,
      message: 'Trip deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;