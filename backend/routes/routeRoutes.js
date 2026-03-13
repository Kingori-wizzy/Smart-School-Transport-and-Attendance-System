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
        .populate('bus', 'busNumber')
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
    const route = await Route.findById(req.params.id).populate('bus', 'busNumber');
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
    const route = new Route(req.body);
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
    const route = await Route.findByIdAndUpdate(
      req.params.id,
      req.body,
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
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    await route.deleteOne();
    res.json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;