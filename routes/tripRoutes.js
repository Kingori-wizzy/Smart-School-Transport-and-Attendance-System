const express = require('express');
const router = express.Router();

const Trip = require('../models/Trip');
const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');


// 🧑‍💼 ADMIN — Create Trip
router.post(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const trip = new Trip(req.body);
      await trip.save();
      res.status(201).json({ message: 'Trip created successfully', trip });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


// 🚦 DRIVER — Start Trip
router.put(
  '/start/:id',
  authMiddleware,
  roleMiddleware('driver'),
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.id);

      if (!trip) return res.status(404).json({ message: 'Trip not found' });

      if (trip.driverId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not your trip' });
      }

      trip.status = 'running';
      trip.startTime = new Date();
      await trip.save();

      res.json({ message: 'Trip started', trip });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);


// 🏁 DRIVER — End Trip
router.put(
  '/end/:id',
  authMiddleware,
  roleMiddleware('driver'),
  async (req, res) => {
    try {
      const trip = await Trip.findById(req.params.id);

      if (!trip) return res.status(404).json({ message: 'Trip not found' });

      if (trip.driverId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not your trip' });
      }

      trip.status = 'completed';
      trip.endTime = new Date();
      await trip.save();

      res.json({ message: 'Trip completed', trip });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);


// 👑 ADMIN — View All Trips
router.get(
  '/',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const trips = await Trip.find().sort({ createdAt: -1 });
      res.json(trips);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
