const mongoose = require('mongoose');

// MongoDB Atlas (source)
const ATLAS_URI = 'mongodb+srv://smartschool_system:364VTPjose@cluster0.4u783we.mongodb.net/smartSchoolDB?retryWrites=true&w=majority';

// Local Docker MongoDB (destination)
const LOCAL_URI = 'mongodb://mongodb:27017/smartSchoolDB';

async function migrate() {
  console.log('═══════════════════════════════════════════════════');
  console.log('📦 Starting migration from Atlas to Local MongoDB');
  console.log('═══════════════════════════════════════════════════\n');

  let atlasConn, localConn;

  try {
    // Connect to Atlas (this will fail if VPN is not on)
    console.log('🔗 Connecting to MongoDB Atlas...');
    console.log('   If this hangs, you need to connect to VPN first');
    atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
    console.log('✅ Connected to Atlas successfully\n');

    // Connect to Local
    console.log('🔗 Connecting to Local Docker MongoDB...');
    localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
    console.log('✅ Connected to Local successfully\n');

    // Get all users from Atlas
    console.log('📋 Fetching users from Atlas...');
    const users = await atlasConn.collection('users').find({}).toArray();
    console.log(`   Found ${users.length} users`);

    if (users.length > 0) {
      // Insert into local (skip duplicates)
      console.log('📥 Importing users to local database...');
      for (const user of users) {
        try {
          await localConn.collection('users').updateOne(
            { email: user.email },
            { $set: user },
            { upsert: true }
          );
        } catch (err) {
          console.log(`   ⚠️ Could not import user ${user.email}: ${err.message}`);
        }
      }
      console.log(`✅ Imported ${users.length} users`);
    }

    // Get students
    try {
      console.log('\n📋 Fetching students from Atlas...');
      const students = await atlasConn.collection('students').find({}).toArray();
      console.log(`   Found ${students.length} students`);
      
      if (students.length > 0) {
        for (const student of students) {
          await localConn.collection('students').updateOne(
            { _id: student._id },
            { $set: student },
            { upsert: true }
          );
        }
        console.log(`✅ Imported ${students.length} students`);
      }
    } catch (err) {
      console.log(`⚠️ Students collection may not exist: ${err.message}`);
    }

    // Get buses
    try {
      console.log('\n📋 Fetching buses from Atlas...');
      const buses = await atlasConn.collection('buses').find({}).toArray();
      console.log(`   Found ${buses.length} buses`);
      
      if (buses.length > 0) {
        for (const bus of buses) {
          await localConn.collection('buses').updateOne(
            { _id: bus._id },
            { $set: bus },
            { upsert: true }
          );
        }
        console.log(`✅ Imported ${buses.length} buses`);
      }
    } catch (err) {
      console.log(`⚠️ Buses collection may not exist: ${err.message}`);
    }

    // Get trips
    try {
      console.log('\n📋 Fetching trips from Atlas...');
      const trips = await atlasConn.collection('trips').find({}).toArray();
      console.log(`   Found ${trips.length} trips`);
      
      if (trips.length > 0) {
        for (const trip of trips) {
          await localConn.collection('trips').updateOne(
            { _id: trip._id },
            { $set: trip },
            { upsert: true }
          );
        }
        console.log(`✅ Imported ${trips.length} trips`);
      }
    } catch (err) {
      console.log(`⚠️ Trips collection may not exist: ${err.message}`);
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const localUsers = await localConn.collection('users').countDocuments();
    const localStudents = await localConn.collection('students').countDocuments();
    const localBuses = await localConn.collection('buses').countDocuments();
    
    console.log('\n📊 Local Database Summary:');
    console.log(`   Users: ${localUsers}`);
    console.log(`   Students: ${localStudents}`);
    console.log(`   Buses: ${localBuses}`);
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n💡 TIP: Make sure you are connected to VPN first!');
    console.error('   MongoDB Atlas requires network access from your IP.\n');
  } finally {
    if (atlasConn) await atlasConn.close();
    if (localConn) await localConn.close();
    process.exit(0);
  }
}

migrate();