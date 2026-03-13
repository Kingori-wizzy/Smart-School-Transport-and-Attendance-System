const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Get all trips - FIXED for your schema
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('driverId', 'name email phone') // Populate driver info
      .sort({ createdAt: -1 });
    
    // Transform the response to include vehicle info if needed
    const transformedTrips = trips.map(trip => ({
      ...trip.toObject(),
      // You can add bus lookup here if you have a Bus model with vehicleId
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

// Get active trips
router.get('/active', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      status: { $in: ['running', 'scheduled'] } 
    })
    .populate('driverId', 'name email phone')
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
      .populate('driverId', 'name email phone');
    
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
router.post('/', async (req, res) => {
  try {
    const trip = new Trip(req.body);
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
router.put('/:id', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
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
    );
    
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        message: 'Trip not found' 
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

// Get trips by vehicle
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const trips = await Trip.find({ 
      vehicleId: req.params.vehicleId,
      status: { $in: ['scheduled', 'running'] }
    })
    .populate('driverId', 'name email phone')
    .sort({ scheduledStartTime: -1 });
    
    res.json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (error) {
    console.error('Error fetching vehicle trips:', error);
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
router.delete('/:id', async (req, res) => {
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