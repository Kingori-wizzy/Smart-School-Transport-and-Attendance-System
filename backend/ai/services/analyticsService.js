const cron = require('node-cron');
const absenteeismModel = require('../models/absenteeismModel');
const routeOptimizationModel = require('../models/routeOptimizationModel');
const dataPreprocessor = require('../utils/dataPreprocessor');
const Student = require('../../models/Student');
const Route = require('../../models/Route');
const Attendance = require('../../models/AttendanceRecord');
const Notification = require('../../models/Notification');

class AnalyticsService {
  constructor() {
    this.initializeScheduledJobs();
  }

  /**
   * Initialize cron jobs for automated analytics
   */
  initializeScheduledJobs() {
    // Run daily at 2 AM: Generate absenteeism predictions
    cron.schedule('0 2 * * *', () => {
      console.log('Running daily absenteeism predictions...');
      this.generateDailyPredictions();
    });

    // Run weekly on Sunday at 3 AM: Optimize routes
    cron.schedule('0 3 * * 0', () => {
      console.log('Running weekly route optimization...');
      this.optimizeAllRoutes();
    });

    // Run monthly on 1st at 4 AM: Generate reports
    cron.schedule('0 4 1 * *', () => {
      console.log('Generating monthly analytics report...');
      this.generateMonthlyReport();
    });
  }

  /**
   * Generate daily absenteeism predictions for all students
   */
  async generateDailyPredictions() {
    try {
      const students = await Student.find({ active: true });
      
      for (const student of students) {
        try {
          // Get risk assessment
          const risk = await absenteeismModel.getRiskAssessment(student._id);
          
          // Store in student record
          student.analytics = {
            ...student.analytics,
            riskScore: risk.riskScore,
            riskLevel: risk.riskLevel,
            lastAssessed: new Date(),
            predictedAbsences: risk.predictedAbsences
          };
          await student.save();

          // Send alerts for high-risk students
          if (risk.riskLevel === 'high' || risk.riskLevel === 'critical') {
            await this.sendRiskAlert(student, risk);
          }

        } catch (error) {
          console.error(`Error predicting for student ${student._id}:`, error);
        }
      }

      console.log(`✅ Daily predictions completed for ${students.length} students`);
    } catch (error) {
      console.error('Error in daily predictions:', error);
    }
  }

  /**
   * Send alert for high-risk students
   */
  async sendRiskAlert(student, risk) {
    // Find parent
    const parent = await Parent.findOne({ children: student._id });
    if (!parent) return;

    const message = `Alert: ${student.name} shows ${risk.riskLevel} risk of absenteeism. ${risk.predictedAbsences} absences predicted next month.`;

    const notification = new Notification({
      recipientId: parent._id,
      recipientType: 'parent',
      type: 'attendance_alert',
      title: 'Attendance Risk Alert',
      message,
      studentId: student._id,
      priority: 'high',
      metadata: {
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        predictedAbsences: risk.predictedAbsences
      }
    });

    await notification.save();

    // Also notify teachers/admins
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      const adminNotification = new Notification({
        recipientId: admin._id,
        recipientType: 'admin',
        type: 'attendance_alert',
        title: 'Student Attendance Risk',
        message: `${student.name} (${student.grade}) - ${risk.riskLevel} risk`,
        studentId: student._id,
        priority: 'medium'
      });
      await adminNotification.save();
    }
  }

  /**
   * Optimize all routes based on historical data
   */
  async optimizeAllRoutes() {
    try {
      const routes = await Route.find({ active: true }).populate('stops');
      
      for (const route of routes) {
        try {
          // Train model on historical data
          await routeOptimizationModel.train(route._id, 50);
          
          // Get optimization suggestions
          const suggestions = await this.getRouteSuggestions(route);
          
          // Store suggestions
          route.optimization = {
            lastOptimized: new Date(),
            suggestions,
            efficiency: suggestions.improvement.efficiency
          };
          await route.save();

        } catch (error) {
          console.error(`Error optimizing route ${route._id}:`, error);
        }
      }

      console.log(`✅ Route optimization completed for ${routes.length} routes`);
    } catch (error) {
      console.error('Error in route optimization:', error);
    }
  }

  /**
   * Get optimization suggestions for a route
   */
  async getRouteSuggestions(route) {
    const historicalData = await dataPreprocessor.prepareRouteData(route._id, 30);
    
    // Analyze stop efficiency
    const stopEfficiency = this.analyzeStopEfficiency(route, historicalData);
    
    // Predict optimal times
    const optimalTimes = await this.predictOptimalTimes(route);
    
    // Generate suggestions
    const suggestions = {
      stopReorder: stopEfficiency.underutilized.length > 0,
      timeAdjustments: optimalTimes,
      estimatedSavings: this.calculateSavings(route, historicalData),
      underutilizedStops: stopEfficiency.underutilized
    };

    return suggestions;
  }

  /**
   * Analyze efficiency of each stop
   */
  analyzeStopEfficiency(route, historicalData) {
    const stopUsage = {};
    
    historicalData.forEach(trip => {
      trip.stops?.forEach(stop => {
        stopUsage[stop._id] = (stopUsage[stop._id] || 0) + 1;
      });
    });

    const totalTrips = historicalData.length;
    const underutilized = [];

    route.stops?.forEach(stop => {
      const usage = stopUsage[stop._id] || 0;
      const utilization = usage / totalTrips;
      
      if (utilization < 0.3) {
        underutilized.push({
          stopId: stop._id,
          name: stop.name,
          utilization: Math.round(utilization * 100),
          recommendation: 'Consider merging with nearby stop'
        });
      }
    });

    return { underutilized };
  }

  /**
   * Predict optimal departure times
   */
  async predictOptimalTimes(route) {
    const times = [];
    
    for (let hour = 6; hour <= 9; hour++) {
      const prediction = await routeOptimizationModel.predictTravelTime(route._id, {
        studentCount: 30,
        distance: route.distance || 20,
        weather: 'clear',
        traffic: hour === 7 || hour === 8 ? 'heavy' : 'normal'
      });
      
      times.push({
        hour: `${hour}:00`,
        predictedMinutes: prediction.predictedMinutes
      });
    }

    // Find optimal time
    const optimal = times.reduce((best, current) => 
      current.predictedMinutes < best.predictedMinutes ? current : best
    );

    return {
      optimalDeparture: optimal.hour,
      estimatedTravelTime: optimal.predictedMinutes,
      alternatives: times
    };
  }

  /**
   * Calculate potential savings
   */
  calculateSavings(route, historicalData) {
    const avgTime = historicalData.reduce((sum, t) => sum + t.travelTime, 0) / historicalData.length;
    const optimizedTime = avgTime * 0.85; // Assume 15% improvement
    
    return {
      timePerTrip: Math.round(avgTime - optimizedTime),
      fuelPerTrip: Math.round((avgTime - optimizedTime) * 0.1), // Rough estimate
      annualSavings: Math.round((avgTime - optimizedTime) * 0.1 * 180) // 180 school days
    };
  }

  /**
   * Generate monthly analytics report
   */
  async generateMonthlyReport() {
    const report = {
      generatedAt: new Date(),
      summary: {},
      details: {}
    };

    // Attendance summary
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) }
        }
      },
      {
        $group: {
          _id: { eventType: '$eventType', date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
          count: { $sum: 1 }
        }
      }
    ]);

    report.summary.totalAttendance = attendanceStats.reduce((sum, s) => sum + s.count, 0);
    
    // Risk distribution
    const students = await Student.find({});
    const riskLevels = {
      low: students.filter(s => s.analytics?.riskLevel === 'low').length,
      medium: students.filter(s => s.analytics?.riskLevel === 'medium').length,
      high: students.filter(s => s.analytics?.riskLevel === 'high').length,
      critical: students.filter(s => s.analytics?.riskLevel === 'critical').length
    };

    report.summary.riskDistribution = riskLevels;

    // Save report
    const Report = require('../../models/Report');
    await Report.create({
      type: 'monthly_analytics',
      generatedAt: new Date(),
      data: report
    });

    return report;
  }
}

module.exports = new AnalyticsService();