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
const { apiLimiter, authLimiter, smsLimiter } = require('../middleware/rateLimiter');
const paginate = require('../utils/pagination');
const cache = require('../utils/cache');

// AI Models and Services (Now using statistical/algorithmic versions - no TensorFlow)
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

      // Get all trips
      const trips = await Trip.find();
      const totalTrips = trips.length;

      // Get all attendance records
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
        todayAlight: todayAttendance.filter(a => a.eventType === 'alight').length,
        lastUpdated: new Date()
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
  apiLimiter,
  async (req, res) => {
    try {
      const cacheKey = 'analytics_dashboard';
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, fromCache: true });
      }

      // Get all data
      const students = await Student.find({});
      const routes = await Route.find({}).populate('stops');
      const buses = await Bus.find({});

      // Basic stats
      const totalStudents = students.length;
      const totalRoutes = routes.length;
      const totalBuses = buses.length;
      const activeTrips = await Trip.countDocuments({ status: { $in: ['active', 'in-progress', 'running'] } });

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

      // Risk distribution from student analytics (or from AI model)
      const riskDistribution = {
        critical: students.filter(s => s.analytics?.riskLevel === 'critical').length,
        high: students.filter(s => s.analytics?.riskLevel === 'high').length,
        medium: students.filter(s => s.analytics?.riskLevel === 'medium').length,
        low: students.filter(s => s.analytics?.riskLevel === 'low').length,
        unknown: students.filter(s => !s.analytics?.riskLevel).length
      };

      // Route efficiency from AI model (with error handling)
      const routeEfficiency = await Promise.all(
        routes.slice(0, 10).map(async (route) => {
          try {
            // Get historical trip data for this route
            const historicalTrips = await Trip.find({ 
              routeId: route._id,
              status: 'completed'
            }).sort({ startTime: -1 }).limit(30);
            
            const avgHistoricalTime = historicalTrips.length > 0
              ? historicalTrips.reduce((sum, t) => {
                  const duration = t.endTime && t.startTime 
                    ? (t.endTime - t.startTime) / (1000 * 60)
                    : 45;
                  return sum + duration;
                }, 0) / historicalTrips.length
              : 45;

            // Get prediction from model
            const prediction = await routeOptimizationModel.predictTravelTime(route._id, {
              studentCount: route.capacity || 30,
              distance: route.distance || 20,
              weather: 'clear',
              traffic: 'normal'
            }).catch(err => {
              console.error(`Error predicting route ${route._id}:`, err.message);
              return { predictedMinutes: avgHistoricalTime, confidence: 'low' };
            });

            const predictedTime = prediction?.predictedMinutes || avgHistoricalTime;
            const efficiencyScore = Math.max(0, Math.min(100, 100 - ((predictedTime - 30) / 90 * 100)));

            return {
              id: route._id,
              name: route.name || `Route ${route._id}`,
              stops: route.stops?.length || 0,
              efficiency: `${Math.round(efficiencyScore)}%`,
              efficiencyScore: Math.round(efficiencyScore),
              estimatedTime: Math.round(predictedTime),
              historicalTime: Math.round(avgHistoricalTime),
              confidence: prediction?.confidence || 'medium',
              lastOptimized: route.optimization?.lastOptimized || route.updatedAt
            };
          } catch (error) {
            console.error(`Error processing route ${route._id}:`, error);
            return {
              id: route._id,
              name: route.name || `Route ${route._id}`,
              stops: route.stops?.length || 0,
              efficiency: 'Unknown',
              efficiencyScore: 0,
              estimatedTime: 'N/A',
              error: error.message
            };
          }
        })
      );

      // Sort by efficiency score
      routeEfficiency.sort((a, b) => (b.efficiencyScore || 0) - (a.efficiencyScore || 0));

      // Recent anomalies (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentAnomalies = await Notification.find({
        type: { $in: ['attendance_alert', 'route_deviation', 'delay_alert', 'emergency'] },
        createdAt: { $gte: sevenDaysAgo }
      })
      .populate('studentId', 'name grade classLevel')
      .populate('parentId', 'name phone email')
      .sort({ createdAt: -1 })
      .limit(15);

      // Calculate overall system health score
      const healthScore = {
        attendance: riskDistribution.critical > 5 ? 60 : riskDistribution.high > 10 ? 75 : 90,
        routes: routeEfficiency.length > 0 
          ? routeEfficiency.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) / routeEfficiency.length 
          : 85,
        buses: totalBuses > 0 ? 85 : 70,
        overall: 0
      };
      healthScore.overall = Math.round((healthScore.attendance + healthScore.routes + healthScore.buses) / 3);

      const data = {
        summary: {
          totalStudents,
          totalRoutes,
          totalBuses,
          activeTrips,
          systemHealth: healthScore.overall,
          generatedAt: new Date()
        },
        attendanceTrends: this._formatAttendanceTrends(attendanceTrends),
        riskDistribution,
        routeEfficiency: routeEfficiency.slice(0, 5),
        recentAnomalies: recentAnomalies.map(a => ({
          id: a._id,
          type: a.type,
          title: a.title,
          message: a.message,
          student: a.studentId,
          parent: a.parentId,
          createdAt: a.createdAt
        })),
        healthScore
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

// Helper function to format attendance trends for charts
function _formatAttendanceTrends(attendanceTrends) {
  const chartData = [];
  const dateMap = new Map();

  attendanceTrends.forEach(item => {
    const date = item._id.date;
    if (!dateMap.has(date)) {
      dateMap.set(date, { date, board: 0, alight: 0 });
    }
    const dayData = dateMap.get(date);
    if (item._id.eventType === 'board') {
      dayData.board = item.count;
    } else if (item._id.eventType === 'alight') {
      dayData.alight = item.count;
    }
  });

  dateMap.forEach(value => chartData.push(value));
  return chartData.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * @route   GET /api/analytics/student/:studentId/predict
 * @desc    Get absenteeism predictions for a student
 * @access  Admin and Parent (for their own children)
 * @rate    30 requests per minute
 */
router.get(
  '/student/:studentId/predict',
  apiLimiter,
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
        if (!student || (student.parentId && student.parentId.toString() !== req.user.id)) {
          return res.status(403).json({ 
            success: false, 
            error: 'Not authorized to view this student' 
          });
        }
      }

      // Check cache (shorter cache for predictions)
      const cacheKey = `student_predict_${studentId}_${days}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: cached, fromCache: true });
      }

      // Ensure model is initialized
      if (!absenteeismModel.initialized) {
        absenteeismModel.createModel();
      }

      // Get predictions (using statistical model)
      const predictions = await absenteeismModel.predict(studentId, days);
      
      // Get risk assessment
      const risk = await absenteeismModel.getRiskAssessment(studentId);

      // Get student info
      const student = await Student.findById(studentId).select('firstName lastName name grade classLevel parentId');

      // Get attendance history summary
      const attendanceHistory = await Attendance.find({ 
        studentId: studentId,
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 }).limit(30);

      const data = {
        student: {
          id: student._id,
          name: student.firstName ? `${student.firstName} ${student.lastName}` : student.name,
          grade: student.grade,
          classLevel: student.classLevel
        },
        predictions,
        risk,
        recentAttendance: attendanceHistory.map(a => ({
          date: a.createdAt,
          type: a.eventType,
          location: a.gpsSnapshot
        })),
        generatedAt: new Date()
      };

      // Cache for 30 minutes
      await cache.set(cacheKey, data, 1800);

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
      const { page = 1, limit = 50, sortBy = 'riskScore', order = 'desc', riskLevel } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const maxLimit = Math.min(parseInt(limit), 100);

      // Build query
      let query = {};
      if (riskLevel && riskLevel !== 'all') {
        query['analytics.riskLevel'] = riskLevel;
      }

      const students = await Student.find(query)
        .select('firstName lastName name grade classLevel analytics parentId')
        .populate('parentId', 'firstName lastName name phone email')
        .skip(skip)
        .limit(maxLimit);

      // Calculate risk scores for students without analytics
      const riskData = await Promise.all(students.map(async (s) => {
        let riskScore = s.analytics?.riskScore || 0;
        let riskLevelValue = s.analytics?.riskLevel || 'unknown';
        
        // If no risk assessment exists, generate one
        if (!s.analytics || !s.analytics.riskLevel) {
          try {
            const assessment = await absenteeismModel.getRiskAssessment(s._id);
            riskScore = assessment.riskScore;
            riskLevelValue = assessment.riskLevel;
          } catch (err) {
            console.error(`Error assessing risk for ${s._id}:`, err.message);
          }
        }

        return {
          id: s._id,
          name: s.firstName ? `${s.firstName} ${s.lastName}` : s.name,
          grade: s.grade,
          classLevel: s.classLevel,
          riskLevel: riskLevelValue,
          riskScore: riskScore,
          predictedAbsences: s.analytics?.predictedAbsences || Math.round(riskScore * 30),
          parent: s.parentId ? {
            id: s.parentId._id,
            name: s.parentId.firstName ? `${s.parentId.firstName} ${s.parentId.lastName}` : s.parentId.name,
            phone: s.parentId.phone,
            email: s.parentId.email
          } : null,
          lastAssessed: s.analytics?.lastAssessed || new Date()
        };
      }));

      // Sort by risk score
      riskData.sort((a, b) => {
        if (order === 'desc') {
          return b.riskScore - a.riskScore;
        }
        return a.riskScore - b.riskScore;
      });

      const total = await Student.countDocuments(query);

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
          low: riskData.filter(r => r.riskLevel === 'low').length,
          unknown: riskData.filter(r => r.riskLevel === 'unknown').length
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

      // Get route details
      const route = await Route.findById(routeId).populate('stops');
      if (!route) {
        return res.status(404).json({ 
          success: false, 
          error: 'Route not found' 
        });
      }

      // Prepare stops for optimization
      let stopsToOptimize = studentStops;
      if (!stopsToOptimize || stopsToOptimize.length === 0) {
        // Use route stops if no stops provided
        stopsToOptimize = (route.stops || []).map(stop => ({
          id: stop._id,
          name: stop.name,
          location: stop.location || stop.coordinates,
          studentCount: stop.studentCount || 1
        }));
      }

      // Get optimization
      const optimization = await routeOptimizationModel.optimizeRouteOrder(routeId, stopsToOptimize || []);

      // Calculate estimated savings
      const originalDistance = this._calculateTotalDistance(stopsToOptimize);
      const optimizedDistance = optimization.totalDistance || originalDistance * 0.85;
      const savings = {
        distance: Math.round(originalDistance - optimizedDistance),
        percentage: Math.round(((originalDistance - optimizedDistance) / originalDistance) * 100),
        time: optimization.estimatedTime ? Math.round(optimization.estimatedTime * 0.15) : 0
      };

      res.json({
        success: true,
        data: {
          route: {
            id: route._id,
            name: route.name,
            currentStopsCount: route.stops?.length || 0,
            currentDistance: route.distance || originalDistance
          },
          optimization: {
            optimizedStops: optimization.optimizedStops,
            totalDistance: optimization.totalDistance,
            estimatedTime: optimization.estimatedTime,
            stopsCount: optimization.stopsCount,
            savings
          },
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error optimizing route:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Helper to calculate total distance
function _calculateTotalDistance(stops) {
  if (!stops || stops.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < stops.length; i++) {
    const loc1 = stops[i-1].location;
    const loc2 = stops[i].location;
    if (loc1 && loc2) {
      total += haversineDistance(loc1, loc2);
    }
  }
  return Math.round(total * 10) / 10;
}

function haversineDistance(loc1, loc2) {
  const R = 6371;
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(loc1.lat * Math.PI/180) * Math.cos(loc2.lat * Math.PI/180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

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

      // Get route info
      const route = await Route.findById(routeId).select('name distance stops capacity');
      if (!route) {
        return res.status(404).json({ 
          success: false, 
          error: 'Route not found' 
        });
      }

      // Default conditions if not provided
      const defaultConditions = {
        studentCount: route.capacity || 30,
        distance: route.distance || 20,
        weather: conditions.weather || 'clear',
        traffic: conditions.traffic || 'normal',
        timeOfDay: conditions.timeOfDay || new Date().getHours()
      };

      // Validate numeric fields
      if (defaultConditions.studentCount < 0 || defaultConditions.studentCount > 100) {
        return res.status(400).json({ error: 'studentCount must be between 0 and 100' });
      }

      const prediction = await routeOptimizationModel.predictTravelTime(routeId, defaultConditions);

      // Get historical average for comparison
      const historicalTrips = await Trip.find({ 
        routeId: routeId,
        status: 'completed'
      }).sort({ startTime: -1 }).limit(30);
      
      const historicalAvg = historicalTrips.length > 0
        ? historicalTrips.reduce((sum, t) => {
            const duration = t.endTime && t.startTime 
              ? (t.endTime - t.startTime) / (1000 * 60)
              : 45;
            return sum + duration;
          }, 0) / historicalTrips.length
        : null;

      res.json({
        success: true,
        data: {
          route: {
            id: routeId,
            name: route.name,
            distance: route.distance
          },
          prediction: {
            estimatedMinutes: prediction.predictedMinutes,
            confidence: prediction.confidence,
            factors: prediction.factors,
            multiplier: prediction.multiplier
          },
          historicalAverage: historicalAvg ? Math.round(historicalAvg) : null,
          conditions: defaultConditions,
          recommendations: this._generateTravelRecommendations(prediction),
          generatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Error predicting travel time:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Helper to generate travel recommendations
function _generateTravelRecommendations(prediction) {
  const recommendations = [];
  
  if (prediction.predictedMinutes > 60) {
    recommendations.push('⚠️ Consider earlier departure to avoid peak traffic');
  }
  
  if (prediction.factors?.some(f => f.includes('Heavy traffic'))) {
    recommendations.push('🚗 Heavy traffic expected - alternative route recommended');
  }
  
  if (prediction.factors?.some(f => f.includes('Rain'))) {
    recommendations.push('🌧️ Rain expected - allow extra travel time');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Normal travel conditions expected');
  }
  
  return recommendations;
}

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
      let { days = 30, groupBy = 'day' } = req.query;
      
      // Validate days
      days = parseInt(days);
      if (isNaN(days) || days < 1 || days > 90) {
        days = 30;
      }

      // Build date format based on groupBy
      let dateFormat = '%Y-%m-%d';
      if (groupBy === 'week') dateFormat = '%Y-%U';
      if (groupBy === 'month') dateFormat = '%Y-%m';

      const attendance = await Attendance.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: dateFormat, date: '$createdAt' } },
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
          dateMap.set(date, { date, board: 0, alight: 0 });
        }
        const dayData = dateMap.get(date);
        if (item._id.eventType === 'board') {
          dayData.board = item.count;
        } else if (item._id.eventType === 'alight') {
          dayData.alight = item.count;
        }
      });

      dateMap.forEach(value => chartData.push(value));
      chartData.sort((a, b) => a.date.localeCompare(b.date));

      // Calculate trends
      const totalBoard = chartData.reduce((sum, d) => sum + d.board, 0);
      const totalAlight = chartData.reduce((sum, d) => sum + d.alight, 0);
      const avgDailyBoard = totalBoard / chartData.length;

      res.json({
        success: true,
        data: {
          chartData,
          summary: {
            totalBoard,
            totalAlight,
            averageDailyBoard: Math.round(avgDailyBoard),
            daysAnalyzed: chartData.length,
            period: groupBy
          },
          trends: {
            increasing: chartData.slice(-7).reduce((s, d) => s + d.board, 0) > 
                       chartData.slice(-14, -7).reduce((s, d) => s + d.board, 0),
            bestDay: chartData.reduce((best, d) => d.board > best.board ? d : best, { board: 0 })
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
      const { page = 1, limit = 20, sortBy = 'trips', order = 'desc' } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const maxLimit = Math.min(parseInt(limit), 50);
      
      const buses = await Bus.find()
        .populate('driver', 'firstName lastName name phone')
        .skip(skip)
        .limit(maxLimit);
      
      const performance = await Promise.all(buses.map(async (bus) => {
        const trips = await Trip.find({ 
          busId: bus._id,
          status: 'completed'
        }).sort({ startTime: -1 }).limit(30);

        const totalTrips = trips.length;
        const completedTrips = trips.filter(t => t.status === 'completed').length;
        
        const avgTravelTime = trips.reduce((sum, t) => {
          const duration = t.endTime && t.startTime 
            ? (t.endTime - t.startTime) / (1000 * 60)
            : 45;
          return sum + duration;
        }, 0) / (totalTrips || 1);

        const lastWeekAttendance = await Attendance.countDocuments({ 
          busId: bus._id,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        const lastWeekTrips = await Trip.countDocuments({
          busId: bus._id,
          startTime: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        });

        return {
          id: bus._id,
          number: bus.number || bus.busNumber,
          plate: bus.plate || bus.registrationNumber,
          capacity: bus.capacity,
          driver: bus.driver ? {
            id: bus.driver._id,
            name: bus.driver.firstName ? `${bus.driver.firstName} ${bus.driver.lastName}` : bus.driver.name,
            phone: bus.driver.phone
          } : null,
          stats: {
            totalTrips,
            completedTrips,
            completionRate: totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0,
            avgTravelTime: Math.round(avgTravelTime),
            weeklyAttendance: lastWeekAttendance,
            weeklyTrips: lastWeekTrips
          },
          lastActive: trips[0]?.startTime || bus.updatedAt
        };
      }));

      // Sort based on parameter
      performance.sort((a, b) => {
        let aVal = a.stats[sortBy] || 0;
        let bVal = b.stats[sortBy] || 0;
        if (sortBy === 'driver') {
          aVal = a.driver?.name || '';
          bVal = b.driver?.name || '';
          return order === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        }
        return order === 'desc' ? bVal - aVal : aVal - bVal;
      });

      const total = await Bus.countDocuments();

      res.json({
        success: true,
        data: performance,
        pagination: {
          page: parseInt(page),
          limit: maxLimit,
          total,
          pages: Math.ceil(total / maxLimit)
        },
        summary: {
          totalBuses: total,
          activeBuses: performance.filter(b => b.stats.weeklyTrips > 0).length,
          avgCompletionRate: Math.round(performance.reduce((s, b) => s + b.stats.completionRate, 0) / performance.length)
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
 * @desc    Manually train/update model for a student
 * @access  Admin only
 * @rate    5 requests per hour
 */
router.post(
  '/train/student/:studentId',
  roleMiddleware('admin'),
  smsLimiter,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      let { epochs = 20 } = req.body;

      // Validate studentId
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid student ID format' 
        });
      }

      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ 
          success: false, 
          error: 'Student not found' 
        });
      }

      // Validate epochs
      epochs = parseInt(epochs);
      if (isNaN(epochs) || epochs < 5 || epochs > 100) {
        epochs = 20;
      }

      // Train model
      const history = await absenteeismModel.train(studentId, epochs);
      
      // Get updated risk assessment
      const risk = await absenteeismModel.getRiskAssessment(studentId);

      // Update student record with analytics
      await Student.findByIdAndUpdate(studentId, {
        'analytics': {
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          predictedAbsences: risk.predictedAbsences,
          lastTrained: new Date(),
          trainingEpochs: epochs,
          lastAssessed: new Date()
        }
      });

      res.json({
        success: true,
        data: {
          studentId,
          studentName: student.firstName ? `${student.firstName} ${student.lastName}` : student.name,
          epochs,
          riskLevel: risk.riskLevel,
          riskScore: risk.riskScore,
          predictedAbsences: risk.predictedAbsences,
          recommendations: risk.recommendations,
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
 * @desc    Manually train/update model for a route
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
      let { epochs = 30 } = req.body;

      // Validate routeId
      if (!mongoose.Types.ObjectId.isValid(routeId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid route ID format' 
        });
      }

      const route = await Route.findById(routeId);
      if (!route) {
        return res.status(404).json({ 
          success: false, 
          error: 'Route not found' 
        });
      }

      // Validate epochs
      epochs = parseInt(epochs);
      if (isNaN(epochs) || epochs < 10 || epochs > 150) {
        epochs = 30;
      }

      // Train model
      const result = await routeOptimizationModel.train(routeId, epochs);
      
      // Get current status
      const status = routeOptimizationModel.getStatus();

      // Update route record
      await Route.findByIdAndUpdate(routeId, {
        'optimization': {
          lastTrained: new Date(),
          trainingEpochs: epochs,
          dataPoints: status.dataPoints,
          avgTravelTime: result.history?.loss || null
        }
      });

      res.json({
        success: true,
        data: {
          routeId,
          routeName: route.name,
          epochs,
          dataPoints: status.dataPoints,
          initialized: status.initialized,
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
      let { limit = 20, type } = req.query;
      
      // Validate limit
      limit = Math.min(parseInt(limit) || 20, 100);

      // Build query
      let query = {
        type: { $in: ['attendance_alert', 'route_deviation', 'delay_alert', 'emergency'] },
        createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
      };
      
      if (type && type !== 'all') {
        query.type = type;
      }

      const anomalies = await Notification.find(query)
        .populate('studentId', 'firstName lastName name grade classLevel')
        .populate('busId', 'number plate')
        .populate('parentId', 'firstName lastName name phone email')
        .sort({ createdAt: -1 })
        .limit(limit);

      const summary = {
        total: anomalies.length,
        attendance: anomalies.filter(a => a.type === 'attendance_alert').length,
        route: anomalies.filter(a => a.type === 'route_deviation').length,
        delay: anomalies.filter(a => a.type === 'delay_alert').length,
        emergency: anomalies.filter(a => a.type === 'emergency').length
      };

      // Format anomalies for response
      const formattedAnomalies = anomalies.map(a => ({
        id: a._id,
        type: a.type,
        title: a.title,
        message: a.message,
        severity: a.severity || (a.type === 'emergency' ? 'critical' : 'medium'),
        student: a.studentId ? {
          id: a.studentId._id,
          name: a.studentId.firstName ? `${a.studentId.firstName} ${a.studentId.lastName}` : a.studentId.name,
          grade: a.studentId.grade
        } : null,
        bus: a.busId ? {
          id: a.busId._id,
          number: a.busId.number,
          plate: a.busId.plate
        } : null,
        parent: a.parentId ? {
          id: a.parentId._id,
          name: a.parentId.firstName ? `${a.parentId.firstName} ${a.parentId.lastName}` : a.parentId.name,
          phone: a.parentId.phone
        } : null,
        createdAt: a.createdAt,
        read: a.isRead
      }));

      res.json({
        success: true,
        data: {
          anomalies: formattedAnomalies,
          summary,
          generatedAt: new Date()
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
      const { type = 'monthly', format = 'json', startDate, endDate } = req.query;

      // Validate type
      const validTypes = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid report type. Must be: daily, weekly, monthly, yearly, custom' 
        });
      }

      // Determine date range
      let start, end;
      if (type === 'custom' && startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        end = new Date();
        switch(type) {
          case 'daily':
            start = new Date(end);
            start.setDate(start.getDate() - 1);
            break;
          case 'weekly':
            start = new Date(end);
            start.setDate(start.getDate() - 7);
            break;
          case 'monthly':
            start = new Date(end);
            start.setMonth(start.getMonth() - 1);
            break;
          case 'yearly':
            start = new Date(end);
            start.setFullYear(start.getFullYear() - 1);
            break;
          default:
            start = new Date(end);
            start.setMonth(start.getMonth() - 1);
        }
      }

      // Generate comprehensive report
      const report = {
        generatedAt: new Date(),
        period: {
          type,
          start: start.toISOString(),
          end: end.toISOString()
        },
        summary: {},
        details: {
          students: {},
          attendance: {},
          routes: {},
          alerts: {}
        }
      };

      // Get students with risk data
      const students = await Student.find({})
        .select('firstName lastName name grade classLevel analytics');
      
      report.summary.totalStudents = students.length;
      report.summary.riskDistribution = {
        critical: students.filter(s => s.analytics?.riskLevel === 'critical').length,
        high: students.filter(s => s.analytics?.riskLevel === 'high').length,
        medium: students.filter(s => s.analytics?.riskLevel === 'medium').length,
        low: students.filter(s => s.analytics?.riskLevel === 'low').length
      };
      
      report.details.students = students.map(s => ({
        name: s.firstName ? `${s.firstName} ${s.lastName}` : s.name,
        grade: s.grade,
        riskLevel: s.analytics?.riskLevel || 'unknown',
        riskScore: s.analytics?.riskScore || 0
      }));

      // Get attendance stats for period
      const attendance = await Attendance.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { 
              eventType: '$eventType',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            },
            count: { $sum: 1 }
          }
        }
      ]);

      const boardCount = attendance.filter(a => a._id.eventType === 'board').reduce((s, a) => s + a.count, 0);
      const alightCount = attendance.filter(a => a._id.eventType === 'alight').reduce((s, a) => s + a.count, 0);
      
      report.summary.attendance = {
        totalBoard: boardCount,
        totalAlight: alightCount,
        averageDaily: Math.round((boardCount + alightCount) / (Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1))
      };
      
      report.details.attendance = attendance;

      // Get route performance
      const routes = await Route.find().populate('stops');
      const trips = await Trip.find({
        startTime: { $gte: start, $lte: end }
      });
      
      report.summary.totalRoutes = routes.length;
      report.summary.totalTrips = trips.length;
      
      report.details.routes = routes.map(r => ({
        name: r.name,
        stops: r.stops?.length || 0,
        trips: trips.filter(t => t.routeId?.toString() === r._id.toString()).length
      }));

      // Get alerts during period
      const alerts = await Notification.find({
        createdAt: { $gte: start, $lte: end },
        type: { $in: ['attendance_alert', 'route_deviation', 'delay_alert', 'emergency'] }
      });
      
      report.summary.alerts = {
        total: alerts.length,
        byType: {
          attendance: alerts.filter(a => a.type === 'attendance_alert').length,
          route: alerts.filter(a => a.type === 'route_deviation').length,
          delay: alerts.filter(a => a.type === 'delay_alert').length,
          emergency: alerts.filter(a => a.type === 'emergency').length
        }
      };
      
      report.details.alerts = alerts.slice(0, 50).map(a => ({
        type: a.type,
        title: a.title,
        message: a.message,
        createdAt: a.createdAt
      }));

      // Export based on format
      if (format === 'csv') {
        const csv = this._convertReportToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${type}-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
      } else if (format === 'excel') {
        // For Excel, we send CSV but with .xls extension (Excel opens it)
        const csv = this._convertReportToCSV(report);
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-report-${type}-${new Date().toISOString().split('T')[0]}.xls`);
        return res.send(csv);
      }
      
      // Default: JSON
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Helper function for CSV conversion
function _convertReportToCSV(report) {
  const rows = [];
  
  // Header
  rows.push(['=== SMART SCHOOL TRANSPORT SYSTEM ANALYTICS REPORT ===']);
  rows.push(['Generated At', report.generatedAt.toISOString()]);
  rows.push(['Report Period', `${report.period.start} to ${report.period.end}`]);
  rows.push(['Period Type', report.period.type]);
  rows.push([]);
  
  // Summary Section
  rows.push(['=== SUMMARY ===']);
  rows.push(['Total Students', report.summary.totalStudents || 0]);
  rows.push(['Risk Distribution - Critical', report.summary.riskDistribution?.critical || 0]);
  rows.push(['Risk Distribution - High', report.summary.riskDistribution?.high || 0]);
  rows.push(['Risk Distribution - Medium', report.summary.riskDistribution?.medium || 0]);
  rows.push(['Risk Distribution - Low', report.summary.riskDistribution?.low || 0]);
  rows.push(['Total Routes', report.summary.totalRoutes || 0]);
  rows.push(['Total Trips', report.summary.totalTrips || 0]);
  rows.push(['Total Boardings', report.summary.attendance?.totalBoard || 0]);
  rows.push(['Total Alightings', report.summary.attendance?.totalAlight || 0]);
  rows.push(['Average Daily Attendance', report.summary.attendance?.averageDaily || 0]);
  rows.push(['Total Alerts', report.summary.alerts?.total || 0]);
  rows.push(['  - Attendance Alerts', report.summary.alerts?.byType?.attendance || 0]);
  rows.push(['  - Route Deviation Alerts', report.summary.alerts?.byType?.route || 0]);
  rows.push(['  - Delay Alerts', report.summary.alerts?.byType?.delay || 0]);
  rows.push(['  - Emergency Alerts', report.summary.alerts?.byType?.emergency || 0]);
  rows.push([]);
  
  // Student Risk Details
  rows.push(['=== STUDENT RISK DETAILS ===']);
  rows.push(['Name', 'Grade', 'Risk Level', 'Risk Score']);
  if (report.details.students) {
    report.details.students.forEach(s => {
      rows.push([s.name, s.grade || 'N/A', s.riskLevel, s.riskScore]);
    });
  }
  rows.push([]);
  
  // Route Details
  rows.push(['=== ROUTE DETAILS ===']);
  rows.push(['Route Name', 'Number of Stops', 'Trips in Period']);
  if (report.details.routes) {
    report.details.routes.forEach(r => {
      rows.push([r.name, r.stops, r.trips]);
    });
  }
  rows.push([]);
  
  // Alert Details
  rows.push(['=== ALERT DETAILS (Last 50) ===']);
  rows.push(['Type', 'Title', 'Created At']);
  if (report.details.alerts) {
    report.details.alerts.forEach(a => {
      rows.push([a.type, a.title, a.createdAt]);
    });
  }
  
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

// Attach helper functions to router for use in other endpoints
router._calculateTotalDistance = _calculateTotalDistance;
router._formatAttendanceTrends = _formatAttendanceTrends;
router._generateTravelRecommendations = _generateTravelRecommendations;
router._convertReportToCSV = _convertReportToCSV;

module.exports = router;