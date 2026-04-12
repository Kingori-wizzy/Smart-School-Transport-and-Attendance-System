const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const User = require('../models/User');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin, isAdminOrDriver } = require('../middleware/authMiddleware');
const smsProvider = require('../services/smsProvider');

// Helper: Create in-app notification
async function createNotification(userId, title, message, type, relatedId = null, relatedModel = null) {
  try {
    const notification = new Notification({
      recipientId: userId,
      recipientType: 'parent',
      title,
      message,
      type,
      relatedId,
      relatedModel,
      createdAt: new Date()
    });
    await notification.save();
    
    // Emit socket event if available
    if (global.io) {
      global.io.to(`user-${userId}`).emit('new-notification', notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Helper: Send SMS via TextBee
async function sendParentSMS(phoneNumber, message, studentName) {
  if (!phoneNumber) {
    console.log(`No phone number for ${studentName}, SMS skipped`);
    return false;
  }
  
  try {
    const result = await smsProvider.sendSMS(phoneNumber, message);
    if (result.success) {
      console.log(`SMS sent to ${phoneNumber} for ${studentName} via ${result.provider}`);
      return true;
    } else {
      console.error(`SMS failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('SMS error:', error.message);
    return false;
  }
}

// Helper: Emit socket event for real-time parent notification
async function emitSocketEvent(parentId, eventType, data) {
  if (global.io) {
    global.io.to(`user-${parentId}`).emit(eventType, data);
    console.log(`Socket event ${eventType} emitted to user ${parentId}`);
  }
}

// Helper: Get parent and send notifications (SMS + In-app + Socket)
async function notifyParent(student, trip, eventType, additionalData = {}) {
  if (!student || !student.parentId) {
    console.log(`No parent found for student ${student._id}`);
    return false;
  }
  
  const parent = await User.findById(student.parentId);
  if (!parent) {
    console.log(`Parent user not found for student ${student._id}`);
    return false;
  }
  
  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim();
  const busNumber = trip.vehicleId || 'School Bus';
  const time = new Date().toLocaleTimeString();
  const date = new Date().toLocaleDateString();
  
  let title = '';
  let message = '';
  let smsMessage = '';
  let notificationType = '';
  let socketEventType = '';
  
  switch(eventType) {
    case 'boarded':
      title = 'Student Boarded';
      message = `${studentName} has boarded the ${busNumber} at ${additionalData.pickupPoint || 'pickup point'} at ${time}.`;
      smsMessage = `Smart School: ${studentName} has BOARDED the ${busNumber} at ${additionalData.pickupPoint || 'pickup point'} at ${time}. Your child is on the way to school.`;
      notificationType = 'boarding_alert';
      socketEventType = 'student-boarded';
      break;
    case 'alighted':
      title = 'Student Dropped Off';
      message = `${studentName} has been dropped off at ${additionalData.dropoffPoint || 'dropoff point'} at ${time}.`;
      smsMessage = `Smart School: ${studentName} has been DROPPED OFF at ${additionalData.dropoffPoint || 'dropoff point'} at ${time}. Your child has arrived safely.`;
      notificationType = 'alighting_alert';
      socketEventType = 'student-alighted';
      break;
    case 'trip_start':
      title = 'Trip Started';
      message = `Trip ${trip.routeName || trip._id} has started. ${studentName} is on the way to school.`;
      smsMessage = `Smart School: Trip ${trip.routeName || 'bus'} has STARTED. ${studentName} is on the way to school.`;
      notificationType = 'trip_start';
      socketEventType = 'trip-started';
      break;
    case 'trip_complete':
      title = 'Trip Completed';
      message = `Trip ${trip.routeName || trip._id} has been completed. ${studentName} has arrived safely.`;
      smsMessage = `Smart School: Trip ${trip.routeName || 'bus'} has COMPLETED. ${studentName} has arrived safely at ${time}. Thank you for using Smart School Transport.`;
      notificationType = 'trip_complete';
      socketEventType = 'trip-completed';
      break;
    case 'trip_cancelled':
      title = 'Trip Cancelled';
      message = `Trip ${trip.routeName || trip._id} scheduled for ${date} has been CANCELLED.`;
      smsMessage = `Smart School: Trip ${trip.routeName || 'bus'} scheduled for ${date} has been CANCELLED. Please make alternative arrangements.`;
      notificationType = 'trip_cancelled';
      socketEventType = 'trip-cancelled';
      break;
    default:
      return false;
  }
  
  // Create in-app notification
  await createNotification(parent._id, title, message, notificationType, trip._id, 'Trip');
  
  // Emit real-time socket event
  await emitSocketEvent(parent._id, socketEventType, {
    studentId: student._id,
    studentName: studentName,
    busNumber: busNumber,
    tripId: trip._id,
    routeName: trip.routeName,
    timestamp: new Date().toISOString(),
    location: additionalData.pickupPoint || additionalData.dropoffPoint || null,
    smsSent: false
  });
  
  // Send SMS via TextBee
  if (parent.phone && process.env.SMS_ENABLED === 'true') {
    const smsResult = await sendParentSMS(parent.phone, smsMessage, studentName);
    // Update socket event to indicate SMS was sent
    if (smsResult && global.io) {
      global.io.to(`user-${parent._id}`).emit(`${socketEventType}-sms`, {
        sent: true,
        timestamp: new Date().toISOString()
      });
    }
  } else if (parent.phone) {
    console.log(`SMS disabled, would send to ${parent.phone}: ${smsMessage}`);
  } else {
    console.log(`No phone for parent of ${studentName}`);
  }
  
  return true;
}

// All routes require authentication
router.use(authMiddleware);

// ==================== TRIP-BUS ASSIGNMENT ENDPOINTS ====================

router.get('/:tripId/bus', isAdminOrDriver, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const bus = await Bus.findOne({ busNumber: trip.vehicleId });
    res.json({
      success: true,
      data: {
        tripId: trip._id,
        tripName: trip.routeName,
        assignedBus: bus || null,
        busNumber: trip.vehicleId || null,
        hasBus: !!trip.vehicleId,
        studentsCount: trip.students ? trip.students.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching trip bus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:tripId/assign-bus/:busId', isAdmin, async (req, res) => {
  try {
    const { tripId, busId } = req.params;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    if (bus.status === 'maintenance') {
      return res.status(400).json({ success: false, message: 'Cannot assign bus in maintenance mode' });
    }
    const existingAssignment = await Trip.findOne({
      _id: { $ne: tripId },
      vehicleId: bus.busNumber,
      status: { $in: ['scheduled', 'running'] }
    });
    if (existingAssignment) {
      return res.status(409).json({ success: false, message: `Bus ${bus.busNumber} is already assigned to another active trip` });
    }
    const students = await Student.find({ 
      $or: [{ 'transportDetails.busId': bus._id }, { busId: bus._id }],
      usesTransport: true,
      isActive: true
    });
    const studentIds = students.map(s => s._id);
    trip.vehicleId = bus.busNumber;
    trip.students = studentIds;
    trip.attendance = [];
    await trip.save();
    console.log(`Bus ${bus.busNumber} assigned to trip ${trip.routeName} with ${studentIds.length} students`);
    const updatedTrip = await Trip.findById(tripId)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber qrCode');
    res.json({
      success: true,
      message: `Bus ${bus.busNumber} assigned to trip with ${studentIds.length} students`,
      data: updatedTrip
    });
  } catch (error) {
    console.error('Error assigning bus to trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:tripId/unassign-bus', isAdmin, async (req, res) => {
  try {
    const { tripId } = req.params;
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const oldBusNumber = trip.vehicleId;
    trip.vehicleId = '';
    trip.students = [];
    trip.attendance = [];
    await trip.save();
    console.log(`Bus unassigned from trip ${trip.routeName} (was ${oldBusNumber})`);
    res.json({ success: true, message: 'Bus unassigned from trip successfully', data: trip });
  } catch (error) {
    console.error('Error unassigning bus from trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/unassigned/list', isAdmin, async (req, res) => {
  try {
    const trips = await Trip.find({
      $or: [{ vehicleId: { $exists: false } }, { vehicleId: null }, { vehicleId: '' }]
    }).select('routeName scheduledStartTime status');
    res.json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    console.error('Error fetching unassigned trips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/available-buses/list', isAdmin, async (req, res) => {
  try {
    const buses = await Bus.find({ status: { $ne: 'maintenance' }, isActive: { $ne: false } });
    const assignedBusNumbers = await Trip.distinct('vehicleId', {
      status: { $in: ['scheduled', 'running'] },
      vehicleId: { $exists: true, $ne: '' }
    });
    const availableBuses = buses.filter(bus => !assignedBusNumbers.includes(bus.busNumber));
    res.json({ success: true, count: availableBuses.length, data: availableBuses });
  } catch (error) {
    console.error('Error fetching available buses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/bulk-assign', isAdmin, async (req, res) => {
  try {
    const { assignments } = req.body;
    if (!Array.isArray(assignments)) {
      return res.status(400).json({ success: false, message: 'Assignments must be an array' });
    }
    const results = { successful: [], failed: [] };
    for (const item of assignments) {
      try {
        const { tripId, busId } = item;
        const trip = await Trip.findById(tripId);
        if (!trip) { results.failed.push({ tripId, busId, reason: 'Trip not found' }); continue; }
        const bus = await Bus.findById(busId);
        if (!bus) { results.failed.push({ tripId, busId, reason: 'Bus not found' }); continue; }
        const students = await Student.find({ 
          $or: [{ 'transportDetails.busId': bus._id }, { busId: bus._id }],
          usesTransport: true
        });
        trip.vehicleId = bus.busNumber;
        trip.students = students.map(s => s._id);
        trip.attendance = [];
        await trip.save();
        results.successful.push({ tripId, tripName: trip.routeName, busId, busNumber: bus.busNumber, studentsCount: students.length });
      } catch (error) {
        results.failed.push({ tripId: item.tripId, busId: item.busId, reason: error.message });
      }
    }
    res.json({ success: true, message: `Bulk assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`, results });
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== STUDENT ATTENDANCE WITH PARENT NOTIFICATIONS ====================

/**
 * @route   PATCH /api/trips/:tripId/students/:studentId/board
 * @desc    Mark student as boarded and notify parent via TextBee SMS + Socket
 */
router.patch('/:tripId/students/:studentId/board', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { boardingTime, pickupPoint, location } = req.body;

    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Only drivers can mark attendance' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    if (trip.status !== 'running') {
      return res.status(400).json({ success: false, message: 'Trip must be running to mark attendance' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!trip.students.some(s => s.toString() === studentId)) {
      return res.status(400).json({ success: false, message: 'Student not assigned to this trip' });
    }

    const existingAttendance = trip.attendance.find(a => a.studentId.toString() === studentId && a.type === 'board');
    if (existingAttendance) {
      return res.status(400).json({ success: false, message: 'Student already marked as boarded' });
    }

    trip.attendance.push({
      studentId,
      scannedAt: boardingTime || new Date(),
      type: 'board',
      scannedBy: req.user.id,
      location: location || null,
      pickupPoint: pickupPoint || student.pickupPoint || 'School'
    });
    await trip.save();

    // Send SMS, in-app notification, and socket event
    await notifyParent(student, trip, 'boarded', { pickupPoint: pickupPoint || student.pickupPoint });

    console.log(`Student ${student.firstName} ${student.lastName} BOARDED trip ${trip.routeName}`);

    res.json({
      success: true,
      message: 'Student marked as boarded successfully. Parent notified via SMS and push notification.',
      data: {
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        boardingTime: boardingTime || new Date(),
        eventType: 'boarded',
        parentNotified: true
      }
    });
  } catch (error) {
    console.error('Error marking student as boarded:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PATCH /api/trips/:tripId/students/:studentId/alight
 * @desc    Mark student as alighted and notify parent via TextBee SMS + Socket
 */
router.patch('/:tripId/students/:studentId/alight', async (req, res) => {
  try {
    const { tripId, studentId } = req.params;
    const { alightingTime, dropoffPoint, location } = req.body;

    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Only drivers can mark attendance' });
    }

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const boardRecord = trip.attendance.find(a => a.studentId.toString() === studentId && a.type === 'board');
    if (!boardRecord) {
      return res.status(400).json({ success: false, message: 'Student must be marked as boarded first' });
    }

    const existingAlight = trip.attendance.find(a => a.studentId.toString() === studentId && a.type === 'alight');
    if (existingAlight) {
      return res.status(400).json({ success: false, message: 'Student already marked as alighted' });
    }

    trip.attendance.push({
      studentId,
      scannedAt: alightingTime || new Date(),
      type: 'alight',
      scannedBy: req.user.id,
      location: location || null,
      dropoffPoint: dropoffPoint || student.dropoffPoint || 'Home'
    });
    await trip.save();

    // Send SMS, in-app notification, and socket event
    await notifyParent(student, trip, 'alighted', { dropoffPoint: dropoffPoint || student.dropoffPoint });

    console.log(`Student ${student.firstName} ${student.lastName} ALIGHTED from trip ${trip.routeName}`);

    res.json({
      success: true,
      message: 'Student marked as alighted successfully. Parent notified via SMS and push notification.',
      data: {
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        alightingTime: alightingTime || new Date(),
        eventType: 'alighted',
        parentNotified: true
      }
    });
  } catch (error) {
    console.error('Error marking student as alighted:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DRIVER APP ENDPOINTS ====================

router.get('/current', async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Access denied. Driver only.' });
    }
    const currentTrip = await Trip.findOne({
      driverId: req.user.id,
      status: { $in: ['scheduled', 'running'] }
    }).populate('students', 'firstName lastName admissionNumber qrCode');
    if (!currentTrip) {
      return res.json({ success: true, data: null, message: 'No active trip found' });
    }
    const tripData = {
      _id: currentTrip._id,
      routeName: currentTrip.routeName,
      vehicleId: currentTrip.vehicleId,
      status: currentTrip.status,
      startTime: currentTrip.startTime,
      scheduledStartTime: currentTrip.scheduledStartTime,
      studentCount: currentTrip.students?.length || 0,
      students: currentTrip.students || []
    };
    res.json({ success: true, data: tripData });
  } catch (error) {
    console.error('Error fetching current trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/driver/today', async (req, res) => {
  try {
    const driverId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const trips = await Trip.find({
      driverId: driverId,
      scheduledStartTime: { $gte: today, $lt: tomorrow }
    })
    .populate('students', 'firstName lastName admissionNumber qrCode classLevel')
    .populate('driverId', 'firstName lastName email phone')
    .sort({ scheduledStartTime: 1 });
    const tripsWithDetails = await Promise.all(trips.map(async (trip) => {
      const tripObj = trip.toObject();
      if (trip.vehicleId) {
        const bus = await Bus.findOne({ busNumber: trip.vehicleId });
        if (bus) {
          tripObj.busDetails = {
            busNumber: bus.busNumber,
            driverName: bus.driverName,
            capacity: bus.capacity,
            currentLocation: bus.currentLocation,
            fuelLevel: bus.fuelLevel
          };
        }
      }
      tripObj.statistics = {
        totalStudents: trip.students ? trip.students.length : 0,
        boardedCount: trip.attendance ? trip.attendance.filter(a => a.type === 'board').length : 0,
        alightedCount: trip.attendance ? trip.attendance.filter(a => a.type === 'alight').length : 0
      };
      return tripObj;
    }));
    res.json({ success: true, count: trips.length, data: tripsWithDetails });
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/with-students', isAdminOrDriver, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('students', 'firstName lastName admissionNumber qrCode classLevel parentId')
      .populate('driverId', 'firstName lastName email phone')
      .populate('attendance.studentId', 'firstName lastName admissionNumber');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const bus = await Bus.findOne({ busNumber: trip.vehicleId });
    const result = trip.toObject();
    if (bus) {
      result.busDetails = {
        busNumber: bus.busNumber,
        driverName: bus.driverName,
        capacity: bus.capacity
      };
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching trip with students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/:id/record-attendance', async (req, res) => {
  try {
    const { studentId, type, location } = req.body;
    const tripId = req.params.id;
    if (!studentId || !type) {
      return res.status(400).json({ success: false, message: 'Student ID and attendance type are required' });
    }
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (!trip.students.some(s => s.toString() === studentId)) {
      return res.status(400).json({ success: false, message: 'Student not assigned to this trip' });
    }
    const existingAttendance = trip.attendance.find(a => a.studentId.toString() === studentId && a.type === type);
    if (existingAttendance) {
      return res.status(400).json({ success: false, message: `Student already marked as ${type === 'board' ? 'boarded' : 'alighted'}` });
    }
    const student = await Student.findById(studentId);
    trip.attendance.push({
      studentId,
      scannedAt: new Date(),
      type,
      scannedBy: req.user.id,
      location: location || null
    });
    await trip.save();
    
    // Send notification based on type
    if (type === 'board') {
      await notifyParent(student, trip, 'boarded', { pickupPoint: student.pickupPoint || 'School' });
    } else if (type === 'alight') {
      await notifyParent(student, trip, 'alighted', { dropoffPoint: student.dropoffPoint || 'Home' });
    }
    
    res.json({
      success: true,
      message: `Student ${type === 'board' ? 'boarded' : 'alighted'} successfully. Parent notified.`,
      data: { studentId, type, scannedAt: new Date(), tripStatus: trip.status, parentNotified: true }
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== MAIN TRIP ENDPOINTS ====================

router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber')
      .sort({ createdAt: -1 });
    const transformedTrips = trips.map(trip => ({
      ...trip.toObject(),
      busNumber: trip.vehicleId,
      studentsCount: trip.students ? trip.students.length : 0
    }));
    res.json({ success: true, count: trips.length, data: transformedTrips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    const trips = await Trip.find({ status: { $in: ['scheduled', 'running'] } })
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber')
      .sort({ scheduledStartTime: 1 });
    const transformedTrips = trips.map(trip => ({
      ...trip.toObject(),
      busNumber: trip.vehicleId,
      studentsCount: trip.students ? trip.students.length : 0
    }));
    res.json({ success: true, count: trips.length, data: transformedTrips });
  } catch (error) {
    console.error('Error fetching active trips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber qrCode classLevel')
      .populate('attendance.studentId', 'firstName lastName admissionNumber');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    const transformedTrip = {
      ...trip.toObject(),
      busNumber: trip.vehicleId,
      studentsCount: trip.students ? trip.students.length : 0
    };
    res.json({ success: true, data: transformedTrip });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', isAdmin, async (req, res) => {
  try {
    const { routeName, vehicleId, driverId, tripType, scheduledStartTime, scheduledEndTime, status } = req.body;
    let studentIds = [];
    if (vehicleId) {
      const bus = await Bus.findOne({ busNumber: vehicleId });
      if (bus) {
        const students = await Student.find({ 
          $or: [{ 'transportDetails.busId': bus._id }, { busId: bus._id }],
          usesTransport: true,
          isActive: true
        });
        studentIds = students.map(s => s._id);
      }
    }
    const tripData = {
      routeName, vehicleId: vehicleId || '', driverId, tripType: tripType || 'morning',
      scheduledStartTime: scheduledStartTime || new Date(), scheduledEndTime: scheduledEndTime || null,
      status: status || 'scheduled', students: studentIds, attendance: []
    };
    if (!tripData.routeName) {
      return res.status(400).json({ success: false, message: 'Route name is required' });
    }
    if (!tripData.driverId) {
      return res.status(400).json({ success: false, message: 'Driver is required' });
    }
    const trip = new Trip(tripData);
    const newTrip = await trip.save();
    const populatedTrip = await Trip.findById(newTrip._id)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber');
    res.status(201).json({
      success: true,
      data: { ...populatedTrip.toObject(), busNumber: populatedTrip.vehicleId, studentsCount: populatedTrip.students?.length || 0 },
      message: `Trip created successfully with status: ${tripData.status}`
    });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', isAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.vehicleId && updateData.vehicleId !== req.body.oldVehicleId) {
      const bus = await Bus.findOne({ busNumber: updateData.vehicleId });
      if (bus) {
        const students = await Student.find({ 
          $or: [{ 'transportDetails.busId': bus._id }, { busId: bus._id }],
          usesTransport: true
        });
        updateData.students = students.map(s => s._id);
        updateData.attendance = [];
      }
    }
    const trip = await Trip.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true })
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    res.json({ success: true, data: { ...trip.toObject(), busNumber: trip.vehicleId, studentsCount: trip.students?.length || 0 }, message: 'Trip updated successfully' });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PATCH /api/trips/:id/start
 * @desc    Start trip and notify all parents via TextBee SMS + Socket
 */
router.patch('/:id/start', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (req.user.role !== 'driver' && req.user.role !== 'admin') {
      const driverCheck = await Trip.findOne({ _id: trip._id, driverId: req.user.id });
      if (!driverCheck && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to start this trip' });
      }
    }
    if (trip.status === 'running') {
      return res.status(400).json({ success: false, message: 'Trip is already running' });
    }
    if (trip.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot start a completed trip' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot start a cancelled trip' });
    }
    if (!trip.vehicleId) {
      return res.status(400).json({ success: false, message: 'No bus assigned to this trip' });
    }
    trip.status = 'running';
    trip.startTime = new Date();
    await trip.save();
    const bus = await Bus.findOne({ busNumber: trip.vehicleId });
    if (bus) {
      await Bus.findByIdAndUpdate(bus._id, { status: 'on-trip', currentTripId: trip._id });
    }
    // Notify all parents about trip start via SMS and socket
    const students = await Student.find({ _id: { $in: trip.students } });
    let parentsNotified = 0;
    for (const student of students) {
      const notified = await notifyParent(student, trip, 'trip_start', {});
      if (notified) parentsNotified++;
    }
    console.log(`Trip started: ${trip.routeName}, notified ${parentsNotified} parents via SMS and push notification`);
    const populatedTrip = await Trip.findById(trip._id)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber');
    res.json({
      success: true,
      data: { ...populatedTrip.toObject(), busNumber: populatedTrip.vehicleId },
      message: `Trip started successfully. ${parentsNotified} parents notified via SMS and push notification.`
    });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PATCH /api/trips/:id/complete
 * @desc    Complete trip and notify all parents via TextBee SMS + Socket
 * @access  Private (Driver AND Admin)
 */
router.patch('/:id/complete', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    // Allow both driver and admin to complete trip
    if (req.user.role !== 'driver' && req.user.role !== 'admin') {
      const driverCheck = await Trip.findOne({ _id: trip._id, driverId: req.user.id });
      if (!driverCheck && req.user.role !== 'admin') {
        return res.status(403).json({ 
          success: false, 
          message: 'Only the assigned driver or admin can complete this trip' 
        });
      }
    }
    
    if (trip.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Trip is already completed' });
    }
    
    if (trip.status !== 'running') {
      return res.status(400).json({ 
        success: false, 
        message: `Only running trips can be completed. Current status: ${trip.status}` 
      });
    }
    
    trip.status = 'completed';
    trip.endTime = new Date();
    await trip.save();
    
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus) {
        await Bus.findByIdAndUpdate(bus._id, { status: 'active', currentTripId: null });
      }
    }
    
    // Notify all parents about trip completion via SMS and socket
    const students = await Student.find({ _id: { $in: trip.students } });
    let parentsNotified = 0;
    for (const student of students) {
      const notified = await notifyParent(student, trip, 'trip_complete', {});
      if (notified) parentsNotified++;
    }
    
    console.log(`Trip completed: ${trip.routeName} by ${req.user.role} ${req.user.id}, notified ${parentsNotified} parents via SMS and push notification`);
    
    const populatedTrip = await Trip.findById(trip._id)
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber');
    
    res.json({
      success: true,
      data: { ...populatedTrip.toObject(), busNumber: populatedTrip.vehicleId },
      message: `Trip completed successfully. ${parentsNotified} parents notified via SMS and push notification.`
    });
  } catch (error) {
    console.error('Error completing trip:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.patch('/:id/cancel', isAdmin, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (trip.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed trip' });
    }
    if (trip.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Trip is already cancelled' });
    }
    trip.status = 'cancelled';
    trip.endTime = new Date();
    await trip.save();
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus && bus.currentTripId?.toString() === trip._id.toString()) {
        await Bus.findByIdAndUpdate(bus._id, { status: 'active', currentTripId: null });
      }
    }
    // Notify parents about cancellation
    const students = await Student.find({ _id: { $in: trip.students } });
    for (const student of students) {
      await notifyParent(student, trip, 'trip_cancelled', {});
    }
    res.json({ success: true, data: trip, message: 'Trip cancelled successfully. Parents notified.' });
  } catch (error) {
    console.error('Error cancelling trip:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/bus/:busNumber', async (req, res) => {
  try {
    const trips = await Trip.find({ vehicleId: req.params.busNumber, status: { $in: ['scheduled', 'running'] } })
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber')
      .sort({ scheduledStartTime: -1 });
    res.json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    console.error('Error fetching bus trips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/driver/:driverId', async (req, res) => {
  try {
    const trips = await Trip.find({ driverId: req.params.driverId, scheduledStartTime: { $gte: new Date() } })
      .populate('students', 'firstName lastName admissionNumber')
      .sort({ scheduledStartTime: 1 });
    res.json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/today/all', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const trips = await Trip.find({ scheduledStartTime: { $gte: today, $lt: tomorrow } })
      .populate('driverId', 'firstName lastName email phone')
      .populate('students', 'firstName lastName admissionNumber')
      .sort({ scheduledStartTime: 1 });
    res.json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    console.error('Error fetching today\'s trips:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/stats/summary', isAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const stats = {
      totalTrips: await Trip.countDocuments(),
      runningTrips: await Trip.countDocuments({ status: 'running' }),
      scheduledTrips: await Trip.countDocuments({ status: 'scheduled' }),
      completedTrips: await Trip.countDocuments({ status: 'completed' }),
      cancelledTrips: await Trip.countDocuments({ status: 'cancelled' }),
      todayTrips: await Trip.countDocuments({ scheduledStartTime: { $gte: today } }),
      totalStudentsAssigned: (await Trip.aggregate([{ $unwind: '$students' }, { $group: { _id: null, count: { $sum: 1 } } }]))[0]?.count || 0,
      totalAttendanceRecords: (await Trip.aggregate([{ $unwind: '$attendance' }, { $group: { _id: null, count: { $sum: 1 } } }]))[0]?.count || 0
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching trip stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (trip.status === 'running') {
      return res.status(400).json({ success: false, message: 'Cannot delete a running trip. Cancel or complete it first.' });
    }
    if (trip.vehicleId) {
      const bus = await Bus.findOne({ busNumber: trip.vehicleId });
      if (bus && bus.currentTripId?.toString() === trip._id.toString()) {
        await Bus.findByIdAndUpdate(bus._id, { currentTripId: null, status: 'active' });
      }
    }
    await trip.deleteOne();
    res.json({ success: true, message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;