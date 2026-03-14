const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkDrivers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const drivers = await User.find({ role: 'driver' }).select('firstName lastName email');
    
    console.log('👤 DRIVERS IN DATABASE:');
    console.log('========================');
    
    if (drivers.length === 0) {
      console.log('❌ No drivers found!');
    } else {
      drivers.forEach((d, i) => {
        console.log(i + 1 + '. ' + d.firstName + ' ' + d.lastName + ' - ' + d.email);
      });
      console.log('\n✅ Total drivers:', drivers.length);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkDrivers();
