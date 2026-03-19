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
    const trip = await Trip.findById(req.params.tripId)
      .populate('busId', 'busNumber registrationNumber capacity status currentLocation');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }

    res.json({
      success: true,
      data: {
        tripId: trip._id,
        tripName: trip.routeName || trip.name,
        assignedBus: trip.busId || null,
        busNumber: trip.busNumber || null,
        hasBus: !!(trip.busId || trip.busNumber)
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
      busId: busId,
      status: { $in: ['scheduled', 'running', 'in-progress'] }
    });

    if (existingAssignment) {
      return res.status(409).json({ 
        success: false, 
        message: `Bus ${bus.busNumber} is already assigned to another active trip` 
      });
    }

    // Update trip with bus assignment
    trip.busId = busId;
    trip.busNumber = bus.busNumber;
    
    await trip.save();

    console.log(`✅ Bus ${bus.busNumber} assigned to trip ${trip.routeName || trip._id}`);

    // Return populated trip
    const updatedTrip = await Trip.findById(tripId)
      .populate('busId', 'busNumber registrationNumber capacity status')
      .populate('driverId', 'name email phone');

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

    const oldBusNumber = trip.busNumber;

    // Remove bus assignment
    trip.busId = null;
    trip.busNumber = null;
    
    await trip.save();

    console.log(`✅ Bus unassigned from trip ${trip.routeName || trip._id} (was ${oldBusNumber})`);

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
        { busId: { $exists: false } },
        { busId: null },
        { busNumber: { $exists: false } },
        { busNumber: null },
        { busNumber: 'N/A' }
      ]
    }).select('routeName name scheduledStartTime status');

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
 * @desc    Get all buses available for assignment (not in maintenance and not assigned to active trips)
 * @access  Private (Admin only)
 */
router.get('/available-buses/list', isAdmin, async (req, res) => {
  try {
    // Get all active buses
    const buses = await Bus.find({ 
      status: { $ne: 'maintenance' },
      isActive: { $ne: false }
    });

    // Get IDs of buses assigned to active trips
    const assignedBusIds = await Trip.distinct('busId', {
      status: { $in: ['scheduled', 'running', 'in-progress'] },
      busId: { $exists: true, $ne: null }
    });

    // Filter out buses that are already assigned
    const availableBuses = buses.filter(bus => 
      !assignedBusIds.some(id => id && id.toString() === bus._id.toString())
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
 * @desc    Bulk assign buses to multiple trips (for initial setup)
 * @access  Private (Admin only)
 */
router.post('/bulk-assign', isAdmin, async (req, res) => {
  try {
    const { assignments } = req.body; // Array of { tripId, busId }

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

        // Check if trip exists
        const trip = await Trip.findById(tripId);
        if (!trip) {
          results.failed.push({ tripId, busId, reason: 'Trip not found' });
          continue;
        }

        // Check if bus exists
        const bus = await Bus.findById(busId);
        if (!bus) {
          results.failed.push({ tripId, busId, reason: 'Bus not found' });
          continue;
        }

        // Update trip
        trip.busId = busId;
        trip.busNumber = bus.busNumber;
        await trip.save();

        results.successful.push({
          tripId,
          tripName: trip.routeName || trip.name,
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

// ==================== EXISTING TRIP ENDPOINTS (with bus population added) ====================

// Get all trips - with bus population
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('driverId', 'name email phone')
      .populate('busId', 'busNumber registrationNumber capacity status')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get active trips
router.get('/active', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      status: { $in: ['running', 'scheduled', 'in-progress'] } 
    })
    .populate('driverId', 'name email phone')
    .populate('busId', 'busNumber registrationNumber capacity status')
    .sort({ scheduledStartTime: 1 });
    
    res.json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    console.error('Error fetching active trips:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get single trip
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('driverId', 'name email phone')
      .populate('busId', 'busNumber registrationNumber capacity status currentLocation');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create trip
router.post('/', isAdmin, async (req, res) => {
  try {
    const tripData = req.body;
    
    // If busId is provided, also set busNumber
    if (tripData.busId) {
      const bus = await Bus.findById(tripData.busId);
      if (bus) {
        tripData.busNumber = bus.busNumber;
      }
    }
    
    const trip = new Trip(tripData);
    const newTrip = await trip.save();
    
    res.status(201).json({
      success: true,
      data: newTrip,
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

// Update trip
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const updateData = req.body;
    
    // If busId is being updated, also update busNumber
    if (updateData.busId) {
      const bus = await Bus.findById(updateData.busId);
      if (bus) {
        updateData.busNumber = bus.busNumber;
      }
    }
    
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('busId', 'busNumber registrationNumber');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    res.json({
      success: true,
      data: trip,
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

// Start trip
router.patch('/:id/start', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'running',
        startTime: new Date()
      },
      { new: true }
    ).populate('busId', 'busNumber');
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    // Update bus status if trip has a bus
    if (trip.busId) {
      await Bus.findByIdAndUpdate(trip.busId, { 
        status: 'on-trip',
        currentTripId: trip._id
      });
    }
    
    res.json({
      success: true,
      data: trip,
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

// Complete trip
router.patch('/:id/complete', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'completed',
        endTime: new Date()
      },
      { new: true }
    );
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    // Update bus status back to active
    if (trip.busId) {
      await Bus.findByIdAndUpdate(trip.busId, { 
        status: 'active',
        currentTripId: null
      });
    }
    
    res.json({
      success: true,
      data: trip,
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

// Cancel trip
router.patch('/:id/cancel', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'cancelled',
        endTime: new Date()
      },
      { new: true }
    );
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
      });
    }
    
    // Update bus status back to active if it was assigned
    if (trip.busId) {
      await Bus.findByIdAndUpdate(trip.busId, { 
        status: 'active',
        currentTripId: null
      });
    }
    
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

// Get trips by bus/vehicle
router.get('/bus/:busId', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      busId: req.params.busId,
      status: { $in: ['scheduled', 'running', 'in-progress'] }
    })
    .populate('driverId', 'name email phone')
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

// Get trips by driver
router.get('/driver/:driverId', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      driverId: req.params.driverId,
      scheduledStartTime: { $gte: new Date() }
    })
    .populate('busId', 'busNumber')
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

// Get today's trips
router.get('/today/all', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const trips = await Trip.find({
      scheduledStartTime: { $gte: today, $lt: tomorrow }
    })
    .populate('driverId', 'name email phone')
    .populate('busId', 'busNumber')
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

// Delete trip
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
    if (trip.status === 'running' || trip.status === 'in-progress') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete a running trip. Cancel it first.' 
      });
    }
    
    // Free up the bus if it was assigned
    if (trip.busId) {
      await Bus.findByIdAndUpdate(trip.busId, { 
        currentTripId: null,
        status: 'active'
      });
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