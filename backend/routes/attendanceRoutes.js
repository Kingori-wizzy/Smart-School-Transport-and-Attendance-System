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
      eventType: 'board', // 'board', 'alight', 'late', 'absent'
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

    // Emit real-time update via socket (if you have socket.io set up)
    if (req.io) {
      req.io.to(`trip-${tripId}`).emit('student-boarded', {
        studentId,
        studentName: student.name,
        timestamp: attendance.createdAt,
        attendanceId: attendance._id
      });

      // Notify parent if socket rooms exist
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

    // Find the boarding record
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

    // Create alighting record
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

    // Update student status
    await Student.findByIdAndUpdate(studentId, {
      currentTrip: null,
      lastAlightingTime: new Date(),
      currentStatus: 'offboard'
    });

    // Emit real-time update
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
        const { studentId, tripId, method, timestamp, location } = scan;

        // Check for duplicate
        const existing = await Attendance.findOne({
          studentId,
          tripId,
          createdAt: timestamp,
          eventType: 'board'
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

        // Create attendance record
        const attendance = new Attendance({
          studentId,
          tripId,
          createdAt: timestamp || new Date(),
          eventType: 'board',
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
    }).populate('studentId', 'name classLevel parentId photo');

    const alightings = await Attendance.find({
      tripId,
      eventType: 'alight'
    });

    // Create map of alighted students
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

// ==================== PARENT/CHILD ENDPOINTS (your existing code) ====================

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