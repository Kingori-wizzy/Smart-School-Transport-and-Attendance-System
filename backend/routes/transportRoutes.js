const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const IncidentReport = require('../models/IncidentReport');
const User = require('../models/User');
const Student = require('../models/Student');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');

// All transport routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/transport/report
 * @desc    Report a problem from parent to driver
 * @access  Private (Parents only)
 */
router.post('/report', async (req, res) => {
  try {
    const { type, childId, message, location } = req.body;
    const parentId = req.user.id;

    // Validate input
    if (!type || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Type and message are required' 
      });
    }

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
        studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
        
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

    // Find admins to notify (optional)
    const admins = await User.find({ role: 'admin' }).select('_id email');
    
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
    
    // Fetch route from database (you'll need to create a Route model)
    // const route = await Route.findById(routeId);
    
    // For now, return mock data
    res.json({ 
      success: true, 
      data: { 
        id: routeId,
        name: 'Route information',
        stops: [],
        coordinates: []
      } 
    });
  } catch (error) {
    console.error('❌ Error fetching route:', error);
    res.status(500).json({ success: false, message: error.message });
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
    
    let query = {};
    
    // If childId provided, filter by that child
    if (childId) {
      const student = await Student.findOne({ 
        _id: childId, 
        parentId: parentId 
      });
      
      if (student) {
        // Find trips for this student
        const trips = await Trip.find({
          students: childId,
          scheduledStartTime: { 
            $gte: new Date(date || new Date().setHours(0,0,0,0)),
            $lt: new Date(new Date(date || new Date()).setHours(23,59,59,999))
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
    }
    
    // If no childId or child not found, return empty array
    res.json({ 
      success: true, 
      data: [] 
    });
    
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/transport/contact-driver
 * @desc    Direct message to driver
 * @access  Private (Parents only)
 */
router.post('/contact-driver', async (req, res) => {
  try {
    const { busId, message, childId } = req.body;
    const parentId = req.user.id;

    if (!busId || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bus ID and message are required' 
      });
    }

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
        childName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
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
    res.status(500).json({ success: false, message: error.message });
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
    const { limit = 20, page = 1 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const reports = await IncidentReport.find({ 
      reportedBy: parentId,
      type: 'parent_alert'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('parentInfo.childId', 'firstName lastName');
    
    const total = await IncidentReport.countDocuments({ 
      reportedBy: parentId,
      type: 'parent_alert'
    });
    
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
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching report history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;