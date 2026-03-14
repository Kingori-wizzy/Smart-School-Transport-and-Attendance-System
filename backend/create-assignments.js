const mongoose = require('mongoose');
const Bus = require('./models/Bus');
const User = require('./models/User');
const Route = require('./models/Route');
const Assignment = require('./models/Assignment');
require('dotenv').config();

async function createAssignments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all buses
    const buses = await Bus.find();
    console.log(🚍 Found  buses);

    // Get all drivers
    const drivers = await User.find({ role: 'driver' });
    console.log(👤 Found  drivers);

    // Get all routes
    const routes = await Route.find();
    console.log(🗺️ Found  routes\n);

    // Clear existing assignments
    await Assignment.deleteMany({});
    console.log('🧹 Cleared old assignments\n');

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

      console.log('✅ Assigned:');
      console.log('   Bus: ' + bus.busNumber);
      console.log('   Driver: ' + driver.firstName + ' ' + driver.lastName);
      console.log('   Route: ' + route.name + '\n');
    }

    console.log('🎉 All assignments created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

createAssignments();
