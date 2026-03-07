const tf = require('@tensorflow/tfjs-node');
const dataPreprocessor = require('../utils/dataPreprocessor');
const Route = require('../../models/Route');
const Trip = require('../../models/Trip');

class RouteOptimizationModel {
  constructor() {
    this.model = null;
    this.initialized = false;
  }

  /**
   * Create model for travel time prediction
   */
  createModel() {
    const model = tf.sequential();

    // Input layer (9 features)
    model.add(tf.layers.dense({
      inputShape: [9],
      units: 64,
      activation: 'relu'
    }));

    model.add(tf.layers.batchNormalization());

    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));

    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));

    // Output layer (predicted travel time in minutes)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'linear'
    }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    this.model = model;
    this.initialized = true;

    return model;
  }

  /**
   * Train on historical route data
   */
  async train(routeId, epochs = 100) {
    if (!this.model) this.createModel();

    const routeData = await dataPreprocessor.prepareRouteData(routeId, 90);
    const extractedData = dataPreprocessor.extractRouteFeatures(routeData);

    if (extractedData.length < 20) {
      throw new Error('Insufficient route data for training');
    }

    const features = extractedData.map(d => d.features);
    const labels = extractedData.map(d => d.travelTime);

    // Normalize labels (travel time)
    const maxTime = Math.max(...labels);
    const normalizedLabels = labels.map(t => t / maxTime);

    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(normalizedLabels, [normalizedLabels.length, 1]);

    const history = await this.model.fit(xs, ys, {
      epochs,
      batchSize: 16,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, mae = ${logs.mae.toFixed(4)}`);
          }
        }
      }
    });

    xs.dispose();
    ys.dispose();

    return {
      history,
      maxTime
    };
  }

  /**
   * Predict travel time for a route
   */
  async predictTravelTime(routeId, conditions) {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    const route = await Route.findById(routeId);
    
    const features = [
      conditions.studentCount / 50,
      conditions.distance / 50,
      route.stops?.length || 0 / 20,
      new Date().getDay() / 6,
      new Date().getHours() / 24,
      conditions.weather === 'rain' ? 1 : 0,
      conditions.traffic === 'heavy' ? 1 : 0.5,
      Math.sin(2 * Math.PI * new Date().getHours() / 24),
      Math.cos(2 * Math.PI * new Date().getHours() / 24)
    ];

    const input = tf.tensor2d([features]);
    const prediction = this.model.predict(input);
    const normalizedTime = prediction.dataSync()[0];
    
    input.dispose();
    prediction.dispose();

    // Denormalize (assuming max time from training)
    const maxTime = 120; // 2 hours max
    const travelTime = normalizedTime * maxTime;

    return {
      predictedMinutes: Math.round(travelTime),
      confidence: travelTime < maxTime * 0.8 ? 'high' : 'medium',
      factors: this.identifyFactors(conditions)
    };
  }

  /**
   * Optimize route order
   */
  async optimizeRouteOrder(routeId, studentStops) {
    // Genetic algorithm for route optimization
    const populationSize = 50;
    const generations = 100;
    
    let population = this.initializePopulation(studentStops, populationSize);
    
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      const fitness = await Promise.all(
        population.map(stops => this.calculateRouteFitness(routeId, stops))
      );
      
      // Select best routes
      population = this.selectElite(population, fitness, 10);
      
      // Crossover and mutate
      const newPopulation = [...population];
      while (newPopulation.length < populationSize) {
        const parent1 = this.tournamentSelect(population, fitness);
        const parent2 = this.tournamentSelect(population, fitness);
        const child = this.crossover(parent1, parent2);
        const mutated = this.mutate(child, 0.1);
        newPopulation.push(mutated);
      }
      
      population = newPopulation;
    }

    // Get best route
    const fitness = await Promise.all(
      population.map(stops => this.calculateRouteFitness(routeId, stops))
    );
    
    const bestIndex = fitness.indexOf(Math.min(...fitness));
    const bestRoute = population[bestIndex];

    return {
      optimizedStops: bestRoute,
      estimatedTime: fitness[bestIndex],
      improvement: this.calculateImprovement(routeId, bestRoute)
    };
  }

  initializePopulation(stops, size) {
    const population = [];
    for (let i = 0; i < size; i++) {
      population.push([...stops].sort(() => Math.random() - 0.5));
    }
    return population;
  }

  async calculateRouteFitness(routeId, stops) {
    // Simulate travel time for this stop order
    let totalTime = 0;
    let currentLocation = stops[0]?.location || { lat: 0, lng: 0 };

    for (let i = 1; i < stops.length; i++) {
      const distance = this.haversineDistance(
        currentLocation,
        stops[i].location
      );
      totalTime += distance / 30; // Assume 30 km/h average speed
      currentLocation = stops[i].location;
    }

    return totalTime;
  }

  haversineDistance(loc1, loc2) {
    const R = 6371; // Earth's radius in km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.lat * Math.PI/180) * Math.cos(loc2.lat * Math.PI/180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  selectElite(population, fitness, count) {
    const indexed = population.map((p, i) => ({ stops: p, fitness: fitness[i] }));
    indexed.sort((a, b) => a.fitness - b.fitness);
    return indexed.slice(0, count).map(i => i.stops);
  }

  tournamentSelect(population, fitness, tournamentSize = 3) {
    const indices = [];
    for (let i = 0; i < tournamentSize; i++) {
      indices.push(Math.floor(Math.random() * population.length));
    }
    const bestIndex = indices.reduce((best, idx) => 
      fitness[idx] < fitness[best] ? idx : best, indices[0]);
    return population[bestIndex];
  }

  crossover(parent1, parent2) {
    const point = Math.floor(Math.random() * parent1.length);
    const child = [
      ...parent1.slice(0, point),
      ...parent2.filter(stop => !parent1.slice(0, point).includes(stop))
    ];
    return child;
  }

  mutate(route, rate) {
    if (Math.random() > rate) return route;
    
    const i = Math.floor(Math.random() * route.length);
    const j = Math.floor(Math.random() * route.length);
    [route[i], route[j]] = [route[j], route[i]];
    
    return route;
  }

  identifyFactors(conditions) {
    const factors = [];
    
    if (conditions.traffic === 'heavy') {
      factors.push('Heavy traffic expected');
    }
    if (conditions.weather === 'rain') {
      factors.push('Rain may slow travel');
    }
    if (new Date().getHours() >= 7 && new Date().getHours() <= 9) {
      factors.push('Morning rush hour');
    }
    if (new Date().getHours() >= 16 && new Date().getHours() <= 18) {
      factors.push('Evening rush hour');
    }
    
    return factors;
  }

  calculateImprovement(routeId, optimizedRoute) {
    // Placeholder - would compare with current route
    return {
      timeSaved: '15-20 minutes',
      fuelSaved: '10-15%',
      efficiency: '+25%'
    };
  }
}

module.exports = new RouteOptimizationModel();