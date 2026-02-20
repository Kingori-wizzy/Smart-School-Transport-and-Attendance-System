const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function addAttendance() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get student
    const student = await db.collection('students').findOne({});
    
    if (!student) {
      console.log('❌ No student found');
      return;
    }
    
    // Create attendance records
    const attendanceRecords = [
      {
        studentId: student.studentId || 'STU1001',
        studentName: student.name || 'John Doe',
        busId: 'BUS001',
        busNumber: 'BUS001',
        type: 'boarding',
        timestamp: new Date(today.getTime() + 7 * 60 * 60 * 1000), // 7:00 AM
        date: today,
        status: 'present'
      },
      {
        studentId: student.studentId || 'STU1001',
        studentName: student.name || 'John Doe',
        busId: 'BUS001',
        busNumber: 'BUS001',
        type: 'alighting',
        timestamp: new Date(today.getTime() + 16 * 60 * 60 * 1000), // 4:00 PM
        date: today,
        status: 'present'
      }
    ];
    
    // Clear old attendance for today
    await db.collection('attendances').deleteMany({ date: today });
    
    // Insert new records
    const result = await db.collection('attendances').insertMany(attendanceRecords);
    console.log(`✅ Added ${result.insertedCount} attendance records`);
    
    // Also add to attendancerecords if that's what your app uses
    await db.collection('attendancerecords').deleteMany({ date: today });
    const result2 = await db.collection('attendancerecords').insertMany(attendanceRecords);
    console.log(`✅ Added ${result2.insertedCount} records to attendancerecords`);
    
    // Show summary
    const attendanceCount = await db.collection('attendances').countDocuments();
    const recordsCount = await db.collection('attendancerecords').countDocuments();
    console.log(`\n📊 Summary:`);
    console.log(`   attendances: ${attendanceCount} records`);
    console.log(`   attendancerecords: ${recordsCount} records`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

addAttendance();