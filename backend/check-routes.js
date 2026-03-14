const mongoose = require('mongoose');
const Route = require('./models/Route');
require('dotenv').config();

async function checkRoutes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const routes = await Route.find().select('name');
    
    console.log('🗺️ ROUTES IN DATABASE:');
    console.log('========================');
    
    if (routes.length === 0) {
      console.log('❌ No routes found!');
    } else {
      routes.forEach((r, i) => {
        console.log(i + 1 + '. ' + r.name);
      });
      console.log('\n✅ Total routes:', routes.length);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkRoutes();
