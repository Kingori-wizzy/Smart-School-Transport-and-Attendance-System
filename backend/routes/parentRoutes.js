const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const axios = require('axios');

const { authMiddleware } = require('../middleware/authMiddleware');
const Student = require('../models/Student');
const Attendance = require('../models/AttendanceRecord');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');
const Bus = require('../models/Bus');
const GPSLog = require('../models/GPSLog');
// FIXED: Import the pagination object correctly
const { paginate, getPaginationMeta } = require('../utils/pagination');

// All routes require authentication
router.use(authMiddleware);

// Validation rules for child creation
const validateChild = [
  body('name').notEmpty().withMessage('Name is required'),
  body('studentId').notEmpty().withMessage('Student ID is required'),
  body('class').notEmpty().withMessage('Class is required'),
  body('age').optional().isInt({ min: 3, max: 25 }).withMessage('Age must be between 3 and 25'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('emergencyPhone').optional().matches(/^\+?[\d\s-]{10,}$/).withMessage('Valid phone number required')
];

// ==================== CONVERSATIONS ENDPOINTS (with trailing slash support) ====================

// 💬 Get all conversations for parent (messages from drivers)
// Handle both /conversations and /conversations/ (with trailing slash)
router.get(['/conversations', '/conversations/'], async (req, res) => {
  try {
    const parentId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find all notifications sent to this parent
    const conversations = await Notification.find({
      userId: parentId,
      userType: 'parent',
      type: { $in: ['driver_message', 'driver_broadcast', 'delay_report', 'trip_delayed'] }
    })
    .populate('studentId', 'firstName lastName name')
    .populate('tripId', 'routeName')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
    
    const total = await Notification.countDocuments({
      userId: parentId,
      userType: 'parent',
      type: { $in: ['driver_message', 'driver_broadcast', 'delay_report', 'trip_delayed'] }
    });
    
    // Format conversations for the parent app
    const formattedConversations = conversations.map(conv => ({
      id: conv._id,
      message: conv.message,
      title: conv.title,
      type: conv.type,
      student: conv.studentId ? {
        id: conv.studentId._id,
        name: conv.studentId.name || `${conv.studentId.firstName} ${conv.studentId.lastName}`.trim()
      } : null,
      tripName: conv.tripId?.routeName || null,
      isRead: conv.isRead || false,
      createdAt: conv.createdAt,
      metadata: conv.metadata || {}
    }));
    
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    };
    
    res.json({
      success: true,
      data: formattedConversations,
      pagination,
      count: formattedConversations.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching conversations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 📊 Get unread conversation count
// Handle both /conversations/unread/count and with trailing slash
router.get(['/conversations/unread/count', '/conversations/unread/count/'], async (req, res) => {
  try {
    const parentId = req.user.id;
    
    const unreadCount = await Notification.countDocuments({
      userId: parentId,
      userType: 'parent',
      isRead: false,
      type: { $in: ['driver_message', 'driver_broadcast', 'delay_report', 'trip_delayed'] }
    });
    
    res.json({ 
      success: true, 
      unreadCount 
    });
    
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Mark conversation as read
// Handle both /conversations/:id/read and with trailing slash
router.put(['/conversations/:conversationId/read', '/conversations/:conversationId/read/'], async (req, res) => {
  try {
    const { conversationId } = req.params;
    const parentId = req.user.id;
    
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid conversation ID format' 
      });
    }
    
    const notification = await Notification.findOneAndUpdate(
      { _id: conversationId, userId: parentId },
      { isRead: true, status: 'read', readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: 'Conversation not found' 
      });
    }
    
    // Get updated unread count
    const unreadCount = await Notification.countDocuments({
      userId: parentId,
      userType: 'parent',
      isRead: false,
      type: { $in: ['driver_message', 'driver_broadcast', 'delay_report', 'trip_delayed'] }
    });
    
    res.json({ 
      success: true, 
      message: 'Marked as read',
      unreadCount
    });
    
  } catch (error) {
    console.error('❌ Error marking conversation as read:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 👨‍👩‍👧 Get parent's children (paginated)
router.get('/children', async (req, res) => {
  try {
    // FIXED: Use paginate function correctly
    const { page, limit, skip } = paginate(req);
    
    const [children, total] = await Promise.all([
      Student.find({ parentId: req.user.id })
        .populate('busId', 'busNumber route driverName')
        .select('-__v')
        .skip(skip)
        .limit(limit)
        .sort('-createdAt')
        .lean(), // Added lean() for better performance
      Student.countDocuments({ parentId: req.user.id })
    ]);

    // FIXED: Use getPaginationMeta for consistent pagination response
    const pagination = getPaginationMeta(page, limit, total);

    res.json({
      success: true,
      data: children,
      pagination
    });
  } catch (error) {
    console.error('❌ Error fetching children:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ➕ Add a new child (for parent)
router.post('/children', validateChild, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

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

    console.log('📝 Adding child for parent:', req.user.id);

    // Check for duplicate admission number
    const existing = await Student.findOne({ admissionNumber: studentId });
    if (existing) {
      return res.status(409).json({ 
        success: false,
        message: 'Student with this admission number already exists' 
      });
    }

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
      name: `${firstName} ${lastName}`.trim(),
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
      isActive: true,
      usesTransport: !!busId // Set to true if bus assigned
    });

    await newStudent.save();
    
    await newStudent.populate('busId', 'busNumber route driverName');
    
    console.log('✅ Child added successfully:', newStudent._id);
    
    res.status(201).json({
      success: true,
      data: newStudent,
      message: 'Child added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding child:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// 📍 Get child's current location (via bus)
router.get('/children/:childId/location', async (req, res) => {
  try {
    const { childId } = req.params;

    // Validate childId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid child ID format' 
      });
    }

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    }).populate('busId');

    if (!student) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    if (!student.busId) {
      return res.json({
        success: true,
        data: {
          childId: student._id,
          childName: student.name || `${student.firstName} ${student.lastName}`.trim(),
          busId: null,
          busNumber: student.busNumber,
          location: null,
          route: student.routeName,
          message: 'No bus assigned'
        }
      });
    }

    const latestLocation = await GPSLog.findOne({ 
      vehicleId: student.busId._id 
    }).sort({ createdAt: -1 });

    if (!latestLocation) {
      return res.json({
        success: true,
        data: {
          childId: student._id,
          childName: student.name || `${student.firstName} ${student.lastName}`.trim(),
          busId: student.busId._id,
          busNumber: student.busId.busNumber,
          location: null,
          route: student.busId.route,
          message: 'No location data available'
        }
      });
    }

    res.json({
      success: true,
      data: {
        childId: student._id,
        childName: student.name || `${student.firstName} ${student.lastName}`.trim(),
        busId: student.busId._id,
        busNumber: student.busId.busNumber,
        location: {
          lat: latestLocation.lat,
          lng: latestLocation.lon,
          speed: latestLocation.speed,
          timestamp: latestLocation.createdAt
        },
        route: student.busId.route
      }
    });
  } catch (error) {
    console.error('❌ Error fetching location:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// 📊 Get child's attendance history
router.get('/children/:childId/attendance', async (req, res) => {
  try {
    const { childId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    // Validate childId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid child ID format' 
      });
    }

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });
    
    if (!student) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized access to child data' 
      });
    }

    const query = { studentId: childId };
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid date format' 
        });
      }

      query.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const parsedLimit = Math.min(parseInt(limit), 100);

    const attendance = await Attendance.find(query)
      .populate('tripId', 'routeName busId')
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .lean();

    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.eventType === 'board').length,
      absent: attendance.filter(a => a.eventType === 'absent').length,
      late: attendance.filter(a => a.eventType === 'late').length,
      attendanceRate: attendance.length > 0 
        ? Math.round((attendance.filter(a => a.eventType === 'board').length / attendance.length) * 100) 
        : 0
    };

    res.json({
      success: true,
      data: {
        attendance,
        stats,
        student: {
          id: student._id,
          name: student.name || `${student.firstName} ${student.lastName}`.trim(),
          studentId: student.admissionNumber,
          class: student.classLevel,
          busNumber: student.busNumber
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching attendance:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get child's stats
router.get('/children/:childId/stats', async (req, res) => {
  try {
    const { childId } = req.params;
    
    // Validate childId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid child ID format' 
      });
    }

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });
    
    if (!student) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    // Forward to attendance stats endpoint
    const protocol = req.protocol;
    const host = req.get('host');
    const attendanceStatsUrl = `${protocol}://${host}/api/attendance/child/${childId}/stats`;
    
    try {
      const response = await axios.get(attendanceStatsUrl, {
        headers: {
          'Authorization': req.headers.authorization
        }
      });
      
      return res.json(response.data);
    } catch (forwardError) {
      console.error('⚠️ Error forwarding to attendance stats:', forwardError.message);
      
      // Fallback to basic stats
      const attendance = await Attendance.find({ studentId: childId });
      
      const total = attendance.length;
      const present = attendance.filter(a => a.eventType === 'board').length;
      const late = attendance.filter(a => a.eventType === 'late').length;
      const absent = total - present - late;

      res.json({
        success: true,
        data: {
          attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
          totalTrips: total,
          lateArrivals: late,
          present,
          absent,
          late
        }
      });
    }
  } catch (error) {
    console.error('❌ Error fetching child stats:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get child's recent trips
router.get('/children/:childId/trips/recent', async (req, res) => {
  try {
    const { childId } = req.params;
    let { limit = 5 } = req.query;

    // Validate childId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid child ID format' 
      });
    }

    // Validate limit
    limit = Math.min(parseInt(limit), 20);

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });
    
    if (!student) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    const trips = await Trip.find({
      $or: [
        { busId: student.busId },
        { students: childId }
      ],
      status: 'completed'
    })
    .sort({ date: -1, endTime: -1 })
    .limit(limit)
    .lean();

    res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    console.error('❌ Error fetching trips:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// 🔔 Get parent's notifications (paginated)
router.get('/notifications', async (req, res) => {
  try {
    // FIXED: Use paginate function correctly
    const { page, limit, skip } = paginate(req);

    const [notifications, total] = await Promise.all([
      Notification.find({ 
        userId: req.user.id,
        userType: 'parent'
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ 
        userId: req.user.id,
        userType: 'parent'
      })
    ]);

    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      userType: 'parent',
      read: false
    });

    // FIXED: Use getPaginationMeta
    const pagination = getPaginationMeta(page, limit, total);
    pagination.unread = unreadCount;

    res.json({
      success: true,
      data: notifications,
      pagination
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ✅ Mark notification as read
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid notification ID format' 
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: 'Notification not found' 
      });
    }

    // Get updated unread count
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      userType: 'parent',
      read: false
    });

    res.json({ 
      success: true,
      data: {
        notification,
        unreadCount
      }
    });
  } catch (error) {
    console.error('❌ Error updating notification:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// 📝 Get child's upcoming trips
router.get('/children/:childId/trips/upcoming', async (req, res) => {
  try {
    const { childId } = req.params;

    // Validate childId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid child ID format' 
      });
    }

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });

    if (!student) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    const now = new Date();
    const trips = await Trip.find({
      busId: student.busId,
      status: { $in: ['scheduled', 'in-progress'] },
      date: { $gte: now }
    })
    .sort({ date: 1, startTime: 1 })
    .limit(5)
    .lean();

    res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    console.error('❌ Error fetching trips:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// 👤 Get single child details
router.get('/children/:childId', async (req, res) => {
  try {
    const { childId } = req.params;

    // Validate childId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid child ID format' 
      });
    }

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    }).populate('busId', 'busNumber route driverName');

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Child not found' 
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (error) {
    console.error('❌ Error fetching child:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ✏️ Update child details
router.put('/children/:childId', validateChild, async (req, res) => {
  try {
    const { childId } = req.params;

    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // Validate childId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid child ID format' 
      });
    }

    // Check ownership
    const existing = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });

    if (!existing) {
      return res.status(403).json({ 
        success: false,
        message: 'Unauthorized' 
      });
    }

    const { 
      name,
      class: classLevel,
      school,
      busNumber,
      pickupPoint,
      dropoffPoint,
      emergencyContact,
      emergencyPhone,
      medicalNotes
    } = req.body;

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || firstName;

    let busId = existing.busId;
    if (busNumber && busNumber !== existing.busNumber) {
      const bus = await Bus.findOne({ busNumber: busNumber.split(' - ')[0] });
      busId = bus ? bus._id : null;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      childId,
      {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        classLevel,
        school,
        busNumber,
        busId,
        pickupPoint,
        dropoffPoint,
        guardianName: emergencyContact,
        guardianContact: emergencyPhone,
        medicalNotes,
        usesTransport: !!busId
      },
      { new: true, runValidators: true }
    ).populate('busId', 'busNumber route driverName');

    res.json({
      success: true,
      data: updatedStudent,
      message: 'Child updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating child:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// 🗑️ Remove child (soft delete)
router.delete('/children/:childId', async (req, res) => {
  try {
    const { childId } = req.params;

    // Validate childId
    if (!mongoose.Types.ObjectId.isValid(childId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid child ID format' 
      });
    }

    const student = await Student.findOne({ 
      _id: childId, 
      parentId: req.user.id 
    });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Child not found' 
      });
    }

    // Soft delete - just remove parent link and deactivate
    student.parentId = null;
    student.isActive = false;
    await student.save();

    res.json({
      success: true,
      message: 'Child removed successfully'
    });
  } catch (error) {
    console.error('❌ Error removing child:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// ==================== CATCH-ALL FOR CONVERSATIONS (Handles any trailing slash issues) ====================

// Catch-all for any conversation routes with trailing slashes or spaces
router.use(/\/conversations.*/, (req, res, next) => {
  // If the URL has a trailing space or encoded space, redirect to clean URL
  if (req.originalUrl.includes('%20') || req.originalUrl.endsWith(' ')) {
    const cleanUrl = req.originalUrl.replace(/%20/g, '').trim();
    return res.redirect(307, cleanUrl);
  }
  next();
});

module.exports = router;