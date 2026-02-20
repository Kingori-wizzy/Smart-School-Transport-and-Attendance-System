const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

console.log('🔍 Checking MongoDB connection...');
console.log('URI:', uri.replace(/:.*@/, ':****@')); // Hide password in logs

async function checkData() {
  const client = new MongoClient(uri);
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!\n');
    
    const db = client.db();
    console.log('📁 Database name:', db.databaseName);
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('⚠️ No collections found in database');
    } else {
      console.log('\n📚 Collections found:');
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`   📄 ${collection.name}: ${count} documents`);
      }
    }
    
    // Check specifically for students and buses
    console.log('\n🎯 TARGET DATA CHECK:');
    
    // Check students
    const studentsExist = collections.some(c => c.name === 'students' || c.name === 'Student');
    if (studentsExist) {
      const studentCount = await db.collection('students').countDocuments();
      console.log(`   👥 Students: ${studentCount}`);
      
      if (studentCount > 0) {
        const sampleStudent = await db.collection('students').findOne();
        console.log('      Sample student:', sampleStudent.name || sampleStudent.studentName);
      }
    } else {
      console.log('   ❌ Students collection not found');
      
      // Look for any collection that might contain student data
      for (const collection of collections) {
        if (collection.name.toLowerCase().includes('student')) {
          console.log(`      Found possible student collection: ${collection.name}`);
          const count = await db.collection(collection.name).countDocuments();
          console.log(`      Documents in ${collection.name}: ${count}`);
        }
      }
    }
    
    // Check buses
    const busesExist = collections.some(c => c.name === 'buses' || c.name === 'Bus' || c.name === 'trips');
    if (busesExist) {
      const busCount = await db.collection('buses').countDocuments();
      console.log(`   🚌 Buses: ${busCount}`);
      
      if (busCount > 0) {
        const sampleBus = await db.collection('buses').findOne();
        console.log('      Sample bus:', sampleBus.busNumber || sampleBus.name);
      }
    } else {
      console.log('   ❌ Buses collection not found');
    }
    
    // List all collection names for debugging
    console.log('\n📋 All collection names:');
    collections.forEach(c => console.log(`   - ${c.name}`));
    
  } catch (error) {
    console.error('\n❌ ERROR:');
    console.error('   Name:', error.name);
    console.error('   Message:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
  } finally {
    await client.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the check
checkData();