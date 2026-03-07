const tf = require('@tensorflow/tfjs-node');
const dataPreprocessor = require('../utils/dataPreprocessor');

class AbsenteeismModel {
  constructor() {
    this.model = null;
    this.initialized = false;
  }

  /**
   * Create and compile the neural network
   */
  createModel() {
    const model = tf.sequential();

    // Input layer (features: 7 days + dayOfWeek + isWeekend + totalBoardings + avgTime + seasonal)
    model.add(tf.layers.dense({
      inputShape: [12],
      units: 64,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
    }));

    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Hidden layer
    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
    }));

    // Dropout
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Output layer (binary classification: will attend or not)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });

    this.model = model;
    this.initialized = true;
    
    return model;
  }

  /**
   * Train the model on student attendance data
   */
  async train(studentId, epochs = 50, batchSize = 32) {
    if (!this.model) this.createModel();

    // Get and prepare data
    const dailyData = await dataPreprocessor.prepareAttendanceData(studentId, 180);
    const { features, labels } = dataPreprocessor.extractAbsenteeismFeatures(dailyData);

    if (features.length < 10) {
      throw new Error('Not enough data to train model');
    }

    // Convert to tensors
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    // Train the model
    const history = await this.model.fit(xs, ys, {
      epochs,
      batchSize,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, acc = ${logs.acc.toFixed(4)}`);
        }
      }
    });

    // Clean up tensors
    xs.dispose();
    ys.dispose();

    return history;
  }

  /**
   * Predict future attendance
   */
  async predict(studentId, days = 7) {
    if (!this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    // Get recent data for prediction
    const dailyData = await dataPreprocessor.prepareAttendanceData(studentId, 30);
    
    if (dailyData.length < 7) {
      throw new Error('Insufficient data for prediction');
    }

    const predictions = [];

    for (let i = 0; i < days; i++) {
      // Use last 7 days to predict next day
      const lastWeek = dailyData.slice(-7);
      
      // Create feature vector for next day
      const nextDay = {
        dayOfWeek: (new Date().getDay() + i) % 7,
        isWeekend: [0, 6].includes((new Date().getDay() + i) % 7),
        month: new Date().getMonth()
      };

      const featureVector = [
        ...lastWeek.map(d => d.boarded ? 1 : 0),
        nextDay.dayOfWeek / 6,
        nextDay.isWeekend ? 1 : 0,
        lastWeek.filter(d => d.boardingTime).length,
        dataPreprocessor.calculateAverageBoardingTime(lastWeek),
        Math.sin(2 * Math.PI * nextDay.month / 12),
        Math.cos(2 * Math.PI * nextDay.month / 12)
      ];

      // Predict
      const input = tf.tensor2d([featureVector]);
      const prediction = this.model.predict(input);
      const probability = prediction.dataSync()[0];
      
      // Clean up
      input.dispose();
      prediction.dispose();

      // Add to predictions
      const predDate = new Date();
      predDate.setDate(predDate.getDate() + i);
      
      predictions.push({
        date: predDate.toISOString().split('T')[0],
        probability,
        willAttend: probability > 0.5,
        confidence: probability > 0.7 ? 'high' : probability > 0.5 ? 'medium' : 'low'
      });

      // Add prediction to daily data for next iteration
      dailyData.push({
        date: predDate.toISOString().split('T')[0],
        boarded: probability > 0.5,
        dayOfWeek: nextDay.dayOfWeek,
        isWeekend: nextDay.isWeekend,
        month: nextDay.month
      });
    }

    return predictions;
  }

  /**
   * Get risk assessment for a student
   */
  async getRiskAssessment(studentId) {
    const predictions = await this.predict(studentId, 30);
    
    const riskScore = predictions.filter(p => !p.willAttend).length / 30;
    
    let riskLevel = 'low';
    if (riskScore > 0.3) riskLevel = 'medium';
    if (riskScore > 0.5) riskLevel = 'high';
    if (riskScore > 0.7) riskLevel = 'critical';

    const highRiskDays = predictions.filter(p => !p.willAttend && p.confidence === 'high');
    
    return {
      studentId,
      riskScore,
      riskLevel,
      predictedAbsences: predictions.filter(p => !p.willAttend).length,
      highRiskDates: highRiskDays.map(d => d.date),
      recommendations: this.generateRecommendations(riskLevel, highRiskDays.length)
    };
  }

  /**
   * Generate recommendations based on risk
   */
  generateRecommendations(riskLevel, highRiskCount) {
    const recommendations = [];

    switch(riskLevel) {
      case 'critical':
        recommendations.push('Schedule immediate parent-teacher meeting');
        recommendations.push('Consider assigning a mentor/buddy');
        recommendations.push('Implement daily check-in calls');
        break;
      case 'high':
        recommendations.push('Send weekly attendance reminders');
        recommendations.push('Monitor attendance closely next 2 weeks');
        recommendations.push('Contact parents for support plan');
        break;
      case 'medium':
        recommendations.push('Send monthly attendance report to parents');
        recommendations.push('Implement positive reinforcement system');
        break;
      default:
        recommendations.push('Continue regular attendance tracking');
    }

    if (highRiskCount > 5) {
      recommendations.push(`Alert: ${highRiskCount} high-risk dates identified`);
    }

    return recommendations;
  }

  /**
   * Save model to file
   */
  async saveModel(path) {
    if (!this.model) return;
    await this.model.save(`file://${path}`);
  }

  /**
   * Load model from file
   */
  async loadModel(path) {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);
    this.initialized = true;
  }
}

module.exports = new AbsenteeismModel();