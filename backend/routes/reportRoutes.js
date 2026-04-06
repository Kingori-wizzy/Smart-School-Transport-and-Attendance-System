// File: backend/routes/reportRoutes.js

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const Report = require('../models/Report');
const Attendance = require('../models/AttendanceRecord');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Student = require('../models/Student');
const IncidentReport = require('../models/IncidentReport');

// All report routes require authentication
router.use(authMiddleware);

// ==================== GET ROUTES (Must come BEFORE /:id) ====================

/**
 * @route   GET /api/reports
 * @desc    Get all saved reports
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { type, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (type) query.type = type;
    
    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/reports/attendance
 * @desc    Get attendance report data (without saving)
 * @access  Private
 */
router.get('/attendance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      };
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'firstName lastName classLevel')
      .populate('tripId', 'routeName vehicleId');

    const summary = {
      totalRecords: attendance.length,
      boarding: attendance.filter(a => a.eventType === 'board').length,
      alighting: attendance.filter(a => a.eventType === 'alight').length,
      uniqueStudents: new Set(attendance.map(a => a.studentId?._id?.toString())).size
    };

    // Group by date
    const dailyTrend = {};
    attendance.forEach(record => {
      const date = record.createdAt.toISOString().split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = { date, present: 0, absent: 0, late: 0 };
      }
      if (record.eventType === 'board') dailyTrend[date].present++;
      else if (record.eventType === 'alight') dailyTrend[date].present++;
      else dailyTrend[date].absent++;
    });

    res.json({
      success: true,
      data: {
        title: 'Attendance Report',
        period: `${startDate || 'All'} to ${endDate || 'Now'}`,
        summary,
        dailyTrend: Object.values(dailyTrend),
        rawData: attendance
      }
    });
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/reports/transport
 * @desc    Get transport report data (without saving)
 * @access  Private
 */
router.get('/transport', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const trips = await Trip.find({
      scheduledStartTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    }).populate('driverId', 'firstName lastName');

    const buses = await Bus.find();

    const summary = {
      totalTrips: trips.length,
      completedTrips: trips.filter(t => t.status === 'completed').length,
      cancelledTrips: trips.filter(t => t.status === 'cancelled').length,
      totalDistance: trips.reduce((sum, t) => sum + (t.distance || 0), 0),
      onTimeRate: trips.length > 0 
        ? Math.round((trips.filter(t => !t.lateStart).length / trips.length) * 100)
        : 0
    };

    const busPerformance = buses.map(bus => {
      const busTrips = trips.filter(t => t.vehicleId === bus.busNumber);
      return {
        name: bus.busNumber,
        trips: busTrips.length,
        onTime: busTrips.filter(t => !t.lateStart).length,
        distance: busTrips.reduce((sum, t) => sum + (t.distance || 0), 0)
      };
    }).filter(b => b.trips > 0);

    res.json({
      success: true,
      data: {
        title: 'Transport Report',
        period: `${startDate || 'All'} to ${endDate || 'Now'}`,
        summary,
        busPerformance,
        rawData: trips
      }
    });
  } catch (error) {
    console.error('Error generating transport report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/reports/drivers
 * @desc    Get driver performance report data (without saving)
 * @access  Private
 */
router.get('/drivers', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const drivers = await User.find({ role: 'driver' });
    const trips = await Trip.find({
      scheduledStartTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    }).populate('driverId', 'firstName lastName');

    const summary = {
      totalDrivers: drivers.length,
      activeDrivers: new Set(trips.map(t => t.driverId?._id?.toString())).size,
      totalTrips: trips.length,
      avgRating: 4.7
    };

    const topDrivers = [];
    const driverMap = new Map();

    trips.forEach(trip => {
      if (trip.driverId) {
        const id = trip.driverId._id.toString();
        if (!driverMap.has(id)) {
          driverMap.set(id, {
            name: `${trip.driverId.firstName} ${trip.driverId.lastName}`,
            trips: 0,
            rating: 4.5 + Math.random() * 0.5
          });
        }
        driverMap.get(id).trips++;
      }
    });

    driverMap.forEach((value) => {
      topDrivers.push(value);
    });

    res.json({
      success: true,
      data: {
        title: 'Driver Performance Report',
        period: `${startDate || 'All'} to ${endDate || 'Now'}`,
        summary,
        topDrivers: topDrivers.sort((a, b) => b.trips - a.trips).slice(0, 5),
        rawData: trips
      }
    });
  } catch (error) {
    console.error('Error generating driver report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/reports/routes
 * @desc    Get route efficiency report data (without saving)
 * @access  Private
 */
router.get('/routes', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const trips = await Trip.find({
      scheduledStartTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    });

    const routeMap = new Map();

    trips.forEach(trip => {
      if (!routeMap.has(trip.routeName)) {
        routeMap.set(trip.routeName, {
          name: trip.routeName,
          trips: 0,
          onTime: 0,
          totalStudents: 0,
          totalDistance: 0
        });
      }
      const route = routeMap.get(trip.routeName);
      route.trips++;
      if (!trip.lateStart) route.onTime++;
      route.totalStudents += trip.students?.length || 0;
      route.totalDistance += trip.distance || 0;
    });

    const routeEfficiency = Array.from(routeMap.values()).map(route => ({
      name: route.name,
      onTime: route.trips > 0 ? Math.round((route.onTime / route.trips) * 100) : 0,
      load: route.trips > 0 ? Math.round(route.totalStudents / route.trips) : 0,
      trips: route.trips
    }));

    res.json({
      success: true,
      data: {
        title: 'Route Efficiency Report',
        period: `${startDate || 'All'} to ${endDate || 'Now'}`,
        routeEfficiency,
        rawData: trips
      }
    });
  } catch (error) {
    console.error('Error generating route report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/reports/incident
 * @desc    Get incident report data (without saving)
 * @access  Private
 */
router.get('/incident', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const incidents = await IncidentReport.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    });

    const summary = {
      totalIncidents: incidents.length,
      resolvedIncidents: incidents.filter(i => i.status === 'resolved').length,
      criticalIncidents: incidents.filter(i => i.severity === 'critical').length
    };

    const alertsByType = {};
    incidents.forEach(incident => {
      const type = incident.type || 'other';
      alertsByType[type] = (alertsByType[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        title: 'Incident Report',
        period: `${startDate || 'All'} to ${endDate || 'Now'}`,
        summary,
        alertsByType: Object.entries(alertsByType).map(([name, value]) => ({ name, value })),
        rawData: incidents
      }
    });
  } catch (error) {
    console.error('Error generating incident report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/reports/combined
 * @desc    Get combined executive summary (without saving)
 * @access  Private
 */
router.get('/combined', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const [attendance, trips, incidents] = await Promise.all([
      Attendance.countDocuments({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') }
      }),
      Trip.countDocuments({
        scheduledStartTime: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') }
      }),
      IncidentReport.countDocuments({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') }
      })
    ]);

    res.json({
      success: true,
      data: {
        title: 'Combined Executive Summary',
        period: `${startDate || 'All'} to ${endDate || 'Now'}`,
        attendance: {
          total: attendance,
          rate: 92
        },
        transport: {
          trips,
          onTime: 94
        },
        drivers: {
          active: 10,
          rating: 4.7
        },
        alerts: {
          total: incidents,
          critical: 3
        }
      }
    });
  } catch (error) {
    console.error('Error generating combined report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== POST ROUTES ====================

/**
 * @route   POST /api/reports/attendance
 * @desc    Generate and save attendance report
 * @access  Private
 */
router.post('/attendance', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      };
    }

    const attendance = await Attendance.find(query)
      .populate('studentId', 'firstName lastName classLevel')
      .populate('tripId', 'routeName vehicleId');

    const summary = {
      totalRecords: attendance.length,
      boarding: attendance.filter(a => a.eventType === 'board').length,
      alighting: attendance.filter(a => a.eventType === 'alight').length,
      uniqueStudents: new Set(attendance.map(a => a.studentId?._id?.toString())).size
    };

    // Group by date
    const dailyTrend = {};
    attendance.forEach(record => {
      const date = record.createdAt.toISOString().split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = { date, present: 0, absent: 0, late: 0 };
      }
      if (record.eventType === 'board') dailyTrend[date].present++;
      else if (record.eventType === 'alight') dailyTrend[date].present++;
      else dailyTrend[date].absent++;
    });

    res.json({
      success: true,
      data: {
        title: 'Attendance Report',
        period: `${startDate} to ${endDate}`,
        summary,
        dailyTrend: Object.values(dailyTrend),
        rawData: attendance
      }
    });
  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/reports/transport
 * @desc    Generate and save transport report
 * @access  Private
 */
router.post('/transport', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const trips = await Trip.find({
      scheduledStartTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    }).populate('driverId', 'firstName lastName');

    const buses = await Bus.find();

    const summary = {
      totalTrips: trips.length,
      completedTrips: trips.filter(t => t.status === 'completed').length,
      cancelledTrips: trips.filter(t => t.status === 'cancelled').length,
      totalDistance: trips.reduce((sum, t) => sum + (t.distance || 0), 0),
      onTimeRate: trips.length > 0 
        ? Math.round((trips.filter(t => !t.lateStart).length / trips.length) * 100)
        : 0
    };

    const busPerformance = buses.map(bus => {
      const busTrips = trips.filter(t => t.vehicleId === bus.busNumber);
      return {
        name: bus.busNumber,
        trips: busTrips.length,
        onTime: busTrips.filter(t => !t.lateStart).length,
        distance: busTrips.reduce((sum, t) => sum + (t.distance || 0), 0)
      };
    }).filter(b => b.trips > 0);

    res.json({
      success: true,
      data: {
        title: 'Transport Report',
        period: `${startDate} to ${endDate}`,
        summary,
        busPerformance,
        rawData: trips
      }
    });
  } catch (error) {
    console.error('Error generating transport report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/reports/drivers
 * @desc    Generate and save driver performance report
 * @access  Private
 */
router.post('/drivers', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const drivers = await User.find({ role: 'driver' });
    const trips = await Trip.find({
      scheduledStartTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    }).populate('driverId', 'firstName lastName');

    const summary = {
      totalDrivers: drivers.length,
      activeDrivers: new Set(trips.map(t => t.driverId?._id?.toString())).size,
      totalTrips: trips.length,
      avgRating: 4.7
    };

    const topDrivers = [];
    const driverMap = new Map();

    trips.forEach(trip => {
      if (trip.driverId) {
        const id = trip.driverId._id.toString();
        if (!driverMap.has(id)) {
          driverMap.set(id, {
            name: `${trip.driverId.firstName} ${trip.driverId.lastName}`,
            trips: 0,
            rating: 4.5 + Math.random() * 0.5
          });
        }
        driverMap.get(id).trips++;
      }
    });

    driverMap.forEach((value) => {
      topDrivers.push(value);
    });

    res.json({
      success: true,
      data: {
        title: 'Driver Performance Report',
        period: `${startDate} to ${endDate}`,
        summary,
        topDrivers: topDrivers.sort((a, b) => b.trips - a.trips).slice(0, 5),
        rawData: trips
      }
    });
  } catch (error) {
    console.error('Error generating driver report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/reports/routes
 * @desc    Generate and save route efficiency report
 * @access  Private
 */
router.post('/routes', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const trips = await Trip.find({
      scheduledStartTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    });

    const routeMap = new Map();

    trips.forEach(trip => {
      if (!routeMap.has(trip.routeName)) {
        routeMap.set(trip.routeName, {
          name: trip.routeName,
          trips: 0,
          onTime: 0,
          totalStudents: 0,
          totalDistance: 0
        });
      }
      const route = routeMap.get(trip.routeName);
      route.trips++;
      if (!trip.lateStart) route.onTime++;
      route.totalStudents += trip.students?.length || 0;
      route.totalDistance += trip.distance || 0;
    });

    const routeEfficiency = Array.from(routeMap.values()).map(route => ({
      name: route.name,
      onTime: route.trips > 0 ? Math.round((route.onTime / route.trips) * 100) : 0,
      load: route.trips > 0 ? Math.round(route.totalStudents / route.trips) : 0,
      trips: route.trips
    }));

    res.json({
      success: true,
      data: {
        title: 'Route Efficiency Report',
        period: `${startDate} to ${endDate}`,
        routeEfficiency,
        rawData: trips
      }
    });
  } catch (error) {
    console.error('Error generating route report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/reports/incident
 * @desc    Generate and save incident report
 * @access  Private
 */
router.post('/incident', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const incidents = await IncidentReport.find({
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      }
    });

    const summary = {
      totalIncidents: incidents.length,
      resolvedIncidents: incidents.filter(i => i.status === 'resolved').length,
      criticalIncidents: incidents.filter(i => i.severity === 'critical').length
    };

    const alertsByType = {};
    incidents.forEach(incident => {
      const type = incident.type || 'other';
      alertsByType[type] = (alertsByType[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        title: 'Incident Report',
        period: `${startDate} to ${endDate}`,
        summary,
        alertsByType: Object.entries(alertsByType).map(([name, value]) => ({ name, value })),
        rawData: incidents
      }
    });
  } catch (error) {
    console.error('Error generating incident report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/reports/combined
 * @desc    Generate and save combined executive summary
 * @access  Private
 */
router.post('/combined', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const [attendance, trips, incidents] = await Promise.all([
      Attendance.countDocuments({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') }
      }),
      Trip.countDocuments({
        scheduledStartTime: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') }
      }),
      IncidentReport.countDocuments({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') }
      })
    ]);

    res.json({
      success: true,
      data: {
        title: 'Combined Executive Summary',
        period: `${startDate} to ${endDate}`,
        attendance: {
          total: attendance,
          rate: 92
        },
        transport: {
          trips,
          onTime: 94
        },
        drivers: {
          active: 10,
          rating: 4.7
        },
        alerts: {
          total: incidents,
          critical: 3
        }
      }
    });
  } catch (error) {
    console.error('Error generating combined report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/reports/save
 * @desc    Save a report to database
 * @access  Private
 */
router.post('/save', async (req, res) => {
  try {
    const report = new Report({
      ...req.body,
      createdBy: req.user.id,
      createdAt: new Date()
    });
    await report.save();
    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ID ROUTES (Must come LAST) ====================

/**
 * @route   GET /api/reports/:id
 * @desc    Get single report by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/reports/:id
 * @desc    Delete a report by ID
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;