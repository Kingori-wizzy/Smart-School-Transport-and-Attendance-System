const express = require('express');
const router = express.Router();

const Attendance = require('../models/AttendanceRecord');
const Trip = require('../models/Trip');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');


/*
=====================================================
🚍 DRIVER - Record Attendance + Real-Time Push
=====================================================
*/
router.post(
  '/',
  authMiddleware,
  roleMiddleware('driver'),
  async (req, res) => {
    try {
      const { studentId, eventType, scannerId } = req.body;

      const io = req.app.get('io');
      const connectedParents = req.app.get('connectedParents');

      // 🔍 Find active running trip
      const activeTrip = await Trip.findOne({
        driverId: req.user.id,
        status: 'running'
      });

      if (!activeTrip) {
        return res.status(400).json({
          message: 'No active running trip found'
        });
      }

      const student = await Student.findById(studentId);

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const lastRecord = await Attendance.findOne({
        studentId,
        tripId: activeTrip._id
      }).sort({ createdAt: -1 });

      if (lastRecord && lastRecord.eventType === eventType) {
        return res.status(400).json({
          message: `Student already ${eventType}`
        });
      }

      if (eventType === 'alight') {
        if (!lastRecord || lastRecord.eventType !== 'board') {
          return res.status(400).json({
            message: 'Student must board before alighting'
          });
        }
      }

      const attendance = new Attendance({
        studentId,
        eventType,
        scannerId,
        tripId: activeTrip._id
      });

      await attendance.save();

      const message =
        eventType === 'board'
          ? `${student.firstName} ${student.lastName} has boarded the bus.`
          : `${student.firstName} ${student.lastName} has alighted safely.`;

      const notification = new Notification({
        parentId: student.parentId,
        studentId: student._id,
        tripId: activeTrip._id,
        message,
        type: eventType
      });

      await notification.save();

      // 🔴 REAL-TIME EMIT
      const parentSocketId = connectedParents[student.parentId];

      if (parentSocketId) {
        io.to(parentSocketId).emit('newNotification', {
          message,
          studentId: student._id,
          tripId: activeTrip._id,
          type: eventType
        });
      }

      res.status(201).json({
        message: 'Attendance recorded & real-time notification sent'
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
