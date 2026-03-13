// File: backend/routes/studentStatsRoutes.js

const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(isAdmin);

/**
 * @route   GET /api/students/stats/summary
 * @desc    Get comprehensive student statistics
 * @access  Private (Admin only)
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const [
      totalStudents,
      activeStudents,
      transportStudents,
      linkedStudents,
      unlinkedStudents,
      byClass,
      byGender,
      recentRegistrations
    ] = await Promise.all([
      // Total students
      Student.countDocuments({ isActive: true }),
      
      // Active students
      Student.countDocuments({ isActive: true }),
      
      // Transport students
      Student.countDocuments({ 
        usesTransport: true, 
        isActive: true 
      }),
      
      // Students linked to parents
      Student.countDocuments({ 
        parentId: { $exists: true, $ne: null },
        isActive: true 
      }),
      
      // Transport students NOT linked to parents
      Student.countDocuments({ 
        usesTransport: true,
        parentId: { $exists: false },
        isActive: true 
      }),
      
      // Students by class
      Student.aggregate([
        { $match: { isActive: true } },
        { $group: { 
          _id: '$classLevel', 
          count: { $sum: 1 },
          transport: {
            $sum: { $cond: ['$usesTransport', 1, 0] }
          }
        }},
        { $sort: { _id: 1 } }
      ]),
      
      // Students by gender
      Student.aggregate([
        { $match: { isActive: true } },
        { $group: { 
          _id: '$gender', 
          count: { $sum: 1 } 
        }}
      ]),
      
      // Recent registrations (last 30 days)
      Student.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    // Get students by bus assignment
    const byBus = await Student.aggregate([
      { $match: { 
        usesTransport: true,
        isActive: true,
        $or: [
          { 'transportDetails.busId': { $exists: true, $ne: null } },
          { busId: { $exists: true, $ne: null } }
        ]
      }},
      { $group: {
        _id: { $ifNull: ['$transportDetails.busId', '$busId'] },
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          total: totalStudents,
          active: activeStudents,
          transport: transportStudents,
          linked: linkedStudents,
          unlinked: unlinkedStudents,
          recentRegistrations
        },
        distribution: {
          byClass,
          byGender,
          byBus
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/students/transport
 * @desc    Get all transport students with details
 * @access  Private (Admin only)
 */
router.get('/transport', async (req, res) => {
  try {
    const { page = 1, limit = 50, status, class: className, busId } = req.query;
    
    const query = { 
      usesTransport: true,
      isActive: true 
    };
    
    if (status) {
      query['transportDetails.status'] = status;
    }
    
    if (className) {
      query.classLevel = className;
    }
    
    if (busId) {
      query.$or = [
        { 'transportDetails.busId': busId },
        { busId: busId }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [students, total] = await Promise.all([
      Student.find(query)
        .populate('parentId', 'name email phone')
        .populate('transportDetails.busId', 'registrationNumber busNumber')
        .populate('transportDetails.routeId', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort('-createdAt'),
      Student.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching transport students:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/students/unlinked
 * @desc    Get transport students not linked to parents
 * @access  Private (Admin only)
 */
router.get('/unlinked', async (req, res) => {
  try {
    const students = await Student.find({
      usesTransport: true,
      parentId: { $exists: false },
      isActive: true
    })
    .select('firstName lastName admissionNumber classLevel transportDetails createdAt')
    .sort('-createdAt');

    res.json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('Error fetching unlinked students:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/students/by-bus/:busId
 * @desc    Get students assigned to a specific bus
 * @access  Private (Admin/Driver)
 */
router.get('/by-bus/:busId', authMiddleware, async (req, res) => {
  try {
    const { busId } = req.params;
    
    const students = await Student.find({
      $or: [
        { 'transportDetails.busId': busId },
        { busId: busId }
      ],
      usesTransport: true,
      isActive: true
    })
    .populate('parentId', 'name phone')
    .select('firstName lastName classLevel admissionNumber transportDetails qrCode');

    res.json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('Error fetching bus students:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/students/without-parents
 * @desc    Get all students without parent links (including non-transport)
 * @access  Private (Admin only)
 */
router.get('/without-parents', isAdmin, async (req, res) => {
  try {
    const students = await Student.find({
      parentId: { $exists: false },
      isActive: true
    })
    .select('firstName lastName admissionNumber classLevel usesTransport createdAt');

    res.json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (error) {
    console.error('Error fetching students without parents:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;