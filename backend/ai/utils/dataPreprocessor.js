const Attendance = require('../../models/AttendanceRecord');
const Student = require('../../models/Student');
const Trip = require('../../models/Trip');

class DataPreprocessor {
  /**
   * Prepare attendance data for ML model
   */
  async prepareAttendanceData(studentId, days = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const attendanceRecords = await Attendance.find({
      studentId,
      createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    // Group by date
    const dailyAttendance = {};
    attendanceRecords.forEach(record => {
      const dateStr = record.createdAt.toISOString().split('T')[0];
      if (!dailyAttendance[dateStr]) {
        dailyAttendance[dateStr] = {
          date: dateStr,
          boarded: false,
          alighted: false,
          boardingTime: null,
          alightingTime: null,
          dayOfWeek: record.createdAt.getDay(),
          month: record.createdAt.getMonth(),
          isWeekend: [0, 6].includes(record.createdAt.getDay())
        };
      }

      if (record.eventType === 'board') {
        dailyAttendance[dateStr].boarded = true;
        dailyAttendance[dateStr].boardingTime = record.createdAt;
      } else if (record.eventType === 'alight') {
        dailyAttendance[dateStr].alighted = true;
        dailyAttendance[dateStr].alightingTime = record.createdAt;
      }
    });

    return Object.values(dailyAttendance);
  }

  /**
   * Extract features for absenteeism prediction
   */
  extractAbsenteeismFeatures(dailyData) {
    const features = [];
    const labels = [];

    // Use sliding window of 7 days to predict next day
    for (let i = 7; i < dailyData.length - 1; i++) {
      const weekData = dailyData.slice(i - 7, i);
      const nextDay = dailyData[i];

      // Feature vector
      const featureVector = [
        // Previous 7 days attendance pattern
        ...weekData.map(d => d.boarded ? 1 : 0),
        
        // Day of week features
        nextDay.dayOfWeek / 6, // Normalize to 0-1
        nextDay.isWeekend ? 1 : 0,
        
        // Time features
        weekData.filter(d => d.boardingTime).length, // Total boarding last week
        this.calculateAverageBoardingTime(weekData),
        
        // Seasonal features
        Math.sin(2 * Math.PI * nextDay.month / 12), // Month as sine wave
        Math.cos(2 * Math.PI * nextDay.month / 12),
      ];

      features.push(featureVector);
      labels.push(nextDay.boarded ? 1 : 0);
    }

    return { features, labels };
  }

  /**
   * Calculate average boarding time from week data
   */
  calculateAverageBoardingTime(weekData) {
    const times = weekData
      .filter(d => d.boardingTime)
      .map(d => {
        const hours = d.boardingTime.getHours();
        const minutes = d.boardingTime.getMinutes();
        return hours + minutes / 60;
      });

    if (times.length === 0) return 0.5; // Default to noon

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    return avg / 24; // Normalize to 0-1
  }

  /**
   * Prepare route optimization data
   */
  async prepareRouteData(routeId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trips = await Trip.find({
      routeId,
      status: 'completed',
      updatedAt: { $gte: startDate }
    }).populate('attendanceRecords');

    const routeData = trips.map(trip => {
      const boardings = trip.attendanceRecords?.filter(a => a.eventType === 'board') || [];
      const travelTime = (trip.endTime - trip.startTime) / 1000 / 60; // minutes

      return {
        tripId: trip._id,
        startTime: trip.startTime,
        endTime: trip.endTime,
        travelTime,
        studentCount: boardings.length,
        distance: trip.distance || 0,
        stops: trip.stops?.length || 0,
        dayOfWeek: trip.startTime.getDay(),
        hourOfDay: trip.startTime.getHours(),
        weather: trip.weather || 'clear',
        traffic: trip.traffic || 'normal'
      };
    });

    return routeData;
  }

  /**
   * Extract features for route optimization
   */
  extractRouteFeatures(routeData) {
    return routeData.map(trip => ({
      features: [
        trip.studentCount / 50, // Normalized by max capacity
        trip.distance / 50, // Normalized by max distance
        trip.stops / 20, // Normalized by max stops
        trip.dayOfWeek / 6,
        trip.hourOfDay / 24,
        trip.weather === 'rain' ? 1 : 0,
        trip.traffic === 'heavy' ? 1 : 0.5,
        Math.sin(2 * Math.PI * trip.hourOfDay / 24),
        Math.cos(2 * Math.PI * trip.hourOfDay / 24)
      ],
      travelTime: trip.travelTime,
      tripId: trip.tripId
    }));
  }

  /**
   * Detect anomalies in attendance patterns
   */
  detectAnomalies(attendanceData) {
    const anomalies = [];
    
    // Calculate rolling average
    for (let i = 14; i < attendanceData.length; i++) {
      const windowData = attendanceData.slice(i - 14, i);
      const avgBoardings = windowData.filter(d => d.boarded).length / 14;
      
      const currentBoardings = attendanceData[i].boarded ? 1 : 0;
      
      // If current is more than 2 standard deviations from mean
      const std = this.calculateStdDev(windowData.map(d => d.boarded ? 1 : 0));
      
      if (Math.abs(currentBoardings - avgBoardings) > 2 * std) {
        anomalies.push({
          date: attendanceData[i].date,
          expected: avgBoardings,
          actual: currentBoardings,
          deviation: currentBoardings - avgBoardings,
          severity: Math.abs(currentBoardings - avgBoardings) > 3 * std ? 'high' : 'medium'
        });
      }
    }

    return anomalies;
  }

  calculateStdDev(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}

module.exports = new DataPreprocessor();