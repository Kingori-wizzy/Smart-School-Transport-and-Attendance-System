const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const Student = require('../models/Student');
const Attendance = require('../models/AttendanceRecord');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');
const Bus = require('../models/Bus');
const GPSLog = require('../models/GPSLog');

// All routes require authentication
router.use(authMiddleware);

// 👨‍👩‍👧 Get parent's children
router.get('/children', async (req, res) => {
  try {
    const children = await Student.find({ parentId: req.user.id })
      .populate('busId', 'busNumber route driverName')
      .select('-__v');

    res.json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({ message: error.message });
  }
});

// ➕ Add a new child (for parent)
router.post('/children', async (req, res) => {
  try {
    const { 
      name,
      studentId,
      class: classLevel,
      school,
      busNumber,
      pickupPoint,
      dropoffPoint,
      emergencyContact,
      emergencyPhone,
      medicalNotes,
      age,
      gender
    } = req.body;

    console.log('Adding child for parent:', req.user.id);
    console.log('Child data received:', req.body);

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    let routeName = '';
    if (busNumber && busNumber.includes('-')) {
      routeName = busNumber.split('-')[1].trim();
    }

    let busId = null;
    if (busNumber) {
      const bus = await Bus.findOne({ busNumber: busNumber.split(' - ')[0] });
      busId = bus ? bus._id : null;
    }

    const newStudent = new Student({
      firstName,
      lastName,
      admissionNumber: studentId,
      classLevel,
      school,
      routeName,
      busNumber,
      busId,
      pickupPoint,
      dropoffPoint,
      guardianName: emergencyContact,
      guardianContact: emergencyPhone,
      medicalNotes,
      parentId: req.user.id,
      age: parseInt(age) || 0,
      gender: gender,
    });

    await newStudent.save();
    
    await newStudent.populate('busId', 'busNumber route driverName');
    
    console.log('Child added successfully:', newStudent);
    
    res.status(201).json(newStudent);
  } catch (error) {
    console.error('Error adding child:', error);
    res.status(500).json({ message: error.message });
  }
});

// 📍 Get child's current location (via bus) - ✅ FIXED
router.get('/children/:childId/location', async (req, res) => {
  try {
    const { childId } = req.params;

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    }).populate('busId');

    if (!student) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!student.busId) {
      return res.json({
        childId: student._id,
        childName: `${student.firstName} ${student.lastName}`,
        busId: null,
        busNumber: student.busNumber,
        location: null,
        route: student.routeName,
        message: 'No bus assigned'
      });
    }

    const latestLocation = await GPSLog.findOne({ 
      vehicleId: student.busId._id 
    }).sort({ createdAt: -1 });

    if (!latestLocation) {
      return res.json({
        childId: student._id,
        childName: `${student.firstName} ${student.lastName}`,
        busId: student.busId._id,
        busNumber: student.busId.busNumber,
        location: null,
        route: student.busId.route,
        message: 'No location data available'
      });
    }

    res.json({
      childId: student._id,
      childName: `${student.firstName} ${student.lastName}`,
      busId: student.busId._id,
      busNumber: student.busId.busNumber,
      location: {
        lat: latestLocation.lat,
        lng: latestLocation.lon,
        speed: latestLocation.speed,
        timestamp: latestLocation.createdAt
      },
      route: student.busId.route
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ message: error.message });
  }
});

// 📊 Get child's attendance history
router.get('/children/:childId/attendance', async (req, res) => {
  try {
    const { childId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });
    
    if (!student) {
      return res.status(403).json({ message: 'Unauthorized access to child data' });
    }

    const query = { studentId: childId };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .populate('tripId', 'routeName busId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.eventType === 'board').length,
      absent: 0,
      late: attendance.filter(a => a.eventType === 'late').length || 0,
      attendanceRate: 0
    };

    res.json({
      attendance,
      stats,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        studentId: student.admissionNumber,
        class: student.classLevel,
        busNumber: student.busNumber
      }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get child's stats
router.get('/children/:childId/stats', async (req, res) => {
  try {
    const { childId } = req.params;
    
    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });
    
    if (!student) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // You can calculate stats here or redirect to attendance stats
    const attendanceStats = await fetch(`${req.protocol}://${req.get('host')}/api/attendance/child/${childId}/stats`);
    
    res.json(attendanceStats);
  } catch (error) {
    console.error('Error fetching child stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get child's recent trips
router.get('/children/:childId/trips/recent', async (req, res) => {
  try {
    const { childId } = req.params;
    const { limit = 5 } = req.query;

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });
    
    if (!student) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const trips = await Trip.find({
      busId: student.busId,
      status: 'completed'
    })
    .sort({ date: -1 })
    .limit(parseInt(limit));

    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔔 Get parent's notifications
router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ 
      userId: req.user.id,
      userType: 'parent'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const total = await Notification.countDocuments({ 
      userId: req.user.id,
      userType: 'parent'
    });

    res.json({
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: error.message });
  }
});

// 📝 Get child's upcoming trips
router.get('/children/:childId/trips/upcoming', async (req, res) => {
  try {
    const { childId } = req.params;

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });

    if (!student) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const now = new Date();
    const trips = await Trip.find({
      busId: student.busId,
      status: { $in: ['scheduled', 'in-progress'] },
      date: { $gte: now }
    })
    .sort({ date: 1, startTime: 1 })
    .limit(5);

    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;