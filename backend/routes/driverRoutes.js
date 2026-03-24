const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/authMiddleware');
const Trip = require('../models/Trip');
const Student = require('../models/Student');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Attendance = require('../models/AttendanceRecord');
const GPSLog = require('../models/GPSLog');
const IncidentReport = require('../models/IncidentReport');
const Notification = require('../models/Notification');
const NotificationSetting = require('../models/NotificationSetting');
const emailService = require('../services/emailService');

// Helper function to calculate distance between two points (Haversine formula)
function getDistance(point1, point2) {
  if (!point1 || !point2) return Infinity;
  
  const R = 6371;
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;
  const deltaLat = (point2.lat - point1.lat) * Math.PI / 180;
  const deltaLng = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

// Helper function to send push notifications via Firebase
async function sendPushNotification(fcmToken, notification) {
  try {
    console.log(`📱 Push notification to ${fcmToken}:`, notification);
    return true;
  } catch (error) {
    console.error('Error sending push:', error);
    return false;
  }
}

// Helper function to check if user wants to receive notifications
async function shouldSendNotification(userId, alertType, channel = 'email') {
  try {
    const settings = await NotificationSetting.findOne({ userId });
    if (!settings) return true; // Default to enabled if no settings
    
    // Check channel preferences
    if (channel === 'email' && !settings.emailEnabled) return false;
    if (channel === 'sms' && !settings.smsEnabled) return false;
    if (channel === 'push' && !settings.pushEnabled) return false;
    
    // Check alert type preferences
    switch(alertType) {
      case 'attendance':
      case 'board':
      case 'alight':
        return settings.attendanceAlerts;
      case 'speed':
        return settings.speedAlerts;
      case 'geofence':
        return settings.geofenceAlerts;
      case 'fuel':
        return settings.fuelAlerts;
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return true; // Default to sending on error
  }
}

// Helper function to check quiet hours
function isQuietHour(settings) {
  if (!settings || !settings.quietHoursEnabled) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const [startHour, startMinute] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMinute] = settings.quietHoursEnd.split(':').map(Number);
  
  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;
  
  if (startTime < endTime) {
    return currentTime >= startTime && currentTime < endTime;
  } else {
    return currentTime >= startTime || currentTime < endTime;
  }
}

// Helper function to notify parent about student event (EMAIL + PUSH)
async function notifyParent(studentId, tripId, eventType, additionalData = {}) {
  try {
    const student = await Student.findById(studentId).populate('parentId', 'fcmToken firstName lastName email phone');
    if (!student || !student.parentId) return false;
    
    const parent = student.parentId;
    const trip = await Trip.findById(tripId);
    const timeStr = new Date().toLocaleTimeString();
    const busNumber = student.busNumber || trip?.vehicleId || 'N/A';
    
    let title, message, notificationType, emailTemplate;
    let emailParams = [];
    
    if (eventType === 'board') {
      title = `🚌 ${student.firstName} has boarded the bus`;
      message = `${student.firstName} ${student.lastName} has boarded the bus at ${timeStr}`;
      notificationType = 'student_boarded';
      emailTemplate = 'boarding';
      emailParams = [student.firstName, timeStr, busNumber];
    } else if (eventType === 'alight') {
      title = `🏠 ${student.firstName} has alighted`;
      message = `${student.firstName} ${student.lastName} has alighted from the bus at ${timeStr}`;
      notificationType = 'student_alighted';
      emailTemplate = 'alighting';
      emailParams = [student.firstName, timeStr, busNumber];
    } else if (eventType === 'trip_start') {
      title = `🚍 Trip Started: ${trip?.routeName || 'School Bus'}`;
      message = `Your child's bus has started its journey.`;
      notificationType = 'trip_started';
      emailTemplate = 'tripStart';
      emailParams = [trip?.routeName || 'School Bus', busNumber, 'Track in app'];
    } else if (eventType === 'trip_end') {
      title = `✅ Trip Completed: ${trip?.routeName || 'School Bus'}`;
      message = `Your child's bus trip has been completed.`;
      notificationType = 'trip_completed';
      emailTemplate = 'tripComplete';
      emailParams = [trip?.routeName || 'School Bus', busNumber];
    } else if (eventType === 'delay') {
      title = `⏰ Delay Update: ${trip?.routeName || 'School Bus'}`;
      message = additionalData.message || `The bus is delayed by approximately ${additionalData.minutes} minutes.`;
      notificationType = 'trip_delayed';
      emailTemplate = 'delay';
      emailParams = [student.firstName, additionalData.minutes || 'some', additionalData.reason || 'unforeseen circumstances'];
    } else {
      return false;
    }
    
    // Check user notification settings
    const emailEnabled = await shouldSendNotification(parent._id, eventType, 'email');
    const pushEnabled = await shouldSendNotification(parent._id, eventType, 'push');
    
    // Get quiet hours settings
    const settings = await NotificationSetting.findOne({ userId: parent._id });
    const isQuiet = isQuietHour(settings);
    
    // Save to database regardless of preferences
    const notification = new Notification({
      userId: parent._id,
      userType: 'parent',
      parentId: parent._id,
      studentId: student._id,
      tripId: tripId,
      message: message,
      title: title,
      type: notificationType,
      status: 'sent',
      isRead: false,
      metadata: {
        eventType,
        timestamp: new Date(),
        busNumber,
        time: timeStr,
        isQuiet,
        ...additionalData
      }
    });
    await notification.save();
    
    // Send EMAIL if enabled and not quiet hour
    if (emailEnabled && !isQuiet && parent.email) {
      const emailResult = await emailService.sendParentNotification(parent, emailTemplate, {
        studentName: student.firstName,
        time: timeStr,
        busNumber: busNumber,
        routeName: trip?.routeName,
        minutes: additionalData.minutes,
        reason: additionalData.reason
      });
      console.log(`📧 Email to ${parent.email}: ${emailResult.success ? '✅' : '❌'}`);
    } else if (isQuiet) {
      console.log(`🔇 Quiet hours - email suppressed for ${parent.email}`);
    }
    
    // Send Push Notification if enabled and not quiet hour
    if (pushEnabled && !isQuiet && parent.fcmToken) {
      await sendPushNotification(parent.fcmToken, {
        title,
        body: message,
        data: {
          type: notificationType,
          studentId: student._id.toString(),
          tripId: tripId?.toString(),
          ...additionalData
        }
      });
    } else if (isQuiet) {
      console.log(`🔇 Quiet hours - push suppressed for ${parent.email}`);
    }
    
    console.log(`📧 Notification sent to parent of ${student.firstName}: ${title} (Email: ${emailEnabled}, Push: ${pushEnabled}, Quiet: ${isQuiet})`);
    return true;
  } catch (error) {
    console.error('Error notifying parent:', error);
    return false;
  }
}

// Helper function to notify all parents on a trip (EMAIL + PUSH)
async function notifyAllParents(tripId, eventType, additionalData = {}) {
  try {
    const trip = await Trip.findById(tripId).populate('students', 'parentId firstName lastName');
    if (!trip) return false;
    
    const parentIds = [...new Set(trip.students.map(s => s.parentId).filter(Boolean))];
    const parents = await User.find({ _id: { $in: parentIds } });
    
    let title, message, notificationType, emailTemplate;
    let emailParams = [];
    
    if (eventType === 'trip_start') {
      title = `🚍 Trip Started: ${trip.routeName}`;
      message = `The bus has started its journey.`;
      notificationType = 'trip_started';
      emailTemplate = 'tripStart';
      emailParams = [trip.routeName, trip.vehicleId, 'Track in app'];
    } else if (eventType === 'trip_end') {
      title = `✅ Trip Completed: ${trip.routeName}`;
      message = `The bus trip has been completed. All students have arrived safely.`;
      notificationType = 'trip_completed';
      emailTemplate = 'tripComplete';
      emailParams = [trip.routeName, trip.vehicleId];
    } else if (eventType === 'delay') {
      title = `⏰ Delay Update: ${trip.routeName}`;
      message = additionalData.message || `The bus is delayed by approximately ${additionalData.minutes} minutes.`;
      notificationType = 'trip_delayed';
      emailTemplate = 'delay';
      emailParams = ['Your child', additionalData.minutes || 'some', additionalData.reason || 'unforeseen circumstances'];
    } else if (eventType === 'driver_message') {
      title = `📢 Message from Driver: ${trip.routeName}`;
      message = additionalData.message;
      notificationType = 'driver_broadcast';
      emailTemplate = 'driverMessage';
      emailParams = [additionalData.driverName || 'Driver', message];
    } else {
      return false;
    }
    
    let successCount = 0;
    for (const parent of parents) {
      // Check user notification settings
      const emailEnabled = await shouldSendNotification(parent._id, eventType, 'email');
      const pushEnabled = await shouldSendNotification(parent._id, eventType, 'push');
      
      // Get quiet hours settings
      const settings = await NotificationSetting.findOne({ userId: parent._id });
      const isQuiet = isQuietHour(settings);
      
      // Save to database
      const notification = new Notification({
        userId: parent._id,
        userType: 'parent',
        parentId: parent._id,
        tripId: tripId,
        message: message,
        title: title,
        type: notificationType,
        status: 'sent',
        isRead: false,
        metadata: {
          eventType,
          timestamp: new Date(),
          isQuiet,
          ...additionalData
        }
      });
      await notification.save();
      
      // Send EMAIL if enabled and not quiet hour
      if (emailEnabled && !isQuiet && parent.email) {
        const emailResult = await emailService.sendParentNotification(parent, emailTemplate, {
          studentName: '',
          routeName: trip.routeName,
          busNumber: trip.vehicleId,
          minutes: additionalData.minutes,
          reason: additionalData.reason,
          driverName: additionalData.driverName,
          message: message
        });
        if (emailResult.success) successCount++;
      }
      
      // Send Push Notification if enabled and not quiet hour
      if (pushEnabled && !isQuiet && parent.fcmToken) {
        await sendPushNotification(parent.fcmToken, {
          title,
          body: message,
          data: { type: notificationType, tripId: tripId?.toString(), ...additionalData }
        });
      }
    }
    
    console.log(`📧 Broadcast sent to ${successCount}/${parents.length} parents via email`);
    return true;
  } catch (error) {
    console.error('Error notifying all parents:', error);
    return false;
  }
}

// ==================== PUBLIC ROUTES ====================

router.post('/auth/driver/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const driver = await User.findOne({ email, role: 'driver' }).select('+password');

    if (!driver) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!driver.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    driver.lastLogin = new Date();
    await driver.save();

    const token = jwt.sign(
      { id: driver._id, role: driver.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      driver: {
        id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
      },
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ==================== PROTECTED ROUTES ====================

router.use(authMiddleware);
router.use((req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ message: 'Access denied. Driver only.' });
  }
  next();
});

// ==================== PROFILE & STATS ====================

router.get('/profile', async (req, res) => {
  try {
    const driver = await User.findById(req.user.id).select('-password');
    
    const activeTrip = await Trip.findOne({
      driverId: req.user.id,
      status: { $in: ['in-progress', 'running'] }
    });
    
    const responseData = {
      ...driver.toObject(),
      assignedBus: activeTrip ? {
        busNumber: activeTrip.vehicleId || 'Not Assigned',
        tripId: activeTrip._id,
        routeName: activeTrip.routeName
      } : null,
      assignedBusId: activeTrip?.vehicleId || null
    };
    
    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const driverId = req.user.id;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const trips = await Trip.find({
      driverId: driverId,
      scheduledStartTime: { $gte: startOfMonth, $lt: endOfMonth }
    });

    const totalTrips = trips.length;
    const completedTrips = trips.filter(t => t.status === 'completed').length;
    const totalStudents = trips.reduce((sum, trip) => sum + (trip.students?.length || 0), 0);
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 15), 0);

    res.json({
      success: true,
      data: {
        totalTrips,
        completedTrips,
        totalStudents,
        totalDistance,
        onTimeRate: Math.round((completedTrips / totalTrips) * 100) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching driver stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TRIP MANAGEMENT ====================

router.get('/current-trip', async (req, res) => {
  try {
    const trip = await Trip.findOne({
      driverId: req.user.id,
      status: { $in: ['in-progress', 'running'] },
    }).populate('students', 'firstName lastName admissionNumber qrCode');

    if (!trip) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        id: trip._id,
        routeName: trip.routeName || 'Unknown Route',
        busNumber: trip.vehicleId || 'Not Assigned',
        status: trip.status,
        startTime: trip.startTime,
        studentCount: trip.students?.length || 0,
        students: trip.students || []
      }
    });
  } catch (error) {
    console.error('Error fetching current trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/trips/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const trips = await Trip.find({
      driverId: req.user.id,
      scheduledStartTime: { $gte: today, $lt: tomorrow },
    }).populate('students', 'firstName lastName admissionNumber qrCode').sort({ scheduledStartTime: 1 });

    const formattedTrips = trips.map(trip => ({
      _id: trip._id,
      id: trip._id,
      routeName: trip.routeName || 'Unknown Route',
      startTime: trip.scheduledStartTime,
      scheduledStartTime: trip.scheduledStartTime,
      endTime: trip.scheduledEndTime,
      scheduledEndTime: trip.scheduledEndTime,
      busNumber: trip.vehicleId || 'Not Assigned',
      status: trip.status || 'scheduled',
      studentCount: trip.students?.length || 0,
      students: trip.students || [],
      type: trip.tripType || 'morning_pickup'
    }));

    res.json({ success: true, trips: formattedTrips, count: formattedTrips.length });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/trips/:tripId', async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.tripId,
      driverId: req.user.id,
    }).populate('students', 'firstName lastName admissionNumber qrCode');

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    res.json({
      success: true,
      data: {
        _id: trip._id,
        routeName: trip.routeName || 'Unknown Route',
        busNumber: trip.vehicleId || 'Not Assigned',
        status: trip.status,
        scheduledStartTime: trip.scheduledStartTime,
        scheduledEndTime: trip.scheduledEndTime,
        startTime: trip.startTime,
        endTime: trip.endTime,
        type: trip.tripType,
        students: trip.students || []
      }
    });
  } catch (error) {
    console.error('Error fetching trip details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/trips/:tripId/students', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId).populate('students', 'firstName lastName classLevel admissionNumber transportDetails qrCode busNumber');
      
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const boardedRecords = await Attendance.find({
      tripId: req.params.tripId,
      eventType: 'board'
    });

    const alightedRecords = await Attendance.find({
      tripId: req.params.tripId,
      eventType: 'alight'
    });

    const boardedSet = new Set(boardedRecords.map(r => r.studentId.toString()));
    const alightedSet = new Set(alightedRecords.map(r => r.studentId.toString()));

    const studentsWithStatus = (trip.students || []).map(s => ({
      _id: s._id,
      id: s._id,
      firstName: s.firstName,
      lastName: s.lastName,
      classLevel: s.classLevel,
      admissionNumber: s.admissionNumber,
      pickupPoint: s.transportDetails?.pickupPoint?.name || s.pickupPoint,
      dropOffPoint: s.transportDetails?.dropoffPoint?.name || s.dropOffPoint,
      coordinates: s.transportDetails?.pickupPoint?.coordinates,
      qrCode: s.qrCode,
      boarded: boardedSet.has(s._id.toString()),
      alighted: alightedSet.has(s._id.toString()),
      status: alightedSet.has(s._id.toString()) ? 'alighted' :
              boardedSet.has(s._id.toString()) ? 'boarded' : 'pending'
    }));

    console.log(`Trip ${trip.routeName} (${trip._id}): ${studentsWithStatus.length} students, ${boardedSet.size} boarded, ${alightedSet.size} alighted`);

    res.json({ success: true, count: studentsWithStatus.length, data: studentsWithStatus });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== QR CODE LOOKUP ENDPOINTS ====================

router.get('/student/by-qr/:qrCode', async (req, res) => {
  try {
    const { qrCode } = req.params;
    const decodedQR = decodeURIComponent(qrCode);
    
    const student = await Student.findOne({ qrCode: decodedQR, isActive: true })
      .select('firstName lastName admissionNumber classLevel busNumber qrCode');
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found for this QR code' });
    }
    
    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Error finding student by QR:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/student/by-admission/:admissionNumber', async (req, res) => {
  try {
    const { admissionNumber } = req.params;
    const decodedAdmission = decodeURIComponent(admissionNumber).toUpperCase();
    
    const student = await Student.findOne({ admissionNumber: decodedAdmission, isActive: true })
      .select('firstName lastName admissionNumber classLevel busNumber qrCode');
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Error finding student by admission:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== MESSAGING ENDPOINTS ====================

// Send message to parent about specific student
router.post('/message/parent/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { message, tripId } = req.body;
    
    const student = await Student.findById(studentId).populate('parentId', 'firstName lastName phone email fcmToken');
    if (!student || !student.parentId) {
      return res.status(404).json({ success: false, message: 'Student or parent not found' });
    }
    
    const parent = student.parentId;
    
    const notification = new Notification({
      userId: parent._id,
      userType: 'parent',
      parentId: parent._id,
      studentId: student._id,
      tripId: tripId || null,
      message: message,
      title: `📨 Message from Driver: ${student.firstName} ${student.lastName}`,
      type: 'driver_message',
      status: 'sent',
      isRead: false,
      metadata: {
        driverId: req.user.id,
        driverName: `${req.user.firstName} ${req.user.lastName}`,
        timestamp: new Date()
      }
    });
    await notification.save();
    
    // Check user notification settings
    const emailEnabled = await shouldSendNotification(parent._id, 'driver_message', 'email');
    const pushEnabled = await shouldSendNotification(parent._id, 'driver_message', 'push');
    const settings = await NotificationSetting.findOne({ userId: parent._id });
    const isQuiet = isQuietHour(settings);
    
    // Send EMAIL if enabled and not quiet hour
    if (emailEnabled && !isQuiet && parent.email) {
      await emailService.sendParentNotification(parent, 'driver_message', {
        driverName: `${req.user.firstName} ${req.user.lastName}`,
        message: message
      });
    }
    
    // Send Push if enabled and not quiet hour
    if (pushEnabled && !isQuiet && parent.fcmToken) {
      await sendPushNotification(parent.fcmToken, {
        title: `Message from Driver (${student.firstName})`,
        body: message,
        data: { type: 'driver_message', studentId, tripId }
      });
    }
    
    res.json({ success: true, message: 'Message sent to parent', data: notification });
  } catch (error) {
    console.error('Error sending message to parent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send broadcast message to all parents on current trip
router.post('/message/broadcast/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { message } = req.body;
    
    const trip = await Trip.findById(tripId).populate('students', 'parentId firstName lastName');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    const parentIds = [...new Set(trip.students.map(s => s.parentId).filter(Boolean))];
    const parents = await User.find({ _id: { $in: parentIds } });
    
    let successCount = 0;
    for (const parent of parents) {
      const notification = new Notification({
        userId: parent._id,
        userType: 'parent',
        parentId: parent._id,
        tripId: tripId,
        message: message,
        title: `📢 Broadcast: ${trip.routeName}`,
        type: 'driver_broadcast',
        status: 'sent',
        isRead: false,
        metadata: {
          driverId: req.user.id,
          driverName: `${req.user.firstName} ${req.user.lastName}`,
          timestamp: new Date()
        }
      });
      await notification.save();
      
      // Check user notification settings
      const emailEnabled = await shouldSendNotification(parent._id, 'driver_message', 'email');
      const settings = await NotificationSetting.findOne({ userId: parent._id });
      const isQuiet = isQuietHour(settings);
      
      // Send EMAIL if enabled and not quiet hour
      if (emailEnabled && !isQuiet && parent.email) {
        const result = await emailService.sendParentNotification(parent, 'driver_message', {
          driverName: `${req.user.firstName} ${req.user.lastName}`,
          message: message
        });
        if (result.success) successCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Broadcast sent to ${successCount} parents via email`
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send delay notification (admin and parents)
router.post('/trips/:tripId/delay', async (req, res) => {
  try {
    const { tripId } = req.params;
    const { reason, estimatedDelayMinutes } = req.body;
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    const lastGPS = await GPSLog.findOne({ tripId }).sort({ timestamp: -1 });
    
    // Notify admins
    const admins = await User.find({ role: 'admin' });
    let adminNotifications = 0;
    
    for (const admin of admins) {
      const notification = new Notification({
        userId: admin._id,
        userType: 'admin',
        parentId: admin._id,
        tripId: tripId,
        message: `Delay on Trip ${trip.routeName}: ${reason}. Estimated delay: ${estimatedDelayMinutes} minutes.`,
        title: `⏰ Delay Alert: ${trip.routeName}`,
        type: 'delay_report',
        status: 'sent',
        isRead: false,
        metadata: {
          driverId: req.user.id,
          driverName: `${req.user.firstName} ${req.user.lastName}`,
          location: lastGPS ? { lat: lastGPS.lat, lng: lastGPS.lon } : null,
          reason,
          estimatedDelayMinutes
        }
      });
      await notification.save();
      adminNotifications++;
      
      // Send EMAIL to admins if enabled
      const emailEnabled = await shouldSendNotification(admin._id, 'delay', 'email');
      if (emailEnabled && admin.email) {
        await emailService.sendEmail(admin.email, `Delay Alert: ${trip.routeName}`, `<h2>Delay Report</h2><p>${notification.message}</p>`);
      }
    }
    
    // Notify all parents about the delay
    const parentIds = [...new Set(trip.students.map(s => s.parentId).filter(Boolean))];
    const parents = await User.find({ _id: { $in: parentIds } });
    
    for (const parent of parents) {
      const notification = new Notification({
        userId: parent._id,
        userType: 'parent',
        parentId: parent._id,
        tripId: tripId,
        message: `The bus is delayed by approximately ${estimatedDelayMinutes} minutes due to ${reason}.`,
        title: `⏰ Bus Delay: ${trip.routeName}`,
        type: 'delay_report',
        status: 'sent',
        isRead: false,
        metadata: {
          reason,
          estimatedDelayMinutes,
          reportedAt: new Date()
        }
      });
      await notification.save();
      
      // Check user notification settings
      const emailEnabled = await shouldSendNotification(parent._id, 'delay', 'email');
      const settings = await NotificationSetting.findOne({ userId: parent._id });
      const isQuiet = isQuietHour(settings);
      
      // Send EMAIL to parents if enabled and not quiet hour
      if (emailEnabled && !isQuiet && parent.email) {
        await emailService.sendParentNotification(parent, 'delay', {
          studentName: 'Your child',
          minutes: estimatedDelayMinutes,
          reason: reason
        });
      }
    }
    
    // Update trip with delay info
    trip.delayInfo = {
      isDelayed: true,
      reason,
      estimatedDelayMinutes,
      reportedAt: new Date(),
      estimatedArrivalTime: new Date(Date.now() + estimatedDelayMinutes * 60000)
    };
    await trip.save();
    
    res.json({ 
      success: true, 
      message: `Delay reported to ${adminNotifications} admins and ${parents.length} parents`, 
      data: trip.delayInfo 
    });
  } catch (error) {
    console.error('Error reporting delay:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ROUTE OPTIMIZATION & NAVIGATION ====================

router.get('/trips/:tripId/optimized-route', async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId).populate('students', 'firstName lastName admissionNumber transportDetails');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    const attendance = await Attendance.find({ tripId: tripId, eventType: 'board' });
    const boardedStudentIds = new Set(attendance.map(a => a.studentId.toString()));
    
    const pendingStudents = (trip.students || []).filter(s => !boardedStudentIds.has(s._id.toString()));
    
    if (pendingStudents.length === 0) {
      return res.json({ success: true, message: 'All students have boarded', data: { students: [], waypoints: [], totalRemaining: 0 } });
    }
    
    const lastGPS = await GPSLog.findOne({ tripId }).sort({ timestamp: -1 });
    const currentLocation = lastGPS ? { lat: lastGPS.lat, lng: lastGPS.lon } : null;
    
    const waypoints = pendingStudents
      .filter(s => s.transportDetails?.pickupPoint?.coordinates?.lat)
      .map(s => ({
        studentId: s._id,
        name: `${s.firstName} ${s.lastName}`,
        location: {
          lat: s.transportDetails.pickupPoint.coordinates.lat,
          lng: s.transportDetails.pickupPoint.coordinates.lng
        }
      }));
    
    if (currentLocation && waypoints.length > 0) {
      waypoints.sort((a, b) => getDistance(currentLocation, a.location) - getDistance(currentLocation, b.location));
    }
    
    res.json({
      success: true,
      data: { students: pendingStudents, waypoints, currentLocation, totalRemaining: pendingStudents.length }
    });
  } catch (error) {
    console.error('Error getting optimized route:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/trips/:tripId/next-student', async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId).populate('students', 'firstName lastName admissionNumber transportDetails');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    const boardedRecords = await Attendance.find({ tripId: tripId, eventType: 'board' });
    const boardedIds = new Set(boardedRecords.map(a => a.studentId.toString()));
    
    const nextStudent = (trip.students || []).find(s => !boardedIds.has(s._id.toString()));
    if (!nextStudent) return res.json({ success: true, message: 'All students have boarded', data: null });
    
    const lastGPS = await GPSLog.findOne({ tripId }).sort({ timestamp: -1 });
    
    res.json({
      success: true,
      data: {
        student: {
          _id: nextStudent._id,
          firstName: nextStudent.firstName,
          lastName: nextStudent.lastName,
          admissionNumber: nextStudent.admissionNumber,
          pickupPoint: nextStudent.transportDetails?.pickupPoint?.name,
          coordinates: nextStudent.transportDetails?.pickupPoint?.coordinates
        },
        currentLocation: lastGPS ? { lat: lastGPS.lat, lng: lastGPS.lon } : null
      }
    });
  } catch (error) {
    console.error('Error getting next student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/students/:studentId/pickup-location', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { lat, lng, address } = req.body;
    
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    
    if (!student.transportDetails) student.transportDetails = {};
    if (!student.transportDetails.pickupPoint) student.transportDetails.pickupPoint = {};
    
    student.transportDetails.pickupPoint.coordinates = { lat, lng };
    if (address) student.transportDetails.pickupPoint.name = address;
    await student.save();
    
    res.json({ success: true, message: 'Pickup location updated', data: { pickupPoint: student.transportDetails.pickupPoint } });
  } catch (error) {
    console.error('Error updating pickup location:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TRIP ACTIONS ====================

router.post('/trips/:tripId/start', async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.tripId, driverId: req.user.id, status: 'scheduled' },
      { status: 'in-progress', startTime: new Date() },
      { new: true }
    );
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found or already started' });
    
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) await Bus.findByIdAndUpdate(bus._id, { status: 'on-trip' });
    }
    
    // Notify all parents that trip has started
    await notifyAllParents(trip._id, 'trip_start');
    
    res.json({ success: true, message: 'Trip started successfully', data: trip });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/trips/:tripId/end', async (req, res) => {
  try {
    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.tripId, driverId: req.user.id, status: 'in-progress' },
      { status: 'completed', endTime: new Date() },
      { new: true }
    );
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found or not in progress' });
    
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) await Bus.findByIdAndUpdate(bus._id, { status: 'active' });
    }
    
    // Notify all parents that trip has ended
    await notifyAllParents(trip._id, 'trip_end');
    
    res.json({ success: true, message: 'Trip ended successfully', data: trip });
  } catch (error) {
    console.error('Error ending trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ATTENDANCE MANAGEMENT ====================

router.post('/trips/:tripId/board/:studentIdentifier', async (req, res) => {
  try {
    const { tripId, studentIdentifier } = req.params;
    const { method = 'qr', location } = req.body;
    
    let studentId = studentIdentifier;
    if (studentIdentifier.startsWith('STU-')) {
      const student = await Student.findOne({ qrCode: studentIdentifier });
      if (!student) return res.status(404).json({ success: false, message: 'Student not found for this QR code' });
      studentId = student._id;
    }
    
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    const isStudentAssigned = trip.students && trip.students.some(s => s.toString() === studentId.toString());
    if (!isStudentAssigned) return res.status(400).json({ success: false, message: 'Student not assigned to this trip' });
    
    const existing = await Attendance.findOne({ studentId: studentId, tripId, eventType: 'board' });
    if (existing) return res.status(409).json({ success: false, message: 'Student already boarded for this trip' });
    
    const attendance = new Attendance({
      studentId: studentId,
      tripId,
      eventType: 'board',
      scannerId: req.user.id,
      gpsSnapshot: location ? { lat: location.lat, lon: location.lng } : null
    });
    await attendance.save();
    
    // Notify parent that student boarded
    await notifyParent(studentId, tripId, 'board');
    
    res.json({ success: true, message: 'Student boarded successfully', data: attendance });
  } catch (error) {
    console.error('Error boarding student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/trips/:tripId/alight/:studentIdentifier', async (req, res) => {
  try {
    const { tripId, studentIdentifier } = req.params;
    const { method = 'qr', location } = req.body;
    
    let studentId = studentIdentifier;
    if (studentIdentifier.startsWith('STU-')) {
      const student = await Student.findOne({ qrCode: studentIdentifier });
      if (!student) return res.status(404).json({ success: false, message: 'Student not found for this QR code' });
      studentId = student._id;
    }
    
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    const isStudentAssigned = trip.students && trip.students.some(s => s.toString() === studentId.toString());
    if (!isStudentAssigned) return res.status(400).json({ success: false, message: 'Student not assigned to this trip' });
    
    const boardingRecord = await Attendance.findOne({ studentId: studentId, tripId, eventType: 'board' });
    if (!boardingRecord) return res.status(404).json({ success: false, message: 'No boarding record found. Student must board first.' });
    
    const existingAlight = await Attendance.findOne({ studentId: studentId, tripId, eventType: 'alight' });
    if (existingAlight) return res.status(409).json({ success: false, message: 'Student already alighted for this trip' });
    
    const attendance = new Attendance({
      studentId: studentId,
      tripId,
      eventType: 'alight',
      scannerId: req.user.id,
      gpsSnapshot: location ? { lat: location.lat, lon: location.lng } : null
    });
    await attendance.save();
    
    // Notify parent that student alighted
    await notifyParent(studentId, tripId, 'alight');
    
    res.json({ success: true, message: 'Student alighted successfully', data: attendance });
  } catch (error) {
    console.error('Error alighting student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== GPS & LOCATION ====================

router.post('/gps/update', async (req, res) => {
  try {
    const { tripId, lat, lon, speed, heading, fuelLevel } = req.body;
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    const gpsLog = new GPSLog({
      vehicleId: trip.vehicleId || 'unknown-vehicle',
      tripId,
      lat,
      lon,
      speed: speed || 0,
      heading: heading || 0,
      fuelLevel,
      timestamp: new Date(),
    });
    await gpsLog.save();
    
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, {
          'currentLocation.lat': lat,
          'currentLocation.lng': lon,
          'currentLocation.speed': speed || 0,
          'currentLocation.heading': heading || 0,
          'currentLocation.lastUpdated': new Date(),
          lastUpdate: new Date(),
          ...(fuelLevel && { fuelLevel })
        });
      }
    }
    
    await Trip.findByIdAndUpdate(tripId, { lastLocation: { lat, lon, timestamp: new Date() } });
    res.json({ success: true, message: 'GPS updated successfully' });
  } catch (error) {
    console.error('Error updating GPS:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== INCIDENTS & EMERGENCY ====================

router.post('/incident/report', async (req, res) => {
  try {
    const { tripId, type, description, photos, location } = req.body;
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    const lastGPS = await GPSLog.findOne({ tripId }).sort({ timestamp: -1 });
    
    const report = new IncidentReport({
      tripId,
      type,
      description,
      reportedBy: req.user.id,
      location: location || (lastGPS ? { lat: lastGPS.lat, lng: lastGPS.lon } : null),
      media: photos?.map(url => ({ url, type: 'image' })) || [],
      severity: type === 'emergency' ? 'critical' : 'medium',
      status: 'reported'
    });
    await report.save();
    
    if (type === 'emergency') {
      const parentIds = [...new Set(trip.students.map(s => s.parentId).filter(Boolean))];
      const parents = await User.find({ _id: { $in: parentIds } });
      for (const parent of parents) {
        const notification = new Notification({
          userId: parent._id,
          userType: 'parent',
          parentId: parent._id,
          tripId: tripId,
          message: description || 'Emergency situation reported. Please check app for updates.',
          title: `🚨 EMERGENCY - ${trip.routeName}`,
          type: 'alert',
          status: 'sent',
          isRead: false,
          metadata: {
            incidentId: report._id,
            timestamp: new Date()
          }
        });
        await notification.save();
        
        // Emergency always sends email (bypass quiet hours)
        if (parent.email) {
          await emailService.sendParentNotification(parent, 'emergency', {
            busNumber: trip.vehicleId,
            location: location || (lastGPS ? `${lastGPS.lat}, ${lastGPS.lon}` : 'Unknown'),
            description: description || 'Emergency situation'
          });
        }
        
        // Send Push
        if (parent.fcmToken) {
          await sendPushNotification(parent.fcmToken, {
            title: `🚨 EMERGENCY - ${trip.routeName}`,
            body: description || 'Emergency situation reported. Please check app for updates.',
            data: { type: 'emergency', tripId, incidentId: report._id }
          });
        }
      }
    }
    
    res.json({ success: true, message: 'Incident reported successfully', data: report });
  } catch (error) {
    console.error('Error reporting incident:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/emergency', async (req, res) => {
  try {
    const { tripId, location } = req.body;
    const trip = await Trip.findOne({ _id: tripId, driverId: req.user.id });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    
    const report = new IncidentReport({
      tripId,
      type: 'emergency',
      description: 'SOS EMERGENCY - Driver activated emergency alert',
      reportedBy: req.user.id,
      location,
      severity: 'critical',
      status: 'reported'
    });
    await report.save();
    
    // Notify all parents of emergency (bypass quiet hours)
    const parentIds = [...new Set(trip.students.map(s => s.parentId).filter(Boolean))];
    const parents = await User.find({ _id: { $in: parentIds } });
    for (const parent of parents) {
      const notification = new Notification({
        userId: parent._id,
        userType: 'parent',
        parentId: parent._id,
        tripId: tripId,
        message: 'Emergency situation reported. Please check app for updates.',
        title: `🚨 EMERGENCY - ${trip.routeName}`,
        type: 'alert',
        status: 'sent',
        isRead: false,
        metadata: {
          incidentId: report._id,
          timestamp: new Date()
        }
      });
      await notification.save();
      
      // Send EMAIL (bypass quiet hours for emergency)
      if (parent.email) {
        await emailService.sendParentNotification(parent, 'emergency', {
          busNumber: trip.vehicleId,
          location: location || 'Unknown',
          description: 'SOS EMERGENCY activated'
        });
      }
      
      // Send Push
      if (parent.fcmToken) {
        await sendPushNotification(parent.fcmToken, {
          title: `🚨 EMERGENCY - ${trip.routeName}`,
          body: 'Emergency situation reported. Please check app for updates.',
          data: { type: 'emergency', tripId, incidentId: report._id }
        });
      }
    }
    
    res.json({ success: true, message: 'Emergency alert sent' });
  } catch (error) {
    console.error('Error sending emergency:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DRIVER HISTORY ====================

router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const trips = await Trip.find({ driverId: req.user.id, status: 'completed' })
      .sort({ endTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Trip.countDocuments({ driverId: req.user.id, status: 'completed' });
    
    res.json({
      success: true,
      data: trips.map(trip => ({ ...trip.toObject(), busNumber: trip.vehicleId || 'Not Assigned' })),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Error fetching driver history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ROUTE COORDINATES ====================

router.get('/route/:routeId/coordinates', async (req, res) => {
  try {
    const mockCoordinates = [
      { latitude: -1.2864, longitude: 36.8172 },
      { latitude: -1.2964, longitude: 36.8272 },
      { latitude: -1.3064, longitude: 36.8372 },
      { latitude: -1.3164, longitude: 36.8472 },
      { latitude: -1.3264, longitude: 36.8572 },
    ];
    res.json({ success: true, data: mockCoordinates });
  } catch (error) {
    console.error('Error fetching route coordinates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== ATTENDANCE SYNC ====================

router.post('/attendance/sync-offline', async (req, res) => {
  try {
    const { scans, deviceId } = req.body;
    if (!Array.isArray(scans) || scans.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid scans array' });
    }
    
    const results = [];
    const syncBatch = Date.now().toString();
    
    for (const scan of scans) {
      try {
        const { studentId, tripId, method, timestamp, location, type } = scan;
        const existing = await Attendance.findOne({ studentId, tripId, eventType: type, createdAt: timestamp });
        
        if (existing) {
          results.push({ success: true, studentId, status: 'duplicate' });
          continue;
        }
        
        const attendance = new Attendance({
          studentId, tripId, createdAt: timestamp || new Date(), eventType: type,
          method: method || 'qr',
          location: location ? { type: 'Point', coordinates: [location.lng, location.lat] } : null,
          metadata: { deviceId, syncedFromOffline: true, syncBatch }
        });
        await attendance.save();
        results.push({ success: true, studentId, status: 'synced' });
      } catch (error) {
        results.push({ success: false, studentId: scan.studentId, error: error.message });
      }
    }
    
    res.json({
      success: true,
      batch: syncBatch,
      summary: { total: scans.length, synced: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length },
      results
    });
  } catch (error) {
    console.error('Offline sync error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;