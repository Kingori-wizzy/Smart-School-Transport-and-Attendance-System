const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function addBuses() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Create buses collection with test data
    const buses = [
      {
        busNumber: 'BUS001',
        busId: 'BUS001',
        driverName: 'James Driver',
        driverPhone: '+254700000011',
        capacity: 40,
        route: 'Route A - North',
        routeId: 'ROUTE001',
        status: 'active',
        currentLocation: {
          lat: -1.2864,
          lng: 36.8172,
          speed: 35,
          heading: 90,
          timestamp: new Date()
        },
        lastUpdate: new Date(),
        fuelLevel: 75,
        students: ['STU1001', 'STU1002']
      },
      {
        busNumber: 'BUS002',
        busId: 'BUS002',
        driverName: 'Peter Driver',
        driverPhone: '+254700000022',
        capacity: 35,
        route: 'Route B - East',
        routeId: 'ROUTE002',
        status: 'active',
        currentLocation: {
          lat: -1.2964,
          lng: 36.8272,
          speed: 42,
          heading: 180,
          timestamp: new Date()
        },
        lastUpdate: new Date(),
        fuelLevel: 60,
        students: ['STU1003', 'STU1004']
      },
      {
        busNumber: 'BUS003',
        busId: 'BUS003',
        driverName: 'John Driver',
        driverPhone: '+254700000033',
        capacity: 45,
        route: 'Route C - South',
        routeId: 'ROUTE003',
        status: 'active',
        currentLocation: {
          lat: -1.2764,
          lng: 36.8072,
          speed: 28,
          heading: 270,
          timestamp: new Date()
        },
        lastUpdate: new Date(),
        fuelLevel: 80,
        students: ['STU1005']
      }
    ];
    
    // Clear existing buses if any
    await db.collection('buses').deleteMany({});
    
    // Insert new buses
    const result = await db.collection('buses').insertMany(buses);
    console.log(`✅ Added ${result.insertedCount} buses`);
    
    // Verify
    const count = await db.collection('buses').countDocuments();
    console.log(`📊 Total buses now: ${count}`);
    
    // Show the buses
    const allBuses = await db.collection('buses').find().toArray();
    console.log('\n🚌 Buses added:');
    allBuses.forEach(bus => {
      console.log(`   - ${bus.busNumber}: ${bus.driverName}, ${bus.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

addBuses();