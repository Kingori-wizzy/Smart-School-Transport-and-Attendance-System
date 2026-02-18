const express = require('express');
const router = express.Router();

const Attendance = require('../models/AttendanceRecord');
const Trip = require('../models/Trip');

const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get(
  '/summary',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res) => {
    const trips = await Trip.find();

    const totalTrips = trips.length;

    const attendance = await Attendance.find();

    const totalBoard = attendance.filter(a => a.eventType === 'board').length;
    const totalAlight = attendance.filter(a => a.eventType === 'alight').length;

    res.json({
      totalTrips,
      totalBoard,
      totalAlight
    });
  }
);

module.exports = router;
