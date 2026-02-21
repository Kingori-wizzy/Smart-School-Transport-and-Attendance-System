const express = require('express');
const router = express.Router();
const Attendance = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// 📊 Get today's attendance for a child
router.get('/child/:childId/today', async (req, res) => {
  try {
    const { childId } = req.params;
    
    // Verify child exists (optional)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      studentId: childId,
      createdAt: { $gte: today, $lt: tomorrow }
    }).populate('tripId', 'routeName busNumber');

    if (!attendance) {
      return res.json({
        present: false,
        status: 'not recorded',
        message: 'No attendance recorded for today'
      });
    }

    res.json({
      present: attendance.eventType === 'board',
      status: attendance.eventType === 'board' ? 'present' : 
              attendance.eventType === 'late' ? 'late' : 'absent',
      checkIn: attendance.createdAt,
      eventType: attendance.eventType,
      busNumber: attendance.tripId?.busNumber || attendance.busNumber
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ message: error.message });
  }
});

// 📅 Get attendance history for a child
router.get('/child/:childId', async (req, res) => {
  try {
    const { childId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    const query = { studentId: childId };
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendance = await Attendance.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('tripId', 'routeName busNumber');

    // Format the response
    const formattedAttendance = attendance.map(record => ({
      id: record._id,
      date: record.createdAt.toISOString().split('T')[0],
      status: record.eventType === 'board' ? 'present' : 
              record.eventType === 'late' ? 'late' : 'absent',
      checkIn: record.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      checkOut: null,
      busNumber: record.tripId?.busNumber || record.busNumber,
      eventType: record.eventType,
      driverName: record.driverName
    }));

    res.json(formattedAttendance);
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ message: error.message });
  }
});

// 📊 Get attendance statistics for a child
router.get('/child/:childId/stats', async (req, res) => {
  try {
    const { childId } = req.params;
    const { months = 3 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const attendance = await Attendance.find({
      studentId: childId,
      createdAt: { $gte: startDate }
    });

    const total = attendance.length;
    const present = attendance.filter(a => a.eventType === 'board').length;
    const late = attendance.filter(a => a.eventType === 'late').length;
    const absent = total - present - late;

    // Calculate average pickup time
    const morningTrips = attendance.filter(a => {
      const hour = a.createdAt.getHours();
      return hour >= 6 && hour <= 9;
    });

    let avgPickup = '--:--';
    if (morningTrips.length > 0) {
      const totalMinutes = morningTrips.reduce((sum, a) => {
        return sum + a.createdAt.getHours() * 60 + a.createdAt.getMinutes();
      }, 0);
      const avgMinutes = Math.floor(totalMinutes / morningTrips.length);
      const hours = Math.floor(avgMinutes / 60);
      const minutes = avgMinutes % 60;
      avgPickup = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Calculate average dropoff time
    const afternoonTrips = attendance.filter(a => {
      const hour = a.createdAt.getHours();
      return hour >= 15 && hour <= 18;
    });

    let avgDropoff = '--:--';
    if (afternoonTrips.length > 0) {
      const totalMinutes = afternoonTrips.reduce((sum, a) => {
        return sum + a.createdAt.getHours() * 60 + a.createdAt.getMinutes();
      }, 0);
      const avgMinutes = Math.floor(totalMinutes / afternoonTrips.length);
      const hours = Math.floor(avgMinutes / 60);
      const minutes = avgMinutes % 60;
      avgDropoff = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Calculate days enrolled (unique days)
    const uniqueDays = new Set(attendance.map(a => 
      a.createdAt.toISOString().split('T')[0]
    )).size;

    res.json({
      attendanceRate: total > 0 ? Math.round((present / total) * 100) : 0,
      totalTrips: total,
      lateArrivals: late,
      averagePickup: avgPickup,
      averageDropoff: avgDropoff,
      daysEnrolled: uniqueDays,
      present,
      absent,
      late
    });
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// 📥 Export attendance report
router.get('/child/:childId/export', async (req, res) => {
  try {
    const { childId } = req.params;
    const { month } = req.query;

    const startDate = new Date(month);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.find({
      studentId: childId,
      createdAt: { $gte: startDate, $lt: endDate }
    }).sort({ createdAt: 1 }).populate('tripId', 'routeName busNumber');

    // Format as CSV
    const csvRows = [
      ['Date', 'Status', 'Check In', 'Check Out', 'Bus Number', 'Driver'].join(','),
      ...attendance.map(a => [
        a.createdAt.toISOString().split('T')[0],
        a.eventType === 'board' ? 'Present' : a.eventType === 'late' ? 'Late' : 'Absent',
        a.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        '',
        a.tripId?.busNumber || a.busNumber || 'N/A',
        a.driverName || 'N/A'
      ].join(','))
    ];

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${childId}-${month}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;