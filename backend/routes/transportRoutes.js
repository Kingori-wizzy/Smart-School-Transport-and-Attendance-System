const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

const { authMiddleware } = require('../middleware/authMiddleware');
const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');
const Student = require('../models/Student');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const Route = require('../models/Route');

// All transport routes require authentication
router.use(authMiddleware);

// Validation rules
const validateReport = [
  body('type').notEmpty().withMessage('Type is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('childId').optional().isMongoId().withMessage('Invalid child ID format')
];

const validateContactDriver = [
  body('busId').isMongoId().withMessage('Valid bus ID required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('childId').optional().isMongoId().withMessage('Invalid child ID format')
];

/**
 * @route   POST /api/transport/report
 * @desc    Report a problem from parent to driver
 * @access  Private (Parents only)
 */
router.post('/report', validateReport, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { type, childId, message, location } = req.body;
    const parentId = req.user.id;

    console.log(`📢 Parent alert from ${parentId}:`, { type, childId, message });

    // Find the child to get their current trip and bus info
    let tripId = null;
    let busId = null;
    let studentName = null;
    let busNumber = null;
    
    if (childId) {
      const student = await Student.findById(childId)
        .populate('currentTrip')
        .populate('busId');
      
      if (student) {
        studentName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim();
        
        // Try to find active trip
        if (student.currentTrip) {
          tripId = student.currentTrip._id;
          busId = student.currentTrip.busId;
        } else {
          // Try to find an active trip for this student's bus
          const activeTrip = await Trip.findOne({ 
            status: 'running',
            students: childId 
          }).populate('busId');
          
          if (activeTrip) {
            tripId = activeTrip._id;
            busId = activeTrip.busId?._id;
            busNumber = activeTrip.busId?.busNumber;
          }
        }

        // Get bus info from student's assigned bus if available
        if (!busNumber && student.busId) {
          busNumber = student.busId.busNumber;
        }
      }
    }

    // Map severity based on alert type
    let severity = 'medium';
    if (type === 'emergency') severity = 'critical';
    if (type === 'accident') severity = 'high';

    // Create incident report with all available data
    const reportData = {
      type: 'parent_alert',
      description: `${type}: ${message}${studentName ? ` for ${studentName}` : ''}`,
      reportedBy: parentId,
      severity: severity,
      status: 'reported',
      parentInfo: {
        childId: childId || null,
        alertType: type
      },
      location: location || null
    };
    
    // Only add tripId if we found one
    if (tripId) {
      reportData.tripId = tripId;
    }

    const report = new IncidentReport(reportData);
    
    await report.save();
    console.log(`✅ Incident report saved with ID: ${report._id}`);

    // Find driver to notify via socket if available
    if (busId && req.io) {
      req.io.to(`bus-${busId}`).emit('parent-alert', {
        type,
        message,
        childName: studentName,
        timestamp: new Date()
      });
    }

    res.json({ 
      success: true, 
      message: 'Alert sent successfully',
      data: {
        reportId: report._id,
        timestamp: report.timestamp,
        tripId: tripId || null,
        busNumber: busNumber || null
      }
    });

  } catch (error) {
    console.error('❌ Error sending alert:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/transport/routes/:routeId
 * @desc    Get route details by ID
 * @access  Private
 */
router.get('/routes/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    
    // Validate routeId
    if (!mongoose.Types.ObjectId.isValid(routeId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid route ID format' 
      });
    }

    const route = await Route.findById(routeId)
      .populate('stops')
      .populate('bus', 'busNumber');

    if (!route) {
      return res.status(404).json({ 
        success: false, 
        message: 'Route not found' 
      });
    }

    res.json({ 
      success: true, 
      data: route 
    });
  } catch (error) {
    console.error('❌ Error fetching route:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/transport/schedule
 * @desc    Get transport schedule for a date
 * @access  Private
 */
router.get('/schedule', async (req, res) => {
  try {
    const { date, childId } = req.query;
    const parentId = req.user.id;
    
    // Validate date if provided
    let startDate, endDate;
    if (date) {
      startDate = new Date(date);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid date format' 
        });
      }
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
    }
    
    let query = {};
    
    // If childId provided, filter by that child
    if (childId) {
      // Validate childId
      if (!mongoose.Types.ObjectId.isValid(childId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid child ID format' 
        });
      }

      const student = await Student.findOne({ 
        _id: childId, 
        parentId: parentId 
      });
      
      if (!student) {
        return res.status(403).json({ 
          success: false, 
          message: 'Unauthorized access to child data' 
        });
      }
      
      // Find trips for this student
      const trips = await Trip.find({
        $or: [
          { busId: student.busId },
          { students: childId }
        ],
        scheduledStartTime: { 
          $gte: startDate,
          $lt: endDate
        }
      }).populate('busId', 'busNumber');
      
      return res.json({ 
        success: true, 
        data: trips.map(trip => ({
          id: trip._id,
          routeName: trip.routeName,
          scheduledStartTime: trip.scheduledStartTime,
          scheduledEndTime: trip.scheduledEndTime,
          status: trip.status,
          busNumber: trip.busId?.busNumber
        }))
      });
    }
    
    // If no childId, return empty array
    res.json({ 
      success: true, 
      data: [] 
    });
    
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/transport/contact-driver
 * @desc    Direct message to driver
 * @access  Private (Parents only)
 */
router.post('/contact-driver', validateContactDriver, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { busId, message, childId } = req.body;
    const parentId = req.user.id;

    // Find bus and driver
    const bus = await Bus.findById(busId).populate('driver');
    
    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }

    // Log the message
    console.log(`💬 Message from parent ${parentId} to bus ${busId}: ${message}`);

    // Find child name if childId provided
    let childName = null;
    if (childId) {
      const student = await Student.findById(childId);
      if (student) {
        childName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim();
      }
    }

    // Create a simple incident report for the message
    const report = new IncidentReport({
      type: 'other',
      description: `Parent message: ${message}${childName ? ` about ${childName}` : ''}`,
      reportedBy: parentId,
      severity: 'low',
      status: 'reported'
    });
    
    await report.save();

    // Send notification to driver via socket if connected
    if (bus.driver && req.io) {
      req.io.to(`driver-${bus.driver._id}`).emit('parent-message', {
        message,
        childName,
        busId,
        timestamp: new Date()
      });
    }

    res.json({ 
      success: true, 
      message: 'Message sent to driver',
      data: {
        reportId: report._id,
        timestamp: report.timestamp
      }
    });

  } catch (error) {
    console.error('❌ Error contacting driver:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/transport/buses
 * @desc    Get list of buses (for parent to select)
 * @access  Private
 */
router.get('/buses', async (req, res) => {
  try {
    const parentId = req.user.id;
    
    // Find students belonging to this parent
    const students = await Student.find({ parentId: parentId })
      .populate('busId');
    
    // Extract unique buses
    const busesMap = new Map();
    
    students.forEach(student => {
      if (student.busId) {
        const bus = student.busId;
        busesMap.set(bus._id.toString(), {
          id: bus._id,
          busNumber: bus.busNumber || bus.number,
          driverName: bus.driverName,
          route: bus.route
        });
      }
    });
    
    const buses = Array.from(busesMap.values());
    
    res.json({ 
      success: true, 
      data: buses 
    });
    
  } catch (error) {
    console.error('❌ Error fetching buses:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/transport/reports/history
 * @desc    Get history of reports/alerts sent
 * @access  Private
 */
router.get('/reports/history', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const skip = (pageNum - 1) * limitNum;
    
    const [reports, total] = await Promise.all([
      IncidentReport.find({ 
        reportedBy: parentId,
        type: 'parent_alert'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('parentInfo.childId', 'firstName lastName'),
      
      IncidentReport.countDocuments({ 
        reportedBy: parentId,
        type: 'parent_alert'
      })
    ]);
    
    res.json({ 
      success: true, 
      data: {
        reports: reports.map(r => ({
          id: r._id,
          type: r.parentInfo?.alertType || 'other',
          message: r.description,
          childName: r.parentInfo?.childId ? 
            `${r.parentInfo.childId.firstName || ''} ${r.parentInfo.childId.lastName || ''}`.trim() : 
            null,
          timestamp: r.createdAt,
          severity: r.severity,
          status: r.status
        })),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching report history:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;