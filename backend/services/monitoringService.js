const Student = require('../models/Student');
const Attendance = require('../models/AttendanceRecord');
const Notification = require('../models/Notification');

async function detectAbsentStudents(trip) {
  const students = await Student.find({ routeName: trip.routeName });

  const boardedRecords = await Attendance.find({
    tripId: trip._id,
    eventType: 'board'
  });

  const boardedStudentIds = boardedRecords.map(r => r.studentId.toString());

  const absentStudents = students.filter(
    s => !boardedStudentIds.includes(s._id.toString())
  );

  return absentStudents;
}

module.exports = { detectAbsentStudents };
