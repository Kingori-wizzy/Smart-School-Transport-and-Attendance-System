const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

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
const { apiLimiter, authLimiter, smsLimiter } = require('../middleware/rateLimiter'); // ✅ FIXED: Import specific limiters
const paginate = require('../utils/pagination');
const cache = require('../utils/cache');

// AI Models and Services
const absenteeismModel = require('../ai/models/absenteeismModel');
const routeOptimizationModel = require('../ai/models/routeOptimizationModel');
const analyticsService = require('../ai/services/analyticsService');
const dataPreprocessor = require('../ai/utils/dataPreprocessor');

// All routes require authentication and admin privileges (except where noted)
router.use(authMiddleware);

// ==================== BASIC ANALYTICS ====================

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
      // Use cache for expensive queries (5 minute TTL)
      const cacheKey = 'analytics_summary';
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, fromCache: true });
      }

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

      const data = {
        totalTrips,
        totalBoard,
        totalAlight,
        todayTrips: todayTrips.length,
        todayBoard: todayAttendance.filter(a => a.eventType === 'board').length,
        todayAlight: todayAttendance.filter(a => a.eventType === 'alight').length
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, data, 300);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error in analytics summary:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== AI-POWERED ANALYTICS ====================

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get complete analytics dashboard data (with AI insights)
 * @access  Admin only
 * @rate    10 requests per minute
 */
router.get(
  '/dashboard',
  roleMiddleware('admin'),
  apiLimiter, // ✅ FIXED: Use apiLimiter directly (not called as function)
  async (req, res) => {
    try {
      const cacheKey = 'analytics_dashboard';
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, fromCache: true });
      }

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
            const prediction = await routeOptimizationModel.predictTravelTime(route._id, {
              studentCount: route.capacity || 30,
              distance: route.distance || 20,
              weather: 'clear',
              traffic: 'normal'
            }).catch(err => {
              console.error(`Error predicting route ${route._id}:`, err.message);
              return null;
            });

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
            console.error(`Error processing route ${route._id}:`, error);
            return {
              id: route._id,
              name: route.name,
              stops: route.stops?.length || 0,
              efficiency: 'Error',
              error: error.message
            };
          }
        })
      );

      // Recent anomalies
      const recentAnomalies = await Notification.find({
        type: { $in: ['attendance_alert', 'route_deviation', 'delay_alert'] },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
      .populate('studentId', 'name grade')
      .populate('busId', 'number plate')
      .limit(10);

      const data = {
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
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, data, 300);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error in analytics dashboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/student/:studentId/predict
 * @desc    Get absenteeism predictions for a student
 * @access  Admin and Parent (for their own children)
 * @rate    30 requests per minute
 */
router.get(
  '/student/:studentId/predict',
  apiLimiter, // ✅ FIXED: Use apiLimiter
  async (req, res) => {
    try {
      const { studentId } = req.params;
      let { days = 7 } = req.query;

      // Validate studentId
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid student ID format' 
        });
      }

      // Validate days parameter
      days = parseInt(days);
      if (isNaN(days) || days < 1 || days > 30) {
        days = 7;
      }

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

      // Check cache
      const cacheKey = `student_predict_${studentId}_${days}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, fromCache: true });
      }

      // Train model on student data (light training)
      await absenteeismModel.train(studentId, 20);
      
      // Get predictions
      const predictions = await absenteeismModel.predict(studentId, days);
      
      // Get risk assessment
      const risk = await absenteeismModel.getRiskAssessment(studentId);

      // Get student info
      const student = await Student.findById(studentId).select('name grade classLevel');

      const data = {
        student,
        predictions,
        risk,
        generatedAt: new Date()
      };

      // Cache for 1 hour
      await cache.set(cacheKey, data, 3600);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error in student prediction:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/student/risk/all
 * @desc    Get all students with risk assessments (paginated)
 * @access  Admin only
 */
router.get(
  '/student/risk/all',
  roleMiddleware('admin'),
  async (req, res) => {
    try {
      const { page = 1, limit = 50, sortBy = 'riskScore', order = 'desc' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const maxLimit = Math.min(parseInt(limit), 100);

      const students = await Student.find({})
        .select('name grade classLevel analytics parentId')
        .populate('parentId', 'name phone email')
        .skip(skip)
        .limit(maxLimit);

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

      // Sort by risk score
      riskData.sort((a, b) => {
        if (order === 'desc') {
          return b.riskScore - a.riskScore;
        }
        return a.riskScore - b.riskScore;
      });

      const total = await Student.countDocuments({});

      res.json({
        success: true,
        data: riskData,
        pagination: {
          page: parseInt(page),
          limit: maxLimit,
          total,
          pages: Math.ceil(total / maxLimit)
        },
        summary: {
          total: riskData.length,
          critical: riskData.filter(r => r.riskLevel === 'critical').length,
          high: riskData.filter(r => r.riskLevel === 'high').length,
          medium: riskData.filter(r => r.riskLevel === 'medium').length,
          low: riskData.filter(r => r.riskLevel === 'low').length
        }
      });
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
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
  apiLimiter,
  async (req, res) => {
    try {
      const { routeId } = req.params;
      const { studentStops } = req.body;

      // Validate routeId
      if (!mongoose.Types.ObjectId.isValid(routeId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid route ID format' 
        });
      }

      // Validate studentStops
      if (studentStops && !Array.isArray(studentStops)) {
        return res.status(400).json({ 
          success: false, 
          error: 'studentStops must be an array' 
        });
      }

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
      console.error('Error optimizing route:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/route/:routeId/predict-time
 * @desc    Predict travel time for a route
 * @access  Admin and Driver
 * @rate    60 requests per minute
 */
router.post(
  '/route/:routeId/predict-time',
  apiLimiter,
  async (req, res) => {
    try {
      const { routeId } = req.params;
      const conditions = req.body;

      // Validate routeId
      if (!mongoose.Types.ObjectId.isValid(routeId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid route ID format' 
        });
      }

      // Default conditions if not provided
      const defaultConditions = {
        studentCount: 30,
        distance: 20,
        weather: 'clear',
        traffic: 'normal',
        ...conditions
      };

      // Validate numeric fields
      if (defaultConditions.studentCount < 0 || defaultConditions.studentCount > 100) {
        return res.status(400).json({ error: 'studentCount must be between 0 and 100' });
      }

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
      console.error('Error predicting travel time:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

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
      let { days = 30 } = req.query;
      
      // Validate days
      days = parseInt(days);
      if (isNaN(days) || days < 1 || days > 90) {
        days = 30;
      }

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
      console.error('Error fetching attendance trends:', error);
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
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const buses = await Bus.find()
        .populate('driver')
        .skip(skip)
        .limit(parseInt(limit));
      
      const performance = await Promise.all(buses.map(async (bus) => {
        const trips = await Trip.find({ 
          busId: bus._id,
          status: 'completed'
        }).sort({ startTime: -1 }).limit(10);

        const totalTrips = trips.length;
        const avgTravelTime = trips.reduce((sum, t) => {
          const duration = (t.endTime - t.startTime) / 1000 / 60;
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

      const total = await Bus.countDocuments();

      res.json({
        success: true,
        data: performance,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching bus performance:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/train/student/:studentId
 * @desc    Manually train model for a student
 * @access  Admin only
 * @rate    5 requests per hour
 */
router.post(
  '/train/student/:studentId',
  roleMiddleware('admin'),
  smsLimiter, // Using smsLimiter for low-rate operations
  async (req, res) => {
    try {
      const { studentId } = req.params;
      let { epochs = 50 } = req.body;

      // Validate studentId
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid student ID format' 
        });
      }

      // Validate epochs
      epochs = parseInt(epochs);
      if (isNaN(epochs) || epochs < 10 || epochs > 200) {
        epochs = 50;
      }

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
      console.error('Error training student model:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/train/route/:routeId
 * @desc    Manually train model for a route
 * @access  Admin only
 * @rate    5 requests per hour
 */
router.post(
  '/train/route/:routeId',
  roleMiddleware('admin'),
  smsLimiter,
  async (req, res) => {
    try {
      const { routeId } = req.params;
      let { epochs = 100 } = req.body;

      // Validate routeId
      if (!mongoose.Types.ObjectId.isValid(routeId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid route ID format' 
        });
      }

      // Validate epochs
      epochs = parseInt(epochs);
      if (isNaN(epochs) || epochs < 20 || epochs > 300) {
        epochs = 100;
      }

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
      console.error('Error training route model:', error);
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
      let { limit = 20 } = req.query;
      
      // Validate limit
      limit = Math.min(parseInt(limit), 100);

      const anomalies = await Notification.find({
        type: { $in: ['attendance_alert', 'route_deviation', 'delay_alert'] }
      })
      .populate('studentId', 'name grade')
      .populate('busId', 'number plate')
      .sort({ createdAt: -1 })
      .limit(limit);

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
      console.error('Error fetching anomalies:', error);
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

      // Validate type
      const validTypes = ['daily', 'weekly', 'monthly', 'yearly'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid report type' 
        });
      }

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
        const csv = convertToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${type}-${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: report
        });
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Helper function for CSV conversion
function convertToCSV(data) {
  const rows = [];
  rows.push(['Report Generated', data.generatedAt.toISOString()]);
  rows.push(['Period', data.period]);
  rows.push([]);
  rows.push(['Total Students', data.summary.totalStudents || 0]);
  rows.push(['Risk Distribution - Critical', data.summary.riskDistribution?.critical || 0]);
  rows.push(['Risk Distribution - High', data.summary.riskDistribution?.high || 0]);
  rows.push(['Risk Distribution - Medium', data.summary.riskDistribution?.medium || 0]);
  rows.push(['Risk Distribution - Low', data.summary.riskDistribution?.low || 0]);
  rows.push(['Total Routes', data.summary.totalRoutes || 0]);
  rows.push(['Attendance - Board', data.summary.attendance?.board || 0]);
  rows.push(['Attendance - Alight', data.summary.attendance?.alight || 0]);
  
  return rows.map(row => row.join(',')).join('\n');
}

module.exports = router;