const express = require('express');
const router = express.Router();
const Attendance = require('../models/AttendanceRecord');

// Get today's attendance
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.find({
      createdAt: { $gte: today, $lt: tomorrow }
    })
    .populate('studentId')
    .populate('tripId')
    .sort({ createdAt: -1 });
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const totalToday = await Attendance.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const boardings = await Attendance.countDocuments({
      eventType: 'board',
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    const uniqueStudents = await Attendance.distinct('studentId', {
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    res.json({
      total: totalToday,
      boardings: boardings,
      alightings: totalToday - boardings,
      uniqueStudents: uniqueStudents.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance by student
router.get('/student/:studentId', async (req, res) => {
  try {
    const attendance = await Attendance.find({ 
      studentId: req.params.studentId 
    })
    .populate('tripId')
    .sort({ createdAt: -1 });
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance by trip
router.get('/trip/:tripId', async (req, res) => {
  try {
    const attendance = await Attendance.find({ 
      tripId: req.params.tripId 
    })
    .populate('studentId')
    .sort({ createdAt: -1 });
    
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Record new attendance
router.post('/', async (req, res) => {
  try {
    const attendance = new Attendance(req.body);
    const newAttendance = await attendance.save();
    
    await newAttendance.populate('studentId');
    await newAttendance.populate('tripId');
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    io.emit('new-attendance', newAttendance);
    
    res.status(201).json(newAttendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;