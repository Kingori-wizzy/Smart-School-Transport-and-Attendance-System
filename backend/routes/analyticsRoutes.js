const express = require('express');
const router = express.Router();

// Models
const Attendance = require('../models/AttendanceRecord');
const Trip = require('../models/Trip');
const Student = require('../models/Student');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Notification = require('../models/Notification');

// Middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// AI Models and Services
const absenteeismModel = require('../ai/models/absenteeismModel');
const routeOptimizationModel = require('../ai/models/routeOptimizationModel');
const analyticsService = require('../ai/services/analyticsService');
const dataPreprocessor = require('../ai/utils/dataPreprocessor');

// All routes require authentication and admin privileges (except where noted)
router.use(authMiddleware);

// ==================== BASIC ANALYTICS (Your existing endpoints) ====================

/**
 * @route   GET /api/analytics/summary
 * @desc    Get basic analytics summary
 * @access  Admin only
 */
router.get(
  '/summary',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const trips = await Trip.find();
      const totalTrips = trips.length;

      const attendance = await Attendance.find();
      const totalBoard = attendance.filter(a => a.eventType === 'board').length;
      const totalAlight = attendance.filter(a => a.eventType === 'alight').length;

      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTrips = await Trip.find({
        startTime: { $gte: today }
      });
      
      const todayAttendance = await Attendance.find({
        createdAt: { $gte: today }
      });

      res.json({
        success: true,
        data: {
          totalTrips,
          totalBoard,
          totalAlight,
          todayTrips: todayTrips.length,
          todayBoard: todayAttendance.filter(a => a.eventType === 'board').length,
          todayAlight: todayAttendance.filter(a => a.eventType === 'alight').length
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== AI-POWERED ANALYTICS ====================

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get complete analytics dashboard data (with AI insights)
 * @access  Admin only
 */
router.get(
  '/dashboard',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const students = await Student.find({});
      const routes = await Route.find({}).populate('stops');
      const buses = await Bus.find({});

      // Basic stats
      const totalStudents = students.length;
      const totalRoutes = routes.length;
      const totalBuses = buses.length;

      // Attendance trends (last 30 days)
      const attendanceTrends = await Attendance.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              eventType: '$eventType'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Risk distribution from AI model
      const riskDistribution = {
        critical: students.filter(s => s.analytics?.riskLevel === 'critical').length,
        high: students.filter(s => s.analytics?.riskLevel === 'high').length,
        medium: students.filter(s => s.analytics?.riskLevel === 'medium').length,
        low: students.filter(s => s.analytics?.riskLevel === 'low').length,
        unknown: students.filter(s => !s.analytics?.riskLevel).length
      };

      // Route efficiency from AI
      const routeEfficiency = await Promise.all(
        routes.slice(0, 5).map(async (route) => {
          try {
            // Try to get AI prediction, fallback to basic stats
            const prediction = await routeOptimizationModel.predictTravelTime(route._id, {
              studentCount: route.capacity || 30,
              distance: route.distance || 20,
              weather: 'clear',
              traffic: 'normal'
            }).catch(() => null);

            return {
              id: route._id,
              name: route.name,
              stops: route.stops?.length || 0,
              efficiency: prediction?.predictedMinutes ? 
                `${Math.round(100 - (prediction.predictedMinutes / 60 * 100))}%` : 
                'Unknown',
              estimatedTime: prediction?.predictedMinutes || 'N/A',
              lastOptimized: route.optimization?.lastOptimized
            };
          } catch (error) {
            return {
              id: route._id,
              name: route.name,
              stops: route.stops?.length || 0,
              efficiency: 'Unknown',
              error: error.message
            };
          }
        })
      );

      // Recent anomalies
      const recentAnomalies = await Notification.find({
        type: 'attendance_alert',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).populate('studentId', 'name grade').limit(10);

      res.json({
        success: true,
        data: {
          summary: {
            totalStudents,
            totalRoutes,
            totalBuses,
            activeTrips: await Trip.countDocuments({ status: 'active' })
          },
          attendanceTrends,
          riskDistribution,
          routeEfficiency,
          recentAnomalies,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/student/:studentId/predict
 * @desc    Get absenteeism predictions for a student
 * @access  Admin and Parent (for their own children)
 */
router.get('/student/:studentId/predict', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { days = 7 } = req.query;

    // Check authorization (parents can only see their children)
    if (req.user.role === 'parent') {
      const student = await Student.findById(studentId);
      if (!student || student.parentId?.toString() !== req.user.id) {
        return res.status(403).json({ 
          success: false, 
          error: 'Not authorized to view this student' 
        });
      }
    }

    // Train model on student data (light training)
    await absenteeismModel.train(studentId, 20);
    
    // Get predictions
    const predictions = await absenteeismModel.predict(studentId, parseInt(days));
    
    // Get risk assessment
    const risk = await absenteeismModel.getRiskAssessment(studentId);

    // Get student info
    const student = await Student.findById(studentId).select('name grade classLevel');

    res.json({
      success: true,
      data: {
        student,
        predictions,
        risk,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/analytics/student/risk/all
 * @desc    Get all students with risk assessments
 * @access  Admin only
 */
router.get(
  '/student/risk/all',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const students = await Student.find({})
        .select('name grade classLevel analytics parentId')
        .populate('parentId', 'name phone email');

      const riskData = students.map(s => ({
        id: s._id,
        name: s.name,
        grade: s.grade,
        classLevel: s.classLevel,
        riskLevel: s.analytics?.riskLevel || 'unknown',
        riskScore: s.analytics?.riskScore || 0,
        predictedAbsences: s.analytics?.predictedAbsences || 0,
        parent: s.parentId,
        lastAssessed: s.analytics?.lastAssessed
      }));

      // Sort by risk score (highest first)
      riskData.sort((a, b) => b.riskScore - a.riskScore);

      res.json({
        success: true,
        data: riskData,
        summary: {
          total: riskData.length,
          critical: riskData.filter(r => r.riskLevel === 'critical').length,
          high: riskData.filter(r => r.riskLevel === 'high').length,
          medium: riskData.filter(r => r.riskLevel === 'medium').length,
          low: riskData.filter(r => r.riskLevel === 'low').length
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/route/:routeId/optimize
 * @desc    Get route optimization suggestions
 * @access  Admin only
 */
router.post(
  '/route/:routeId/optimize',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { routeId } = req.params;
      const { studentStops } = req.body;

      // Train model
      await routeOptimizationModel.train(routeId, 30);
      
      // Get optimization
      const optimization = await routeOptimizationModel.optimizeRouteOrder(routeId, studentStops || []);

      // Get route details
      const route = await Route.findById(routeId).populate('stops');

      res.json({
        success: true,
        data: {
          route: {
            id: route._id,
            name: route.name,
            currentStops: route.stops
          },
          optimization,
          generatedAt: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/route/:routeId/predict-time
 * @desc    Predict travel time for a route
 * @access  Admin and Driver
 */
router.post('/route/:routeId/predict-time', async (req, res) => {
  try {
    const { routeId } = req.params;
    const conditions = req.body;

    // Default conditions if not provided
    const defaultConditions = {
      studentCount: 30,
      distance: 20,
      weather: 'clear',
      traffic: 'normal',
      ...conditions
    };

    const prediction = await routeOptimizationModel.predictTravelTime(routeId, defaultConditions);

    // Get route info
    const route = await Route.findById(routeId).select('name distance');

    res.json({
      success: true,
      data: {
        route: {
          id: routeId,
          name: route?.name || 'Unknown'
        },
        prediction,
        conditions: defaultConditions,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route   GET /api/analytics/trends/attendance
 * @desc    Get attendance trends over time
 * @access  Admin only
 */
router.get(
  '/trends/attendance',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const attendance = await Attendance.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              eventType: '$eventType'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]);

      // Format for charts
      const chartData = [];
      const dateMap = new Map();

      attendance.forEach(item => {
        const date = item._id.date;
        if (!dateMap.has(date)) {
          dateMap.set(date, { date, boarding: 0, alighting: 0 });
        }
        const dayData = dateMap.get(date);
        if (item._id.eventType === 'board') {
          dayData.boarding = item.count;
        } else if (item._id.eventType === 'alight') {
          dayData.alighting = item.count;
        }
      });

      dateMap.forEach(value => chartData.push(value));

      res.json({
        success: true,
        data: {
          chartData,
          summary: {
            total: attendance.reduce((sum, item) => sum + item.count, 0),
            averagePerDay: Math.round(attendance.reduce((sum, item) => sum + item.count, 0) / days)
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/performance/buses
 * @desc    Get bus performance metrics
 * @access  Admin only
 */
router.get(
  '/performance/buses',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const buses = await Bus.find().populate('driver');
      
      const performance = await Promise.all(buses.map(async (bus) => {
        const trips = await Trip.find({ 
          busId: bus._id,
          status: 'completed'
        }).sort({ startTime: -1 }).limit(10);

        const totalTrips = trips.length;
        const avgTravelTime = trips.reduce((sum, t) => {
          const duration = (t.endTime - t.startTime) / 1000 / 60; // minutes
          return sum + duration;
        }, 0) / (totalTrips || 1);

        const attendance = await Attendance.countDocuments({ 
          busId: bus._id,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        return {
          id: bus._id,
          number: bus.number,
          plate: bus.plate,
          driver: bus.driver?.name || 'Unassigned',
          totalTrips,
          avgTravelTime: Math.round(avgTravelTime),
          weeklyAttendance: attendance,
          lastTrip: trips[0]?.startTime
        };
      }));

      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/train/student/:studentId
 * @desc    Manually train model for a student
 * @access  Admin only
 */
router.post(
  '/train/student/:studentId',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const { epochs = 50 } = req.body;

      const history = await absenteeismModel.train(studentId, epochs);

      // Update student record
      await Student.findByIdAndUpdate(studentId, {
        'analytics.lastTrained': new Date(),
        'analytics.trainingEpochs': epochs
      });

      res.json({
        success: true,
        data: {
          studentId,
          epochs,
          finalLoss: history.history.loss[history.history.loss.length - 1],
          finalAccuracy: history.history.acc[history.history.acc.length - 1],
          trainingComplete: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/train/route/:routeId
 * @desc    Manually train model for a route
 * @access  Admin only
 */
router.post(
  '/train/route/:routeId',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { routeId } = req.params;
      const { epochs = 100 } = req.body;

      const result = await routeOptimizationModel.train(routeId, epochs);

      // Update route record
      await Route.findByIdAndUpdate(routeId, {
        'optimization.lastTrained': new Date(),
        'optimization.trainingEpochs': epochs
      });

      res.json({
        success: true,
        data: {
          routeId,
          epochs,
          finalLoss: result.history.history.loss[result.history.history.loss.length - 1],
          finalMAE: result.history.history.mae[result.history.history.mae.length - 1],
          trainingComplete: new Date()
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/anomalies/recent
 * @desc    Get recent anomalies detected
 * @access  Admin only
 */
router.get(
  '/anomalies/recent',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      const anomalies = await Notification.find({
        type: { $in: ['attendance_alert', 'route_deviation', 'delay_alert'] }
      })
      .populate('studentId', 'name grade')
      .populate('busId', 'number plate')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

      const summary = {
        total: anomalies.length,
        attendance: anomalies.filter(a => a.type === 'attendance_alert').length,
        route: anomalies.filter(a => a.type === 'route_deviation').length,
        delay: anomalies.filter(a => a.type === 'delay_alert').length
      };

      res.json({
        success: true,
        data: {
          anomalies,
          summary
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics report
 * @access  Admin only
 */
router.get(
  '/export',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { type = 'monthly', format = 'json' } = req.query;

      // Generate comprehensive report
      const report = {
        generatedAt: new Date(),
        period: type,
        summary: {},
        details: {}
      };

      // Get students with risk data
      const students = await Student.find({})
        .select('name grade classLevel analytics');

      report.summary.totalStudents = students.length;
      report.summary.riskDistribution = {
        critical: students.filter(s => s.analytics?.riskLevel === 'critical').length,
        high: students.filter(s => s.analytics?.riskLevel === 'high').length,
        medium: students.filter(s => s.analytics?.riskLevel === 'medium').length,
        low: students.filter(s => s.analytics?.riskLevel === 'low').length
      };

      // Get attendance stats
      const attendance = await Attendance.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { eventType: '$eventType' },
            count: { $sum: 1 }
          }
        }
      ]);

      report.summary.attendance = attendance.reduce((acc, item) => {
        acc[item._id.eventType] = item.count;
        return acc;
      }, {});

      // Get route performance
      const routes = await Route.find();
      report.summary.totalRoutes = routes.length;

      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${type}.csv`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: report
        });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Helper function for CSV conversion
function convertToCSV(data) {
  const rows = [];
  rows.push(['Report Generated', data.generatedAt]);
  rows.push(['Period', data.period]);
  rows.push([]);
  rows.push(['Total Students', data.summary.totalStudents]);
  rows.push(['Risk Distribution - Critical', data.summary.riskDistribution.critical]);
  rows.push(['Risk Distribution - High', data.summary.riskDistribution.high]);
  rows.push(['Risk Distribution - Medium', data.summary.riskDistribution.medium]);
  rows.push(['Risk Distribution - Low', data.summary.riskDistribution.low]);
  
  return rows.map(row => row.join(',')).join('\n');
}

module.exports = router;