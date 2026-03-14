const mongoose = require('mongoose');
const Bus = require('./models/Bus');
const User = require('./models/User');
const Route = require('./models/Route');
const Assignment = require('./models/Assignment');
require('dotenv').config();

async function createAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('------------------------');

    // Get all buses
    const buses = await Bus.find();
    console.log('Buses found:', buses.length);

    // Get all drivers
    const drivers = await User.find({ role: 'driver' });
    console.log('Drivers found:', drivers.length);

    // Get all routes
    const routes = await Route.find();
    console.log('Routes found:', routes.length);
    console.log('------------------------');

    // Clear existing assignments
    await Assignment.deleteMany({});
    console.log('Cleared old assignments');
    console.log('------------------------');

    // Create assignments for each bus
    for (let i = 0; i < buses.length; i++) {
      const bus = buses[i];
      const driver = drivers[i % drivers.length];
      const route = routes[i % routes.length];

      // Update bus with driver name
      bus.driverName = driver.firstName + ' ' + driver.lastName;
      await bus.save();

      // Create assignment
      const assignment = new Assignment({
        bus: bus._id,
        driver: driver._id,
        route: route._id,
        startDate: new Date(),
        status: 'active'
      });
      await assignment.save();

      console.log('Assignment ' + (i + 1) + ':');
      console.log('  Bus: ' + bus.busNumber);
      console.log('  Driver: ' + driver.firstName + ' ' + driver.lastName);
      console.log('  Route: ' + route.name);
      console.log('------------------------');
    }

    console.log('All assignments created successfully!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit();
  }
}

createAssignments();
