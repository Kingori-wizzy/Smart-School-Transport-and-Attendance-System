const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');

// Get all buses
router.get('/', async (req, res) => {
  try {
    const buses = await Bus.find();
    res.json(buses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get active buses
router.get('/active', async (req, res) => {
  try {
    const buses = await Bus.find({ status: 'active' });
    res.json(buses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single bus
router.get('/:id', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    res.json(bus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create bus
router.post('/', async (req, res) => {
  try {
    const bus = new Bus(req.body);
    const newBus = await bus.save();
    res.status(201).json(newBus);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update bus location
router.post('/:id/location', async (req, res) => {
  try {
    const { lat, lng, speed, heading } = req.body;
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      {
        'currentLocation.lat': lat,
        'currentLocation.lng': lng,
        'currentLocation.speed': speed,
        'currentLocation.heading': heading,
        'currentLocation.timestamp': new Date(),
        lastUpdate: new Date()
      },
      { new: true }
    );
    
    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }
    
    res.json(bus);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update bus status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(bus);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;