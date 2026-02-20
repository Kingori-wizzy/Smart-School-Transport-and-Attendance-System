const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');

// Get all trips
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find().populate('busId').populate('driverId');
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active trips
router.get('/active', async (req, res) => {
  try {
    const trips = await Trip.find({ status: 'in-progress' })
      .populate('busId')
      .populate('driverId');
    res.json(trips);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single trip
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('busId')
      .populate('driverId');
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }
    res.json(trip);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create trip
router.post('/', async (req, res) => {
  try {
    const trip = new Trip(req.body);
    const newTrip = await trip.save();
    
    if (trip.busId) {
      await Bus.findByIdAndUpdate(trip.busId, { status: 'on-trip' });
    }
    
    res.status(201).json(newTrip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// End trip
router.patch('/:id/end', async (req, res) => {
  try {
    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'completed',
        endTime: new Date()
      },
      { new: true }
    );
    
    if (trip.busId) {
      await Bus.findByIdAndUpdate(trip.busId, { status: 'active' });
    }
    
    res.json(trip);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;