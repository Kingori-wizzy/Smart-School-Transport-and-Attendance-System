// File: backend/routes/assignmentRoutes.js

const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

// All assignment routes require authentication
router.use(authMiddleware);

// ==================== GET ALL ASSIGNMENTS ====================
router.get('/', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate('bus', 'busNumber registrationNumber')
        .populate('driver', 'name email phone')
        .populate('route', 'name description')
        .populate('createdBy', 'name')
        .skip(skip)
        .limit(parseInt(limit))
        .sort('-createdAt'),
      Assignment.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: assignments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== GET SINGLE ASSIGNMENT ====================
router.get('/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('bus')
      .populate('driver')
      .populate('route')
      .populate('createdBy', 'name email');

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== CREATE ASSIGNMENT ====================
router.post('/', isAdmin, async (req, res) => {
  try {
    // Check if bus is already assigned during this period
    const existingAssignment = await Assignment.findOne({
      bus: req.body.bus,
      status: 'active',
      startDate: { $lte: req.body.endDate || new Date('2099-12-31') },
      endDate: { $gte: req.body.startDate }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: 'Bus is already assigned during this period'
      });
    }

    // Check if driver is already assigned during this period
    const existingDriverAssignment = await Assignment.findOne({
      driver: req.body.driver,
      status: 'active',
      startDate: { $lte: req.body.endDate || new Date('2099-12-31') },
      endDate: { $gte: req.body.startDate }
    });

    if (existingDriverAssignment) {
      return res.status(409).json({
        success: false,
        message: 'Driver is already assigned during this period'
      });
    }

    const assignment = new Assignment({
      ...req.body,
      createdBy: req.user.id
    });
    
    const newAssignment = await assignment.save();

    console.log(`✅ New assignment created: ${newAssignment._id}`);

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: newAssignment
    });
  } catch (error) {
    console.error('Error creating assignment:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== UPDATE ASSIGNMENT ====================
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      });
    }

    console.log(`✅ Assignment updated: ${assignment._id}`);

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== DELETE ASSIGNMENT (soft delete) ====================
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: 'cancelled' },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      });
    }

    console.log(`✅ Assignment deactivated: ${assignment._id}`);

    res.json({ 
      success: true, 
      message: 'Assignment deactivated successfully' 
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== COMPLETE ASSIGNMENT ====================
router.patch('/:id/complete', isAdmin, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'completed',
        endDate: new Date()
      },
      { new: true }
    );

    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assignment not found' 
      });
    }

    res.json({
      success: true,
      message: 'Assignment completed successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error completing assignment:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== GET ACTIVE ASSIGNMENTS ====================
router.get('/status/active', async (req, res) => {
  try {
    const assignments = await Assignment.find({ status: 'active' })
      .populate('bus', 'busNumber')
      .populate('driver', 'name')
      .populate('route', 'name');

    res.json({
      success: true,
      count: assignments.length,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching active assignments:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== GET ASSIGNMENTS BY BUS ====================
router.get('/bus/:busId', async (req, res) => {
  try {
    const assignments = await Assignment.find({ 
      bus: req.params.busId,
      status: 'active'
    }).populate('driver', 'name').populate('route', 'name');

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching bus assignments:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== GET ASSIGNMENTS BY DRIVER ====================
router.get('/driver/:driverId', async (req, res) => {
  try {
    const assignments = await Assignment.find({ 
      driver: req.params.driverId,
      status: 'active'
    }).populate('bus', 'busNumber').populate('route', 'name');

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error fetching driver assignments:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;