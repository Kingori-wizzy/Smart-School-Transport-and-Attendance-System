const Attendance = require('../models/AttendanceRecord');

async function getDailySummary() {
  const today = new Date();
  today.setHours(0,0,0,0);

  const records = await Attendance.find({
    createdAt: { $gte: today }
  });

  const totalBoarded = records.filter(r => r.eventType === 'board').length;
  const totalAlighted = records.filter(r => r.eventType === 'alight').length;

  return {
    totalBoarded,
    totalAlighted,
    totalActiveStudents: totalBoarded - totalAlighted
  };
}

module.exports = { getDailySummary };
