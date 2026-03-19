const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');

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
      simple // Add simple flag to skip population
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
    
    // Build query based on whether we need population
    let studentsQuery = Student.find(query);
    
    if (simple !== 'true') {
      // Only populate if not requesting simple data
      studentsQuery = studentsQuery
        .populate('parentId', 'firstName lastName email phone')
        .populate('transportDetails.busId', 'busNumber registrationNumber');
      // REMOVED: .populate('transportDetails.routeId', 'name') - THIS FIELD DOESN'T EXIST
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
    .select('firstName lastName classLevel admissionNumber transportDetails qrCode');

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
    .select('firstName lastName admissionNumber classLevel transportDetails');

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
    .select('firstName lastName classLevel admissionNumber transportDetails qrCode');

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Error fetching students by bus:', error);
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
    
    // Check if user has access
    if (req.user.role === 'parent' && req.user.id !== parentId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const students = await Student.find({ parentId, isActive: true })
    .populate('transportDetails.busId', 'busNumber registrationNumber')
    .select('firstName lastName classLevel admissionNumber transportDetails qrCode');

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
      .populate('transportDetails.busId', 'busNumber registrationNumber');
      // REMOVED: .populate('transportDetails.routeId', 'name') - THIS FIELD DOESN'T EXIST
      // REMOVED: .populate('notes.author', 'name') - This field might not exist either

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Check if parent has access to this student
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
 * @desc    Create a new student
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

    const studentData = {
      ...req.body,
      admissionNumber: req.body.admissionNumber?.toUpperCase(),
      usesTransport: req.body.usesTransport || false
    };

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
      message: 'Student created successfully', 
      data: newStudent 
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/students/:id
 * @desc    Update a student
 * @access  Private (Admin only)
 */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body, 
        admissionNumber: req.body.admissionNumber?.toUpperCase() 
      },
      { new: true, runValidators: true }
    );
    
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    res.json({ success: true, message: 'Student updated successfully', data: student });
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PATCH /api/students/:id/transport
 * @desc    Update student transport status
 * @access  Private (Admin only)
 */
router.patch('/:id/transport', isAdmin, async (req, res) => {
  try {
    const { usesTransport, transportDetails } = req.body;
    const updateData = {};
    if (usesTransport !== undefined) updateData.usesTransport = usesTransport;
    if (transportDetails) updateData.transportDetails = transportDetails;

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
 * @desc    Generate QR code for a student
 * @access  Private (Admin only)
 */
router.post('/:id/generate-qr', isAdmin, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const timestamp = Date.now();
    student.qrCode = `STU-${student.admissionNumber}-${timestamp}`;
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