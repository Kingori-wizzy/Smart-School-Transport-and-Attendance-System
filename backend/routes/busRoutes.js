const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// ==================== STATS ENDPOINT ====================

/**
 * @route   GET /api/buses/stats/summary
 * @desc    Get bus statistics summary for dashboard
 * @access  Private (Admin)
 */
router.get('/stats/summary', isAdmin, async (req, res) => {
  try {
    const total = await Bus.countDocuments();
    const active = await Bus.countDocuments({ status: 'active' });
    const onTrip = await Bus.countDocuments({ status: 'on_trip' });
    const maintenance = await Bus.countDocuments({ status: 'maintenance' });
    const inactive = await Bus.countDocuments({ status: 'inactive' });
    
    // Get buses by campus
    const byCampus = await Bus.aggregate([
      { $match: { campus: { $exists: true, $ne: null } } },
      { $group: { _id: '$campus', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Get buses by status for pie chart
    const byStatus = [
      { status: 'active', count: active },
      { status: 'on_trip', count: onTrip },
      { status: 'maintenance', count: maintenance },
      { status: 'inactive', count: inactive }
    ];

    // Get buses with recent activity (last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentlyActive = await Bus.countDocuments({
      $or: [
        { 'currentLocation.lastUpdated': { $gte: thirtyMinutesAgo } },
        { lastUpdate: { $gte: thirtyMinutesAgo } }
      ]
    });

    // Get buses with location data
    const withLocation = await Bus.countDocuments({
      'currentLocation.lat': { $exists: true, $ne: null },
      'currentLocation.lng': { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      data: {
        total,
        active,
        onTrip,
        maintenance,
        inactive,
        byCampus,
        byStatus,
        recentlyActive,
        withLocation,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching bus stats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==================== BASIC CRUD OPERATIONS ====================

/**
 * @route   GET /api/buses
 * @desc    Get all buses with optional filters
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { status, campus, page = 1, limit = 50, search } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (campus) query.campus = campus;
    
    // Search by bus number
    if (search) {
      query.$or = [
        { busNumber: { $regex: search, $options: 'i' } },
        { route: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [buses, total] = await Promise.all([
      Bus.find(query)
        // ✅ FIXED: Removed all populate calls (your model uses strings, not references)
        .limit(parseInt(limit))
        .skip(skip)
        .sort('-createdAt'),
      Bus.countDocuments(query)
    ]);

    res.json({
      success: true,
      count: buses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: buses
    });
  } catch (error) {
    console.error('Error fetching buses:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/buses/active
 * @desc    Get active buses (status = active or on_trip)
 * @access  Private
 */
router.get('/active', async (req, res) => {
  try {
    const buses = await Bus.find({ 
      status: { $in: ['active', 'on_trip'] } 
    });
    
    res.json({
      success: true,
      count: buses.length,
      data: buses
    });
  } catch (error) {
    console.error('Error fetching active buses:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/buses/online
 * @desc    Get buses with recent location updates (last 15 minutes)
 * @access  Private
 */
router.get('/online', async (req, res) => {
  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const buses = await Bus.find({
      $or: [
        { 'currentLocation.lastUpdated': { $gte: fifteenMinutesAgo } },
        { lastUpdate: { $gte: fifteenMinutesAgo } }
      ]
    }).select('busNumber currentLocation status driverName');
    
    res.json({
      success: true,
      count: buses.length,
      data: buses
    });
  } catch (error) {
    console.error('Error fetching online buses:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/buses/:id
 * @desc    Get single bus by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    
    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }
    
    res.json({
      success: true,
      data: bus
    });
  } catch (error) {
    console.error('Error fetching bus:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/buses
 * @desc    Create new bus
 * @access  Private (Admin only)
 */
router.post('/', isAdmin, async (req, res) => {
  try {
    // Check if bus number already exists
    const existingBus = await Bus.findOne({ 
      busNumber: req.body.busNumber?.toUpperCase() 
    });
    
    if (existingBus) {
      return res.status(409).json({ 
        success: false, 
        message: 'Bus with this number already exists' 
      });
    }

    const bus = new Bus(req.body);
    const newBus = await bus.save();
    
    console.log(`✅ New bus created: ${newBus.busNumber}`);
    
    res.status(201).json({
      success: true,
      message: 'Bus created successfully',
      data: newBus
    });
  } catch (error) {
    console.error('Error creating bus:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PUT /api/buses/:id
 * @desc    Update bus completely
 * @access  Private (Admin only)
 */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    // Check if bus exists
    const existingBus = await Bus.findById(req.params.id);
    if (!existingBus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }

    // If bus number is being changed, check for duplicates
    if (req.body.busNumber && 
        req.body.busNumber.toUpperCase() !== existingBus.busNumber) {
      const duplicateBus = await Bus.findOne({ 
        busNumber: req.body.busNumber?.toUpperCase() 
      });
      
      if (duplicateBus) {
        return res.status(409).json({ 
          success: false, 
          message: 'Bus with this number already exists' 
        });
      }
    }

    // Update the bus
    const updatedBus = await Bus.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    console.log(`✅ Bus updated: ${updatedBus.busNumber}`);
    
    res.json({
      success: true,
      message: 'Bus updated successfully',
      data: updatedBus
    });
  } catch (error) {
    console.error('Error updating bus:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/buses/:id/location
 * @desc    Update bus location (called from driver app or GPS device)
 * @access  Private (Driver/Admin)
 */
router.post('/:id/location', async (req, res) => {
  try {
    const { lat, lng, speed, heading, fuelLevel, accuracy } = req.body;
    
    // Validate input
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }

    const updateData = {
      'currentLocation.lat': lat,
      'currentLocation.lng': lng,
      'currentLocation.speed': speed || 0,
      'currentLocation.heading': heading || 0,
      'currentLocation.lastUpdated': new Date(),
      lastUpdate: new Date()
    };
    
    if (fuelLevel !== undefined) {
      updateData.fuelLevel = fuelLevel;
    }
    
    if (accuracy !== undefined) {
      updateData['currentLocation.accuracy'] = accuracy;
    }

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('busNumber currentLocation status');
    
    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        busId: bus._id,
        busNumber: bus.busNumber,
        location: bus.currentLocation
      }
    });
  } catch (error) {
    console.error('Error updating bus location:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   PATCH /api/buses/:id/status
 * @desc    Update bus status
 * @access  Private (Admin/Driver)
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['active', 'inactive', 'maintenance', 'on_trip'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status value' 
      });
    }

    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { status, lastStatusChange: new Date() },
      { new: true }
    );
    
    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }
    
    console.log(`✅ Bus ${bus.busNumber} status updated to: ${status}`);
    
    res.json({
      success: true,
      message: 'Status updated successfully',
      data: {
        id: bus._id,
        busNumber: bus.busNumber,
        status: bus.status
      }
    });
  } catch (error) {
    console.error('Error updating bus status:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   DELETE /api/buses/:id
 * @desc    Delete bus (soft delete by setting inactive)
 * @access  Private (Admin only)
 */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    // Soft delete - set status to inactive
    const bus = await Bus.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'inactive'
      },
      { new: true }
    );
    
    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }
    
    console.log(`✅ Bus ${bus.busNumber} deactivated`);
    
    res.json({
      success: true,
      message: 'Bus deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting bus:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Maintenance endpoints (keep if your model has these fields)
router.get('/:id/maintenance', isAdmin, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .select('maintenanceSchedule nextMaintenanceDue lastMaintenance');
    
    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        maintenanceSchedule: bus.maintenanceSchedule || [],
        nextMaintenanceDue: bus.nextMaintenanceDue,
        lastMaintenance: bus.lastMaintenance
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance schedule:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.post('/:id/maintenance', isAdmin, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    
    if (!bus) {
      return res.status(404).json({ 
        success: false, 
        message: 'Bus not found' 
      });
    }
    
    const maintenanceRecord = {
      ...req.body,
      date: req.body.date || new Date()
    };
    
    if (!bus.maintenanceSchedule) bus.maintenanceSchedule = [];
    bus.maintenanceSchedule.push(maintenanceRecord);
    
    if (req.body.nextDueDate) {
      bus.nextMaintenanceDue = {
        date: new Date(req.body.nextDueDate),
        type: req.body.type || 'routine'
      };
    }
    
    await bus.save();
    
    res.status(201).json({
      success: true,
      message: 'Maintenance record added',
      data: maintenanceRecord
    });
  } catch (error) {
    console.error('Error adding maintenance record:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;