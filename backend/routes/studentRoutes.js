const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Bus = require('../models/Bus'); // Add Bus import for busNumber sync

// ✅ FIXED IMPORTS: Pulling everything from a single object as defined in your authMiddleware.js
const { 
  authMiddleware, 
  isAdmin, 
  isParent, 
  isAdminOrDriver 
} = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// ==================== PUBLIC/VERIFICATION ENDPOINTS ====================

/**
 * @route   POST /api/students/verify-admission
 * @desc    Verify admission number and link student to parent
 * @access  Private (Parents only)
 */
router.post('/verify-admission', isParent, async (req, res) => {
  try {
    const { admissionNumber, studentName } = req.body;
    const parentId = req.user.id;

    if (!admissionNumber) {
      return res.status(400).json({
        success: false,
        message: 'Admission number is required'
      });
    }

    console.log(`🔍 Verifying admission: ${admissionNumber} for parent: ${parentId}`);

    const student = await Student.findOne({ 
      admissionNumber: admissionNumber.toString().trim().toUpperCase()
    }).populate('transportDetails.busId', 'busNumber registrationNumber');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Invalid admission number. Please check and try again.'
      });
    }

    if (!student.usesTransport) {
      return res.status(400).json({
        success: false,
        message: 'This student is not registered for school transport. Please contact the school administration.'
      });
    }

    if (student.parentId) {
      if (student.parentId.toString() === parentId) {
        return res.status(200).json({
          success: true,
          message: 'Student already linked to your account',
          data: {
            studentId: student._id,
            name: `${student.firstName} ${student.lastName}`.trim(),
            firstName: student.firstName,
            lastName: student.lastName,
            class: student.classLevel,
            stream: student.stream,
            admissionNumber: student.admissionNumber,
            alreadyLinked: true
          }
        });
      }

      return res.status(409).json({
        success: false,
        message: 'This student is already linked to another parent. Please contact the school administration.'
      });
    }

    if (studentName) {
      const fullName = `${student.firstName} ${student.lastName}`.trim().toLowerCase();
      const providedName = studentName.trim().toLowerCase();
      
      if (fullName !== providedName && !fullName.includes(providedName) && !providedName.includes(fullName)) {
        return res.status(400).json({
          success: false,
          message: 'Name does not match admission number. Please check both and try again.'
        });
      }
    }

    if (!student.qrCode) {
      const timestamp = Date.now();
      student.qrCode = `STU-${student.admissionNumber}-${timestamp}`;
    }

    student.parentId = parentId;
    await student.save();

    console.log(`✅ Student ${student.admissionNumber} linked to parent ${parentId}`);

    res.json({
      success: true,
      message: 'Student successfully linked to your account',
      data: {
        studentId: student._id,
        name: `${student.firstName} ${student.lastName}`.trim(),
        firstName: student.firstName,
        lastName: student.lastName,
        class: student.classLevel,
        stream: student.stream,
        admissionNumber: student.admissionNumber,
        pickupPoint: student.transportDetails?.pickupPoint?.name || student.pickupPoint,
        dropoffPoint: student.transportDetails?.dropoffPoint?.name || student.dropOffPoint,
        busAssigned: !!(student.transportDetails?.busId || student.busId),
        busNumber: student.transportDetails?.busId?.busNumber || student.busNumber,
        qrCode: student.qrCode,
        alreadyLinked: false
      }
    });

  } catch (error) {
    console.error('❌ Error verifying admission:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while verifying admission number'
    });
  }
});

// ==================== TRIP ASSIGNMENT ENDPOINTS ====================

/**
 * @route   GET /api/students/:studentId/trips
 * @desc    Get all trips assigned to a student
 * @access  Private (Admin/Parent)
 */
router.get('/:studentId/trips', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findById(studentId)
      .populate('tripAssignments.tripId', 'routeName tripType scheduledStartTime scheduledEndTime vehicleId status');
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Check access
    if (req.user.role === 'parent' && student.parentId?.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const activeTrips = (student.tripAssignments || []).filter(t => t.status === 'active');
    
    res.json({
      success: true,
      count: activeTrips.length,
      data: activeTrips
    });
  } catch (error) {
    console.error('Error fetching student trips:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/students/:studentId/assign-trip
 * @desc    Assign a student to a trip
 * @access  Private (Admin only)
 */
router.post('/:studentId/assign-trip', isAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { tripId, tripType } = req.body;
    
    if (!tripId) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID is required'
      });
    }
    
    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Check if trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }
    
    // Check if already assigned
    const alreadyAssigned = student.tripAssignments?.some(
      a => a.tripId?.toString() === tripId && a.status === 'active'
    );
    
    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: 'Student already assigned to this trip'
      });
    }
    
    // Assign student to trip
    await Student.updateOne(
      { _id: studentId },
      {
        $push: {
          tripAssignments: {
            tripId: tripId,
            tripType: tripType || trip.tripType,
            status: 'active',
            assignedAt: new Date()
          }
        }
      }
    );
    
    // Also add student to trip's students array
    await Trip.updateOne(
      { _id: tripId },
      { $addToSet: { students: studentId } }
    );
    
    console.log(`✅ Student ${student.firstName} ${student.lastName} assigned to trip ${trip.routeName}`);
    
    res.json({
      success: true,
      message: 'Student assigned to trip successfully',
      data: {
        studentId,
        tripId,
        tripType: tripType || trip.tripType
      }
    });
    
  } catch (error) {
    console.error('Error assigning student to trip:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/students/:studentId/remove-trip/:tripId
 * @desc    Remove a student from a trip
 * @access  Private (Admin only)
 */
router.delete('/:studentId/remove-trip/:tripId', isAdmin, async (req, res) => {
  try {
    const { studentId, tripId } = req.params;
    
    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }
    
    // Update student - mark trip assignment as inactive
    await Student.updateOne(
      { _id: studentId, 'tripAssignments.tripId': tripId },
      { $set: { 'tripAssignments.$.status': 'inactive' } }
    );
    
    // Remove student from trip's students array
    await Trip.updateOne(
      { _id: tripId },
      { $pull: { students: studentId } }
    );
    
    console.log(`✅ Student removed from trip`);
    
    res.json({
      success: true,
      message: 'Student removed from trip successfully'
    });
    
  } catch (error) {
    console.error('Error removing student from trip:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/students/bulk-assign-trips
 * @desc    Bulk assign students to trips
 * @access  Private (Admin only)
 */
router.post('/bulk-assign-trips', isAdmin, async (req, res) => {
  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments)) {
      return res.status(400).json({
        success: false,
        message: 'Assignments must be an array'
      });
    }
    
    const results = {
      successful: [],
      failed: []
    };
    
    for (const item of assignments) {
      try {
        const { studentId, tripId, tripType } = item;
        
        const student = await Student.findById(studentId);
        if (!student) {
          results.failed.push({ studentId, tripId, reason: 'Student not found' });
          continue;
        }
        
        const trip = await Trip.findById(tripId);
        if (!trip) {
          results.failed.push({ studentId, tripId, reason: 'Trip not found' });
          continue;
        }
        
        // Check if already assigned
        const alreadyAssigned = student.tripAssignments?.some(
          a => a.tripId?.toString() === tripId && a.status === 'active'
        );
        
        if (alreadyAssigned) {
          results.failed.push({ studentId, tripId, reason: 'Already assigned' });
          continue;
        }
        
        // Assign student
        await Student.updateOne(
          { _id: studentId },
          {
            $push: {
              tripAssignments: {
                tripId: tripId,
                tripType: tripType || trip.tripType,
                status: 'active',
                assignedAt: new Date()
              }
            }
          }
        );
        
        await Trip.updateOne(
          { _id: tripId },
          { $addToSet: { students: studentId } }
        );
        
        results.successful.push({ studentId, tripId });
        
      } catch (error) {
        results.failed.push({ 
          studentId: item.studentId, 
          tripId: item.tripId, 
          reason: error.message 
        });
      }
    }
    
    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      results
    });
    
  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /api/students/unassigned-trips
 * @desc    Get students not assigned to a specific trip
 * @access  Private (Admin only)
 */
router.get('/unassigned-trips/list', isAdmin, async (req, res) => {
  try {
    const { tripId } = req.query;
    
    let query = { usesTransport: true, isActive: true };
    
    const students = await Student.find(query)
      .populate('transportDetails.busId', 'busNumber registrationNumber')
      .select('firstName lastName admissionNumber classLevel transportDetails tripAssignments busNumber');
    
    // Filter out students already assigned to the trip
    let unassignedStudents = students;
    if (tripId) {
      unassignedStudents = students.filter(student => {
        const assigned = student.tripAssignments?.some(
          a => a.tripId?.toString() === tripId && a.status === 'active'
        );
        return !assigned;
      });
    }
    
    res.json({
      success: true,
      count: unassignedStudents.length,
      data: unassignedStudents
    });
    
  } catch (error) {
    console.error('Error fetching unassigned students:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== BASIC CRUD OPERATIONS ====================

/**
 * @route   GET /api/students
 * @desc    Get all students with filtering and pagination
 * @access  Private (Admin only)
 */
router.get('/', isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      class: className, 
      stream, 
      usesTransport,
      transportStatus,
      search,
      simple
    } = req.query;

    const query = {};
    if (className) query.classLevel = className;
    if (stream) query.stream = stream;
    if (usesTransport !== undefined) query.usesTransport = usesTransport === 'true';
    if (transportStatus) query['transportDetails.status'] = transportStatus;
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { admissionNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let studentsQuery = Student.find(query);
    
    if (simple !== 'true') {
      studentsQuery = studentsQuery
        .populate('parentId', 'firstName lastName email phone')
        .populate('transportDetails.busId', 'busNumber registrationNumber');
    }
    
    const [students, total] = await Promise.all([
      studentsQuery
        .limit(parseInt(limit))
        .skip(skip)
        .sort('-createdAt'),
      Student.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: students.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: students
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/students/transport
 * @desc    Get all students using transport
 * @access  Private (Admin/Driver)
 */
router.get('/transport', isAdminOrDriver, async (req, res) => {
  try {
    const students = await Student.find({ 
      usesTransport: true,
      'transportDetails.status': 'active',
      isActive: true
    })
    .populate('parentId', 'firstName lastName phone')
    .populate('transportDetails.busId', 'busNumber')
    .select('firstName lastName classLevel admissionNumber transportDetails qrCode tripAssignments busNumber');

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Error fetching transport students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/students/unlinked
 * @desc    Get all students not linked to a parent
 * @access  Private (Admin only)
 */
router.get('/unlinked', isAdmin, async (req, res) => {
  try {
    const students = await Student.find({ 
      parentId: { $exists: false },
      usesTransport: true 
    })
    .select('firstName lastName admissionNumber classLevel transportDetails busNumber');

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Error fetching unlinked students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/students/by-bus/:busId
 * @desc    Get all students assigned to a specific bus
 * @access  Private (Admin/Driver)
 */
router.get('/by-bus/:busId', isAdminOrDriver, async (req, res) => {
  try {
    const { busId } = req.params;
    const students = await Student.find({
      $or: [{ 'transportDetails.busId': busId }, { busId: busId }],
      usesTransport: true,
      isActive: true
    })
    .populate('parentId', 'firstName lastName phone')
    .select('firstName lastName classLevel admissionNumber transportDetails qrCode tripAssignments busNumber');

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Error fetching students by bus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/students/by-bus-number/:busNumber
 * @desc    Get all students assigned to a specific bus by bus number (for driver app)
 * @access  Private (Admin/Driver)
 */
router.get('/by-bus-number/:busNumber', isAdminOrDriver, async (req, res) => {
  try {
    const { busNumber } = req.params;
    const students = await Student.find({
      $or: [
        { busNumber: busNumber },
        { 'transportDetails.busNumber': busNumber }
      ],
      usesTransport: true,
      isActive: true
    })
    .select('firstName lastName classLevel admissionNumber transportDetails qrCode busNumber');

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Error fetching students by bus number:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/students/by-parent/:parentId
 * @desc    Get all students for a specific parent
 * @access  Private (Parent or Admin)
 */
router.get('/by-parent/:parentId', async (req, res) => {
  try {
    const { parentId } = req.params;
    
    if (req.user.role === 'parent' && req.user.id !== parentId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const students = await Student.find({ parentId, isActive: true })
    .populate('transportDetails.busId', 'busNumber registrationNumber')
    .select('firstName lastName classLevel admissionNumber transportDetails qrCode tripAssignments busNumber');

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Error fetching students by parent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/students/:id
 * @desc    Get a single student by ID
 * @access  Private (Admin, Parent of student)
 */
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('parentId', 'firstName lastName email phone')
      .populate('transportDetails.busId', 'busNumber registrationNumber')
      .populate('tripAssignments.tripId', 'routeName tripType scheduledStartTime vehicleId status');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (req.user.role === 'parent' && student.parentId?._id?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/students
 * @desc    Create a new student with auto-generated QR code and bus number sync
 * @access  Private (Admin only)
 */
router.post('/', isAdmin, async (req, res) => {
  try {
    const existingStudent = await Student.findOne({ 
      admissionNumber: req.body.admissionNumber?.toUpperCase() 
    });
    
    if (existingStudent) {
      return res.status(409).json({ 
        success: false, 
        message: 'Admission number already exists' 
      });
    }

    // Auto-generate QR code
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const qrCode = `STU-${req.body.admissionNumber?.toUpperCase()}-${timestamp}-${randomSuffix}`;

    const studentData = {
      ...req.body,
      admissionNumber: req.body.admissionNumber?.toUpperCase(),
      usesTransport: req.body.usesTransport || false,
      tripAssignments: [],
      qrCode: qrCode
    };

    // Sync bus number if busId is provided
    if (studentData.transportDetails?.busId || studentData.busId) {
      const busId = studentData.transportDetails?.busId || studentData.busId;
      const bus = await Bus.findById(busId);
      if (bus) {
        studentData.busNumber = bus.busNumber;
        if (studentData.transportDetails) {
          studentData.transportDetails.busNumber = bus.busNumber;
        }
      }
    }

    if (studentData.usesTransport) {
      studentData.transportDetails = {
        ...studentData.transportDetails,
        status: 'pending',
        registrationDate: new Date()
      };
    }

    const student = new Student(studentData);
    const newStudent = await student.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Student created successfully with QR code', 
      data: newStudent 
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/students/:id
 * @desc    Update a student with bus number sync
 * @access  Private (Admin only)
 */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const existingStudent = await Student.findById(req.params.id);
    if (!existingStudent) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const updateData = { ...req.body };
    
    // If admission number changed, regenerate QR code
    if (updateData.admissionNumber && updateData.admissionNumber !== existingStudent.admissionNumber) {
      updateData.admissionNumber = updateData.admissionNumber?.toUpperCase();
      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      updateData.qrCode = `STU-${updateData.admissionNumber}-${timestamp}-${randomSuffix}`;
    }
    
    // Sync bus number if busId changed
    const busId = updateData.transportDetails?.busId || updateData.busId;
    if (busId && busId !== (existingStudent.transportDetails?.busId || existingStudent.busId)) {
      const bus = await Bus.findById(busId);
      if (bus) {
        updateData.busNumber = bus.busNumber;
        if (updateData.transportDetails) {
          updateData.transportDetails.busNumber = bus.busNumber;
        }
      }
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, message: 'Student updated successfully', data: student });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PATCH /api/students/:id/transport
 * @desc    Update student transport status with bus number sync
 * @access  Private (Admin only)
 */
router.patch('/:id/transport', isAdmin, async (req, res) => {
  try {
    const { usesTransport, transportDetails } = req.body;
    const updateData = {};
    
    if (usesTransport !== undefined) updateData.usesTransport = usesTransport;
    if (transportDetails) {
      updateData.transportDetails = transportDetails;
      
      // Sync bus number if busId is provided
      if (transportDetails.busId) {
        const bus = await Bus.findById(transportDetails.busId);
        if (bus) {
          updateData.busNumber = bus.busNumber;
          updateData.transportDetails.busNumber = bus.busNumber;
        }
      }
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.json({ success: true, message: 'Transport status updated', data: student });
  } catch (error) {
    console.error('Error updating transport status:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/students/:id
 * @desc    Soft delete a student (set isActive to false)
 * @access  Private (Admin only)
 */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id, 
      { isActive: false }, 
      { new: true }
    );
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.json({ success: true, message: 'Student deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating student:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/students/:id/generate-qr
 * @desc    Generate/Regenerate QR code for a student
 * @access  Private (Admin only)
 */
router.post('/:id/generate-qr', isAdmin, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    student.qrCode = `STU-${student.admissionNumber}-${timestamp}-${randomSuffix}`;
    await student.save();
    
    res.json({ 
      success: true, 
      message: 'QR code generated successfully', 
      qrCode: student.qrCode 
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/students/sync-bus-numbers
 * @desc    Sync all students with bus numbers (admin utility)
 * @access  Private (Admin only)
 */
router.post('/sync-bus-numbers', isAdmin, async (req, res) => {
  try {
    const updated = await Student.syncAllBusNumbers();
    res.json({
      success: true,
      message: `Synced ${updated} students with bus numbers`,
      updatedCount: updated
    });
  } catch (error) {
    console.error('Error syncing bus numbers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/students/stats/summary
 * @desc    Get student statistics summary
 * @access  Private (Admin only)
 */
router.get('/stats/summary', isAdmin, async (req, res) => {
  try {
    const [totalStudents, transportStudents, unlinkedStudents] = await Promise.all([
      Student.countDocuments({ isActive: true }),
      Student.countDocuments({ usesTransport: true, isActive: true }),
      Student.countDocuments({ 
        parentId: { $exists: false }, 
        usesTransport: true, 
        isActive: true 
      })
    ]);

    const byClass = await Student.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$classLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: { 
        total: totalStudents, 
        transportStudents, 
        unlinkedTransportStudents: unlinkedStudents, 
        byClass 
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;