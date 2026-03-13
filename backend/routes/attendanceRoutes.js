const express = require('express');
const router = express.Router();
const Attendance = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const Trip = require('../models/Trip');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// ==================== DRIVER ENDPOINTS (for mobile app) ====================

/**
 * @route   POST /api/attendance/driver/trip/:tripId/board/:studentId
 * @desc    Record student boarding (called from driver app)
 * @access  Private (Driver only)
 */
router.post('/driver/trip/:tripId/board/:studentId', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { method, timestamp, syncedFromOffline, location, deviceId } = req.body;

    // Verify the trip exists and is active
    const trip = await Trip.findById(tripId).populate('busId');
    if (!trip) {
      return res.status(404).json({ 
        success: false, 
        error: 'Trip not found' 
      });
    }

    // Verify the student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ 
        success: false, 
        error: 'Student not found' 
      });
    }

    // Check if student already boarded this trip (avoid duplicates)
    const existingAttendance = await Attendance.findOne({
      studentId,
      tripId,
      eventType: 'board'
    });

    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        error: 'Student already boarded this trip',
        data: existingAttendance
      });
    }

    // Create attendance record
    const attendance = new Attendance({
      studentId,
      tripId,
      busId: trip.busId?._id || req.user.busId,
      busNumber: trip.busId?.busNumber || req.body.busNumber,
      driverName: req.user.name || req.body.driverName,
      createdAt: timestamp || new Date(),
      eventType: 'board',
      method: method || 'qr',
      location: location ? {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      } : null,
      metadata: {
        deviceId,
        syncedFromOffline: syncedFromOffline || false,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    await attendance.save();

    // Update student's current status
    await Student.findByIdAndUpdate(studentId, {
      currentTrip: tripId,
      lastBoardingTime: new Date(),
      currentStatus: 'onboard'
    });

    // Emit real-time update via socket
    if (req.io) {
      req.io.to(`trip-${tripId}`).emit('student-boarded', {
        studentId,
        studentName: student.name,
        timestamp: attendance.createdAt,
        attendanceId: attendance._id
      });

      if (student.parentId) {
        req.io.to(`parent-${student.parentId}`).emit('child-boarded', {
          studentId,
          studentName: student.name,
          tripId,
          timestamp: attendance.createdAt
        });
      }
    }

    res.json({
      success: true,
      data: attendance,
      message: 'Boarding recorded successfully'
    });

  } catch (error) {
    console.error('❌ Boarding error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/attendance/driver/trip/:tripId/alight/:studentId
 * @desc    Record student alighting
 * @access  Private (Driver only)
 */
router.post('/driver/trip/:tripId/alight/:studentId', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { method, timestamp, location } = req.body;

    const boardingRecord = await Attendance.findOne({
      studentId,
      tripId,
      eventType: 'board'
    });

    if (!boardingRecord) {
      return res.status(404).json({
        success: false,
        error: 'No boarding record found for this student on this trip'
      });
    }

    const alighting = new Attendance({
      studentId,
      tripId,
      busId: boardingRecord.busId,
      busNumber: boardingRecord.busNumber,
      driverName: req.user.name,
      createdAt: timestamp || new Date(),
      eventType: 'alight',
      method: method || 'qr',
      location: location ? {
        type: 'Point',
        coordinates: [location.lng, location.lat]
      } : null,
      metadata: {
        relatedBoardId: boardingRecord._id
      }
    });

    await alighting.save();

    await Student.findByIdAndUpdate(studentId, {
      currentTrip: null,
      lastAlightingTime: new Date(),
      currentStatus: 'offboard'
    });

    if (req.io) {
      req.io.to(`trip-${tripId}`).emit('student-alighted', {
        studentId,
        timestamp: alighting.createdAt
      });
    }

    res.json({
      success: true,
      data: alighting,
      message: 'Alighting recorded successfully'
    });

  } catch (error) {
    console.error('❌ Alighting error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/attendance/driver/sync-offline
 * @desc    Sync multiple offline attendance records
 * @access  Private (Driver only)
 */
router.post('/driver/sync-offline', async (req, res) => {
  try {
    const { scans, deviceId } = req.body;
    
    if (!Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid scans array'
      });
    }

    const results = [];
    const syncBatch = Date.now().toString();

    for (const scan of scans) {
      try {
        const { studentId, tripId, method, timestamp, location, type = 'board' } = scan;

        const existing = await Attendance.findOne({
          studentId,
          tripId,
          createdAt: timestamp,
          eventType: type
        });

        if (existing) {
          results.push({
            success: true,
            studentId,
            status: 'duplicate',
            attendanceId: existing._id
          });
          continue;
        }

        const attendance = new Attendance({
          studentId,
          tripId,
          createdAt: timestamp || new Date(),
          eventType: type,
          method: method || 'qr',
          location: location ? {
            type: 'Point',
            coordinates: [location.lng, location.lat]
          } : null,
          metadata: {
            deviceId,
            syncedFromOffline: true,
            syncBatch
          }
        });

        await attendance.save();

        results.push({
          success: true,
          studentId,
          status: 'synced',
          attendanceId: attendance._id
        });

      } catch (error) {
        results.push({
          success: false,
          studentId: scan.studentId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      batch: syncBatch,
      summary: {
        total: scans.length,
        synced: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        duplicates: results.filter(r => r.status === 'duplicate').length
      },
      results
    });

  } catch (error) {
    console.error('❌ Offline sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/attendance/driver/trip/:tripId/students
 * @desc    Get all students who boarded a specific trip
 * @access  Private (Driver only)
 */
router.get('/driver/trip/:tripId/students', async (req, res) => {
  try {
    const { tripId } = req.params;

    const boardings = await Attendance.find({
      tripId,
      eventType: 'board'
    }).populate('studentId', 'firstName lastName name classLevel parentId photo');

    const alightings = await Attendance.find({
      tripId,
      eventType: 'alight'
    });

    const alightedMap = {};
    alightings.forEach(a => {
      alightedMap[a.studentId.toString()] = a.createdAt;
    });

    const students = boardings.map(b => ({
      ...b.studentId.toObject(),
      boardedAt: b.createdAt,
      alightedAt: alightedMap[b.studentId._id.toString()] || null,
      status: alightedMap[b.studentId._id.toString()] ? 'completed' : 'onboard'
    }));

    res.json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('❌ Error fetching trip students:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ==================== PARENT/CHILD ENDPOINTS ====================

// 📊 Get today's attendance for a child
router.get('/child/:childId/today', async (req, res) => {
  try {
    const { childId } = req.params;
    
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

// ==================== DASHBOARD STATS ENDPOINTS ====================

// 📊 Get overall attendance stats for dashboard (detailed version)
router.get('/stats/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    // Get today's stats
    const [todayBoarded, totalStudents, uniqueStudentsToday, byClass, weekly] = await Promise.all([
      Attendance.countDocuments({
        createdAt: { $gte: today, $lt: tomorrow },
        eventType: 'board'
      }),
      Student.countDocuments({ isActive: true }),
      
      // Unique students who attended today
      Attendance.distinct('studentId', {
        createdAt: { $gte: today, $lt: tomorrow },
        eventType: 'board'
      }),
      
      // Attendance by class today
      Attendance.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
            eventType: 'board'
          }
        },
        {
          $lookup: {
            from: 'students',
            localField: 'studentId',
            foreignField: '_id',
            as: 'student'
          }
        },
        { $unwind: '$student' },
        {
          $group: {
            _id: '$student.classLevel',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      
      // Weekly trend
      Attendance.aggregate([
        {
          $match: {
            createdAt: { $gte: lastWeek },
            eventType: 'board'
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);
    
    // Get monthly trend
    const monthly = await Attendance.aggregate([
      {
        $match: {
          createdAt: { $gte: lastMonth },
          eventType: 'board'
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" }
          },
          date: { $first: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { date: 1 } },
      {
        $project: {
          _id: 0,
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          count: 1
        }
      }
    ]);
    
    // Get peak hours
    const peakHours = await Attendance.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          eventType: 'board'
        }
      },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const uniqueStudentsCount = uniqueStudentsToday.length;
    
    res.json({
      success: true,
      data: {
        today: todayBoarded,
        totalStudents,
        attendanceRate: totalStudents > 0 
          ? Math.round((uniqueStudentsCount / totalStudents) * 100) 
          : 0,
        uniqueStudents: uniqueStudentsCount,
        weekly,
        monthly,
        byClass,
        peakHours,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error fetching attendance stats summary:', error);
    res.json({
      success: true,
      data: {
        today: 0,
        totalStudents: 0,
        attendanceRate: 0,
        uniqueStudents: 0,
        weekly: [],
        monthly: [],
        byClass: [],
        peakHours: [],
        timestamp: new Date()
      }
    });
  }
});

// 📊 Get overall attendance stats for dashboard (basic version)
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await Attendance.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
      eventType: 'board'
    });
    
    const totalStudents = await Student.countDocuments({ isActive: true });
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const weeklyAttendance = await Attendance.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeek },
          eventType: 'board'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const attendanceByClass = await Attendance.aggregate([
      {
        $match: {
          createdAt: { $gte: today, $lt: tomorrow },
          eventType: 'board'
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $group: {
          _id: '$student.classLevel',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        today: todayCount,
        totalStudents,
        attendanceRate: totalStudents > 0 
          ? Math.round((todayCount / totalStudents) * 100) 
          : 0,
        weekly: weeklyAttendance,
        byClass: attendanceByClass,
        timestamp: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.json({
      success: true,
      data: {
        today: 0,
        totalStudents: 0,
        attendanceRate: 0,
        weekly: [],
        byClass: [],
        timestamp: new Date()
      }
    });
  }
});

// ==================== DASHBOARD ENDPOINTS ====================

// Get today's attendance summary for dashboard scanner
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const totalStudents = await Student.countDocuments({ isActive: true });
    const presentToday = await Attendance.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
      eventType: 'board'
    });
    
    const recentScans = await Attendance.find({
      createdAt: { $gte: today }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('studentId', 'firstName lastName name class')
    .populate('tripId', 'routeName');
    
    res.json({
      success: true,
      data: {
        total: totalStudents,
        present: presentToday,
        attendanceRate: totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0,
        recentScans: recentScans.map(scan => ({
          id: scan._id,
          studentName: scan.studentId?.name || 
                      `${scan.studentId?.firstName || ''} ${scan.studentId?.lastName || ''}`.trim() || 
                      'Unknown',
          class: scan.studentId?.class || scan.studentId?.classLevel || 'N/A',
          time: scan.createdAt,
          type: scan.eventType,
          route: scan.tripId?.routeName || 'N/A',
          busNumber: scan.busNumber
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get attendance by date range
router.get('/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      };
    }
    
    const attendance = await Attendance.find(query)
      .sort({ createdAt: -1 })
      .populate('studentId', 'firstName lastName name class classLevel')
      .populate('tripId', 'routeName busNumber');
    
    const groupedByDate = {};
    attendance.forEach(record => {
      const date = record.createdAt.toISOString().split('T')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = { present: 0, late: 0, absent: 0, total: 0 };
      }
      if (record.eventType === 'board') {
        groupedByDate[date].present++;
      } else if (record.eventType === 'late') {
        groupedByDate[date].late++;
      }
      groupedByDate[date].total++;
    });
    
    res.json({
      success: true,
      data: {
        records: attendance.map(record => ({
          id: record._id,
          date: record.createdAt,
          studentName: record.studentId?.name || 
                      `${record.studentId?.firstName || ''} ${record.studentId?.lastName || ''}`.trim() || 
                      'Unknown',
          className: record.studentId?.class || record.studentId?.classLevel || 'N/A',
          status: record.eventType === 'board' ? 'present' : 
                  record.eventType === 'late' ? 'late' : 'absent',
          checkIn: record.createdAt,
          busNumber: record.busNumber || record.tripId?.busNumber,
          routeName: record.tripId?.routeName
        })),
        chartData: groupedByDate
      }
    });
  } catch (error) {
    console.error('Error fetching attendance by range:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;