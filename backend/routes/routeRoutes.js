const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/routes
 * @desc    Get all routes
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const [routes, total] = await Promise.all([
      Route.find(query)
        .populate('busId', 'busNumber')
        .skip(skip)
        .limit(parseInt(limit))
        .sort('-createdAt'),
      Route.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: routes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/routes/:id
 * @desc    Get single route
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).populate('busId', 'busNumber');
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.json({ success: true, data: route });
  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/routes
 * @desc    Create new route
 * @access  Private (Admin)
 */
router.post('/', isAdmin, async (req, res) => {
  try {
    // Validate required fields
    if (!req.body.name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Route name is required' 
      });
    }

    // Format data to match model
    const routeData = {
      name: req.body.name,
      description: req.body.description || '',
      busId: req.body.busId || req.body.bus || null,
      stops: req.body.stops || [],
      distance: req.body.distance || 0,
      estimatedDuration: req.body.estimatedDuration || req.body.duration || 0,
      active: req.body.active !== undefined ? req.body.active : true,
      createdBy: req.user.id,
      optimization: req.body.optimization || {},
      metadata: req.body.metadata || {}
    };

    const route = new Route(routeData);
    const newRoute = await route.save();
    
    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: newRoute
    });
  } catch (error) {
    console.error('Error creating route:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/routes/:id
 * @desc    Update route
 * @access  Private (Admin)
 */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    // Format data to match model
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      busId: req.body.busId || req.body.bus,
      stops: req.body.stops,
      distance: req.body.distance,
      estimatedDuration: req.body.estimatedDuration || req.body.duration,
      active: req.body.active,
      optimization: req.body.optimization,
      metadata: req.body.metadata
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    );

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    
    res.json({
      success: true,
      message: 'Route updated successfully',
      data: route
    });
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/routes/:id
 * @desc    Delete route
 * @access  Private (Admin)
 */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    
    res.json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/routes/bus/:busId
 * @desc    Get route by bus ID
 * @access  Private
 */
router.get('/bus/:busId', async (req, res) => {
  try {
    const route = await Route.findOne({ busId: req.params.busId });
    res.json({ success: true, data: route });
  } catch (error) {
    console.error('Error fetching route by bus:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/routes/:id/stops
 * @desc    Get stops for a route
 * @access  Private
 */
router.get('/:id/stops', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).select('stops');
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.json({ success: true, data: route.stops || [] });
  } catch (error) {
    console.error('Error fetching route stops:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/routes/:id/stops
 * @desc    Update route stops
 * @access  Private (Admin)
 */
router.put('/:id/stops', isAdmin, async (req, res) => {
  try {
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { stops: req.body.stops },
      { new: true }
    );
    
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Route stops updated successfully',
      data: route.stops 
    });
  } catch (error) {
    console.error('Error updating route stops:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/routes/bulk-update
 * @desc    Bulk update routes (admin only)
 * @access  Private (Admin)
 */
router.post('/bulk-update', isAdmin, async (req, res) => {
  try {
    const { routeIds, ...updateData } = req.body;
    
    if (!Array.isArray(routeIds) || routeIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Route IDs array is required' 
      });
    }

    const result = await Route.updateMany(
      { _id: { $in: routeIds } },
      { $set: updateData }
    );

    res.json({ 
      success: true, 
      message: `${result.modifiedCount} routes updated successfully`,
      data: result
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/routes/export
 * @desc    Export routes (admin only)
 * @access  Private (Admin)
 */
router.get('/export', isAdmin, async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    const routes = await Route.find().populate('busId', 'busNumber');
    
    if (format === 'csv') {
      // Convert to CSV
      const csv = convertRoutesToCSV(routes);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=routes-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({ success: true, data: routes });
    }
  } catch (error) {
    console.error('Error exporting routes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/routes/:id/efficiency
 * @desc    Calculate route efficiency
 * @access  Private
 */
router.get('/:id/efficiency', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id).populate('busId');
    
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    // Calculate efficiency based on stops and distance
    const efficiency = {
      score: 85,
      factors: {
        stopDensity: route.stops.length > 0 ? (route.distance / route.stops.length).toFixed(1) : 0,
        estimatedTime: route.estimatedDuration,
        actualTime: null
      },
      recommendations: []
    };

    if (route.stops.length > 10) {
      efficiency.recommendations.push('Consider consolidating stops to improve efficiency');
    }
    
    if (route.distance > 30) {
      efficiency.recommendations.push('Long route detected - consider splitting into two routes');
    }

    res.json({ success: true, data: efficiency });
  } catch (error) {
    console.error('Error calculating route efficiency:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper function to convert routes to CSV
function convertRoutesToCSV(routes) {
  const headers = ['Name', 'Description', 'Stops', 'Distance (km)', 'Duration (min)', 'Status', 'Bus'];
  const rows = routes.map(route => [
    route.name || 'Unnamed',
    route.description || '',
    route.stops?.length || 0,
    route.distance || 0,
    route.estimatedDuration || 0,
    route.active ? 'Active' : 'Inactive',
    route.busId?.busNumber || 'Not assigned'
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

module.exports = router;