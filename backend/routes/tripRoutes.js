const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const User = require('../models/User');
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

    // Find the bus by vehicleId
    const bus = await Bus.findOne({ busNumber: trip.vehicleId });
    
    res.json({
      success: true,
      data: {
        tripId: trip._id,
        tripName: trip.routeName,
        assignedBus: bus || null,
        busNumber: trip.vehicleId || null,
        hasBus: !!trip.vehicleId
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
 * @desc    Assign a bus to a trip
 * @access  Private (Admin only)
 */
router.put('/:tripId/assign-bus/:busId', isAdmin, async (req, res) => {
  try {
    const { tripId, busId } = req.params;

    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }

    // Check if bus exists and is active
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

    // Check if bus is already assigned to another active trip
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

    // Update trip with bus assignment
    trip.vehicleId = bus.busNumber;
    await trip.save();

    console.log(`✅ Bus ${bus.busNumber} assigned to trip ${trip.routeName}`);

    // Return populated trip
    const updatedTrip = await Trip.findById(tripId)
      .populate('driverId', 'firstName lastName email phone');

    res.json({
      success: true,
      message: `Bus ${bus.busNumber} assigned to trip successfully`,
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

    // Remove bus assignment
    trip.vehicleId = '';
    await trip.save();

    console.log(`✅ Bus unassigned from trip ${trip.routeName} (was ${oldBusNumber})`);

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
    // Get all active buses
    const buses = await Bus.find({ 
      status: { $ne: 'maintenance' },
      isActive: { $ne: false }
    });

    // Get bus numbers assigned to active trips
    const assignedBusNumbers = await Trip.distinct('vehicleId', {
      status: { $in: ['scheduled', 'running'] },
      vehicleId: { $exists: true, $ne: '' }
    });

    // Filter out buses that are already assigned
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

        trip.vehicleId = bus.busNumber;
        await trip.save();

        results.successful.push({
          tripId,
          tripName: trip.routeName,
          busId,
          busNumber: bus.busNumber
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

// ==================== MAIN TRIP ENDPOINTS ====================

// Get all trips - FIXED to match schema
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('driverId', 'firstName lastName email phone')
      .sort({ createdAt: -1 });
    
    // Transform to include bus info if needed
    const transformedTrips = trips.map(trip => ({
      ...trip.toObject(),
      busNumber: trip.vehicleId
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

// Get active trips - FIXED to match schema
router.get('/active', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      status: { $in: ['scheduled', 'running'] } 
    })
    .populate('driverId', 'firstName lastName email phone')
    .sort({ scheduledStartTime: 1 });
    
    const transformedTrips = trips.map(trip => ({
      ...trip.toObject(),
      busNumber: trip.vehicleId
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

// Get single trip - FIXED
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('driverId', 'firstName lastName email phone');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    const transformedTrip = {
      ...trip.toObject(),
      busNumber: trip.vehicleId
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

// Create trip - FIXED to match schema
router.post('/', isAdmin, async (req, res) => {
  try {
    const { routeName, vehicleId, driverId, tripType, scheduledStartTime, scheduledEndTime, status } = req.body;
    
    const tripData = {
      routeName,
      vehicleId: vehicleId || '',
      driverId,
      tripType: tripType || 'morning',
      scheduledStartTime: scheduledStartTime || new Date(),
      scheduledEndTime: scheduledEndTime || null,
      status: status || 'scheduled'
    };
    
    // Validate required fields
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
      .populate('driverId', 'firstName lastName email phone');
    
    res.status(201).json({
      success: true,
      data: {
        ...populatedTrip.toObject(),
        busNumber: populatedTrip.vehicleId
      },
      message: 'Trip created successfully'
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Update trip - FIXED
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('driverId', 'firstName lastName email phone');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        ...trip.toObject(),
        busNumber: trip.vehicleId
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

// Start trip - FIXED
router.patch('/:id/start', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'running',
        startTime: new Date()
      },
      { new: true }
    ).populate('driverId', 'firstName lastName email phone');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    // Update bus status if vehicleId exists
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, { 
          status: 'on-trip',
          currentTripId: trip._id
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        ...trip.toObject(),
        busNumber: trip.vehicleId
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

// Complete trip - FIXED
router.patch('/:id/complete', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'completed',
        endTime: new Date()
      },
      { new: true }
    ).populate('driverId', 'firstName lastName email phone');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    // Update bus status back to active
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, { 
          status: 'active',
          currentTripId: null
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        ...trip.toObject(),
        busNumber: trip.vehicleId
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

// Cancel trip - FIXED
router.patch('/:id/cancel', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'cancelled',
        endTime: new Date()
      },
      { new: true }
    ).populate('driverId', 'firstName lastName email phone');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    // Update bus status back to active if it was assigned
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, { 
          status: 'active',
          currentTripId: null
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        ...trip.toObject(),
        busNumber: trip.vehicleId
      },
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

// Get trips by bus/vehicle - FIXED
router.get('/bus/:busNumber', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      vehicleId: req.params.busNumber,
      status: { $in: ['scheduled', 'running'] }
    })
    .populate('driverId', 'firstName lastName email phone')
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

// Get trips by driver - FIXED
router.get('/driver/:driverId', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      driverId: req.params.driverId,
      scheduledStartTime: { $gte: new Date() }
    })
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

// Get today's trips - FIXED
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

// Delete trip - FIXED
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    // Don't allow deleting running trips
    if (trip.status === 'running') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete a running trip. Cancel it first.' 
      });
    }
    
    // Free up the bus if it was assigned
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, { 
          currentTripId: null,
          status: 'active'
        });
      }
    }
    
    await trip.deleteOne();
    
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