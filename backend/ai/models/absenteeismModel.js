// Simple absenteeism analysis without TensorFlow
// Replaces the TensorFlow neural network with statistical methods

// Correct imports - using actual model file names
const Attendance = require('../../models/AttendanceRecord');
const Student = require('../../models/Student');

class AbsenteeismModel {
  constructor() {
    this.model = null;
    this.initialized = false;
    this.trainedData = null;
  }

  /**
   * Initialize the model (placeholder for compatibility)
   */
  createModel() {
    this.initialized = true;
    console.log('✅ Absenteeism model initialized (statistical mode)');
    return this;
  }

  /**
   * Train the model on student attendance data
   * Uses statistical analysis instead of neural networks
   */
  async train(studentId, epochs = 50, batchSize = 32) {
    try {
      // Get and prepare data
      const dailyData = await this._prepareAttendanceData(studentId, 180);
      
      if (!dailyData || dailyData.length === 0) {
        throw new Error('No attendance data available for this student');
      }
      
      const { features, labels } = this._extractAbsenteeismFeatures(dailyData);

      if (features.length < 7) {
        throw new Error(`Not enough data to train model. Need at least 7 days, got ${features.length}`);
      }

      // Calculate attendance statistics
      const totalDays = dailyData.length;
      const attendedDays = dailyData.filter(d => d.boarded === true).length;
      const attendanceRate = totalDays > 0 ? attendedDays / totalDays : 0;
      
      // Calculate day-of-week patterns
      const dayPatterns = this._calculateDayPatterns(dailyData);
      
      // Calculate trend (last 7 days vs previous 7 days)
      const lastWeek = dailyData.slice(-7);
      const prevWeek = dailyData.slice(-14, -7);
      const lastWeekRate = lastWeek.filter(d => d.boarded).length / 7;
      const prevWeekRate = prevWeek.filter(d => d.boarded).length / 7;
      const trend = lastWeekRate - prevWeekRate;
      
      // Store training data for future predictions
      this.trainedData = {
        studentId,
        features,
        labels,
        attendanceRate,
        dayPatterns,
        trend,
        lastTrainingDate: new Date(),
        patterns: this._analyzePatterns(features, labels),
        totalDaysAnalyzed: features.length,
        stats: {
          totalDays,
          attendedDays,
          missedDays: totalDays - attendedDays,
          attendanceRate,
          lastWeekRate,
          prevWeekRate,
          trend
        }
      };

      this.initialized = true;
      
      console.log(`📊 Model trained for student ${studentId}`);
      console.log(`   Records analyzed: ${features.length}`);
      console.log(`   Attendance rate: ${(attendanceRate * 100).toFixed(1)}%`);
      console.log(`   Weekly trend: ${trend > 0 ? '📈 improving' : trend < 0 ? '📉 declining' : '📊 stable'}`);
      
      return {
        history: {
          loss: 1 - attendanceRate,
          accuracy: attendanceRate,
          epochs: [epochs]
        },
        stats: this.trainedData.stats
      };
    } catch (error) {
      console.error('Error training model:', error);
      throw error;
    }
  }

  /**
   * Prepare attendance data from database
   */
  async _prepareAttendanceData(studentId, days) {
    try {
      // Validate student exists
      const student = await Student.findById(studentId);
      if (!student) {
        throw new Error(`Student not found with ID: ${studentId}`);
      }
      
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      
      // Fetch attendance records using AttendanceRecord model
      const attendanceRecords = await Attendance.find({
        studentId: studentId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).sort({ createdAt: 1 });
      
      // Create a map for quick lookup
      const attendanceMap = new Map();
      attendanceRecords.forEach(record => {
        const dateKey = record.createdAt.toISOString().split('T')[0];
        attendanceMap.set(dateKey, {
          boarded: record.eventType === 'board',
          time: record.createdAt,
          location: record.gpsSnapshot
        });
      });
      
      // Generate daily data for the date range
      const dailyData = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const record = attendanceMap.get(dateKey);
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        dailyData.push({
          date: new Date(currentDate),
          dateKey,
          boarded: record ? record.boarded : false,
          boardingTime: record ? record.time : null,
          location: record ? record.location : null,
          dayOfWeek,
          isWeekend,
          month: currentDate.getMonth(),
          year: currentDate.getFullYear(),
          isHoliday: this._isHoliday(currentDate)
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return dailyData;
    } catch (error) {
      console.error('Error preparing attendance data:', error);
      console.warn('Using mock data for testing');
      return this._generateMockData(days);
    }
  }
  
  /**
   * Check if a date is a holiday (simplified)
   */
  _isHoliday(date) {
    const month = date.getMonth();
    const day = date.getDate();
    
    // Kenyan public holidays (simplified)
    if (month === 0 && day === 1) return true;      // New Year
    if (month === 4 && day === 1) return true;      // Labor Day
    if (month === 5 && day === 1) return true;      // Madaraka Day
    if (month === 9 && day === 10) return true;     // Mazingira Day
    if (month === 9 && day === 20) return true;     // Mashujaa Day
    if (month === 11 && day === 12) return true;    // Jamhuri Day
    if (month === 11 && day === 25) return true;    // Christmas
    if (month === 11 && day === 26) return true;    // Boxing Day
    
    return false;
  }
  
  /**
   * Generate mock data for testing (fallback)
   */
  _generateMockData(days) {
    const data = [];
    const today = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dayOfWeek = date.getDay();
      
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = this._isHoliday(date);
      
      let attendanceProbability = 0.85;
      if (isWeekend || isHoliday) attendanceProbability = 0.05;
      
      attendanceProbability = Math.max(0, Math.min(1, attendanceProbability + (Math.random() - 0.5) * 0.1));
      const boarded = Math.random() < attendanceProbability;
      
      data.push({
        date,
        dateKey: date.toISOString().split('T')[0],
        boarded,
        boardingTime: boarded ? new Date(date.setHours(7, 30 + Math.random() * 30, 0, 0)) : null,
        dayOfWeek,
        isWeekend,
        month: date.getMonth(),
        year: date.getFullYear(),
        isHoliday
      });
    }
    
    return data;
  }

  /**
   * Calculate day-of-week patterns
   */
  _calculateDayPatterns(dailyData) {
    const patterns = {
      0: { total: 0, attended: 0, rate: 0 }, // Sunday
      1: { total: 0, attended: 0, rate: 0 }, // Monday
      2: { total: 0, attended: 0, rate: 0 }, // Tuesday
      3: { total: 0, attended: 0, rate: 0 }, // Wednesday
      4: { total: 0, attended: 0, rate: 0 }, // Thursday
      5: { total: 0, attended: 0, rate: 0 }, // Friday
      6: { total: 0, attended: 0, rate: 0 }  // Saturday
    };
    
    dailyData.forEach(day => {
      if (!day.isWeekend) { // Only count school days
        patterns[day.dayOfWeek].total++;
        if (day.boarded) {
          patterns[day.dayOfWeek].attended++;
        }
      }
    });
    
    for (let i = 1; i <= 5; i++) { // Monday to Friday only
      if (patterns[i].total > 0) {
        patterns[i].rate = patterns[i].attended / patterns[i].total;
      } else {
        patterns[i].rate = 0.85; // Default 85% for days with no data
      }
    }
    
    return patterns;
  }

  /**
   * Extract features from daily data (12 features)
   */
  _extractAbsenteeismFeatures(dailyData) {
    const features = [];
    const labels = [];

    // Use sliding window of 7 days to predict next day
    for (let i = 7; i < dailyData.length; i++) {
      const lastWeek = dailyData.slice(i - 7, i);
      const nextDay = dailyData[i];
      
      // Skip weekends for prediction (school days only)
      if (nextDay.isWeekend || nextDay.isHoliday) continue;
      
      const featureVector = [
        // Last 7 days attendance (7 features)
        ...lastWeek.map(d => d.boarded ? 1 : 0),
        // Day of week (normalized)
        nextDay.dayOfWeek / 6,
        // Is weekend (0 or 1)
        nextDay.isWeekend ? 1 : 0,
        // Number of boarding times last week
        lastWeek.filter(d => d.boardingTime).length,
        // Average boarding time (normalized)
        this._calculateAverageBoardingTime(lastWeek),
        // Seasonal sine/cosine
        Math.sin(2 * Math.PI * nextDay.month / 12),
        Math.cos(2 * Math.PI * nextDay.month / 12)
      ];
      
      features.push(featureVector);
      labels.push(nextDay.boarded ? 1 : 0);
    }
    
    return { features, labels };
  }
  
  /**
   * Calculate average boarding time (minutes from midnight, normalized)
   */
  _calculateAverageBoardingTime(days) {
    const times = days
      .filter(d => d.boardingTime)
      .map(d => {
        const hours = d.boardingTime.getHours();
        const minutes = d.boardingTime.getMinutes();
        return hours * 60 + minutes;
      });
    
    if (times.length === 0) return 0;
    const avgMinutes = times.reduce((a, b) => a + b, 0) / times.length;
    return avgMinutes / 1440;
  }
  
  /**
   * Analyze patterns in attendance data
   */
  _analyzePatterns(features, labels) {
    const totalDays = labels.length;
    const attendedDays = labels.filter(l => l === 1).length;
    const attendanceRate = attendedDays / totalDays;
    
    // Calculate consistency
    const rollingAverages = [];
    for (let i = 7; i <= labels.length; i++) {
      const weekLabels = labels.slice(i - 7, i);
      const weekRate = weekLabels.filter(l => l === 1).length / 7;
      rollingAverages.push(weekRate);
    }
    
    const mean = rollingAverages.reduce((a, b) => a + b, 0) / rollingAverages.length;
    const variance = rollingAverages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rollingAverages.length;
    const consistency = Math.max(0, 1 - Math.sqrt(variance));
    
    return {
      attendanceRate,
      consistency,
      totalDays,
      attendedDays,
      missedDays: totalDays - attendedDays
    };
  }

  /**
   * Predict future attendance
   */
  async predict(studentId, days = 7) {
    if (!this.initialized) {
      this.createModel();
    }

    const dailyData = await this._prepareAttendanceData(studentId, 60);
    
    if (dailyData.length < 14) {
      throw new Error(`Insufficient data for prediction. Need at least 14 days, got ${dailyData.length}`);
    }

    const predictions = [];
    const studentAttendanceRate = dailyData.filter(d => d.boarded).length / dailyData.length;
    const dayWeights = this._calculateDayWeights(dailyData);
    
    // Calculate trend
    const lastTwoWeeks = dailyData.slice(-14);
    const firstWeek = lastTwoWeeks.slice(0, 7);
    const secondWeek = lastTwoWeeks.slice(7, 14);
    const firstWeekRate = firstWeek.filter(d => d.boarded).length / 7;
    const secondWeekRate = secondWeek.filter(d => d.boarded).length / 7;
    const trend = secondWeekRate - firstWeekRate;
    
    for (let i = 0; i < days; i++) {
      const predDate = new Date();
      predDate.setDate(predDate.getDate() + i);
      const dayOfWeek = predDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = this._isHoliday(predDate);
      
      // Skip weekends and holidays for predictions
      if (isWeekend || isHoliday) {
        predictions.push({
          date: predDate.toISOString().split('T')[0],
          dayOfWeek: this._getDayName(dayOfWeek),
          probability: 0,
          willAttend: false,
          confidence: 'high',
          factors: ['📅 No school on this day'],
          isSchoolDay: false
        });
        continue;
      }
      
      let probability = studentAttendanceRate;
      probability += trend * 0.2;
      probability *= dayWeights[dayOfWeek] || 1;
      
      // Seasonal adjustment
      const month = predDate.getMonth();
      let seasonalFactor = 1.0;
      if (month === 0 || month === 1 || month === 2) seasonalFactor = 0.95;
      if (month === 4 || month === 5 || month === 6) seasonalFactor = 1.0;
      if (month === 8 || month === 9 || month === 10) seasonalFactor = 0.95;
      if (month === 3 || month === 7 || month === 11) seasonalFactor = 0.7;
      probability *= seasonalFactor;
      
      probability = Math.min(0.98, Math.max(0.02, probability));
      
      let confidence = 'low';
      if (dailyData.length > 30 && (probability > 0.7 || probability < 0.3)) {
        confidence = 'high';
      } else if (dailyData.length > 20) {
        confidence = 'medium';
      }
      
      predictions.push({
        date: predDate.toISOString().split('T')[0],
        dayOfWeek: this._getDayName(dayOfWeek),
        probability: Math.round(probability * 100) / 100,
        willAttend: probability > 0.5,
        confidence,
        factors: this._getPredictionFactors(probability, trend),
        isSchoolDay: true
      });
    }
    
    return predictions;
  }
  
  /**
   * Get day name from day number
   */
  _getDayName(dayOfWeek) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }
  
  /**
   * Get factors that influenced the prediction
   */
  _getPredictionFactors(probability, trend) {
    const factors = [];
    
    if (probability > 0.7) {
      factors.push('📈 High attendance probability based on historical patterns');
    } else if (probability < 0.3) {
      factors.push('📉 Low attendance probability based on historical patterns');
    }
    
    if (trend > 0.05) {
      factors.push('📈 Recent attendance trend is improving');
    } else if (trend < -0.05) {
      factors.push('📉 Recent attendance trend is declining');
    }
    
    if (factors.length === 0) {
      factors.push('📊 Based on average attendance patterns');
    }
    
    return factors;
  }
  
  /**
   * Calculate day-of-week weights from historical data
   */
  _calculateDayWeights(dailyData) {
    const dayCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const dayAttendance = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    dailyData.forEach(day => {
      const dayOfWeek = day.date.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && !day.isHoliday) {
        dayCounts[dayOfWeek]++;
        if (day.boarded) {
          dayAttendance[dayOfWeek]++;
        }
      }
    });
    
    const weights = {};
    for (let i = 1; i <= 5; i++) {
      if (dayCounts[i] > 0) {
        weights[i] = dayAttendance[i] / dayCounts[i];
      } else {
        weights[i] = 0.85;
      }
    }
    
    const avgWeight = Object.values(weights).reduce((a, b) => a + b, 0) / 5;
    for (let i = 1; i <= 5; i++) {
      weights[i] = weights[i] / avgWeight;
    }
    
    return weights;
  }

  /**
   * Get risk assessment for a student
   */
  async getRiskAssessment(studentId) {
    try {
      const predictions = await this.predict(studentId, 30);
      const schoolDayPredictions = predictions.filter(p => p.isSchoolDay !== false);
      
      const predictedAbsences = schoolDayPredictions.filter(p => !p.willAttend).length;
      const riskScore = predictedAbsences / schoolDayPredictions.length;
      
      let riskLevel = 'low';
      if (riskScore > 0.3) riskLevel = 'medium';
      if (riskScore > 0.5) riskLevel = 'high';
      if (riskScore > 0.7) riskLevel = 'critical';
      
      const highRiskDays = schoolDayPredictions
        .filter(p => !p.willAttend && p.confidence === 'high')
        .map(d => ({ date: d.date, dayOfWeek: d.dayOfWeek }));
      
      const dailyData = await this._prepareAttendanceData(studentId, 90);
      const actualAttendanceRate = dailyData.filter(d => d.boarded && !d.isWeekend && !d.isHoliday).length / 
                                    dailyData.filter(d => !d.isWeekend && !d.isHoliday).length;
      
      const recommendations = this.generateRecommendations(riskLevel, highRiskDays.length, actualAttendanceRate);
      
      return {
        studentId,
        riskScore: Math.round(riskScore * 100) / 100,
        riskLevel,
        actualAttendanceRate: Math.round(actualAttendanceRate * 100) / 100,
        predictedAbsences,
        highRiskDays: highRiskDays.slice(0, 10),
        recommendations,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error in risk assessment:', error);
      return {
        studentId,
        riskScore: 0.5,
        riskLevel: 'unknown',
        error: error.message,
        recommendations: ['⚠️ Unable to generate risk assessment due to insufficient data']
      };
    }
  }

  /**
   * Generate recommendations based on risk
   */
  generateRecommendations(riskLevel, highRiskCount, attendanceRate) {
    const recommendations = [];

    switch(riskLevel) {
      case 'critical':
        recommendations.push({
          priority: 'high',
          action: 'Schedule immediate parent-teacher meeting',
          details: 'Urgent intervention required to address attendance issues'
        });
        recommendations.push({
          priority: 'high',
          action: 'Assign a mentor/buddy to support the student',
          details: 'Peer support can improve school engagement'
        });
        recommendations.push({
          priority: 'medium',
          action: 'Implement daily check-in calls with parents',
          details: 'Regular communication helps identify underlying issues'
        });
        break;
        
      case 'high':
        recommendations.push({
          priority: 'medium',
          action: 'Send weekly attendance reminders to parents',
          details: 'Keep parents informed about attendance status'
        });
        recommendations.push({
          priority: 'medium',
          action: 'Monitor attendance closely for the next 2 weeks',
          details: 'Early intervention can prevent further decline'
        });
        break;
        
      case 'medium':
        recommendations.push({
          priority: 'low',
          action: 'Send monthly attendance report to parents',
          details: 'Regular feedback helps maintain awareness'
        });
        break;
        
      default:
        recommendations.push({
          priority: 'low',
          action: 'Continue regular attendance tracking',
          details: 'Maintain current monitoring system'
        });
    }
    
    if (attendanceRate && attendanceRate < 0.7) {
      recommendations.unshift({
        priority: 'high',
        action: `Current attendance rate is ${(attendanceRate * 100).toFixed(1)}% - below target`,
        details: 'Target attendance rate is 90% or higher'
      });
    }
    
    if (highRiskCount > 5) {
      recommendations.push({
        priority: 'medium',
        action: `${highRiskCount} high-risk dates identified in the next month`,
        details: 'Consider proactive intervention before these dates'
      });
    }
    
    return recommendations;
  }

  /**
   * Save model data to file
   */
  async saveModel(path) {
    try {
      const fs = require('fs').promises;
      const modelData = {
        trainedData: this.trainedData,
        initialized: this.initialized,
        version: '1.0.0',
        savedAt: new Date().toISOString()
      };
      await fs.writeFile(`${path}/model.json`, JSON.stringify(modelData, null, 2));
      console.log(`📁 Model data saved to ${path}`);
      return { success: true, path };
    } catch (error) {
      console.error('Error saving model:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load model data from file
   */
  async loadModel(path) {
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile(`${path}/model.json`, 'utf8');
      const modelData = JSON.parse(data);
      this.trainedData = modelData.trainedData;
      this.initialized = modelData.initialized;
      console.log(`📁 Model data loaded from ${path}`);
      return { success: true };
    } catch (error) {
      console.error('Error loading model:', error.message);
      this.createModel();
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get model status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      hasTrainingData: !!this.trainedData,
      trainingDate: this.trainedData?.lastTrainingDate,
      attendanceRate: this.trainedData?.attendanceRate,
      totalDaysAnalyzed: this.trainedData?.totalDaysAnalyzed,
      trend: this.trainedData?.trend
    };
  }
  
  /**
   * Get detailed analytics for a student
   */
  async getDetailedAnalytics(studentId) {
    try {
      const dailyData = await this._prepareAttendanceData(studentId, 90);
      const predictions = await this.predict(studentId, 30);
      const risk = await this.getRiskAssessment(studentId);
      
      const monthlyBreakdown = {};
      dailyData.forEach(day => {
        if (!day.isWeekend && !day.isHoliday) {
          const monthKey = `${day.year}-${String(day.month + 1).padStart(2, '0')}`;
          if (!monthlyBreakdown[monthKey]) {
            monthlyBreakdown[monthKey] = { total: 0, attended: 0 };
          }
          monthlyBreakdown[monthKey].total++;
          if (day.boarded) monthlyBreakdown[monthKey].attended++;
        }
      });
      
      const weeklyBreakdown = [];
      const schoolDays = dailyData.filter(d => !d.isWeekend && !d.isHoliday);
      for (let i = 0; i < schoolDays.length; i += 5) {
        const week = schoolDays.slice(i, i + 5);
        if (week.length > 0) {
          const weekRate = week.filter(d => d.boarded).length / week.length;
          weeklyBreakdown.push({
            weekStart: week[0]?.date,
            weekEnd: week[week.length - 1]?.date,
            attendanceRate: Math.round(weekRate * 100)
          });
        }
      }
      
      return {
        studentId,
        summary: {
          totalSchoolDays: dailyData.filter(d => !d.isWeekend && !d.isHoliday).length,
          attendedDays: dailyData.filter(d => d.boarded && !d.isWeekend && !d.isHoliday).length,
          attendanceRate: risk.actualAttendanceRate,
          predictedAbsences: risk.predictedAbsences,
          riskLevel: risk.riskLevel
        },
        monthlyBreakdown,
        weeklyBreakdown: weeklyBreakdown.slice(-8),
        predictions: predictions.filter(p => p.isSchoolDay !== false).slice(0, 14),
        dayPatterns: this._calculateDayPatterns(dailyData),
        recommendations: risk.recommendations
      };
    } catch (error) {
      console.error('Error getting detailed analytics:', error);
      throw error;
    }
  }
}

module.exports = new AbsenteeismModel();