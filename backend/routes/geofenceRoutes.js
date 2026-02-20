const express = require('express');
const router = express.Router();
const Geofence = require('../models/Geofence');
const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Get all geofences
router.get('/', authMiddleware, async (req, res) => {
  try {
    const geofences = await Geofence.find();
    res.json({
      success: true,
      count: geofences.length,
      data: geofences
    });
  } catch (error) {
    console.error('Error fetching geofences:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get geofence by route name
router.get('/route/:routeName', authMiddleware, async (req, res) => {
  try {
    const { routeName } = req.params;
    const geofence = await Geofence.findOne({ routeName });
    
    if (!geofence) {
      return res.status(404).json({ 
        success: false, 
        message: 'Geofence not found for this route' 
      });
    }
    
    res.json({
      success: true,
      data: geofence
    });
  } catch (error) {
    console.error('Error fetching geofence:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get single geofence by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const geofence = await Geofence.findById(req.params.id);
    
    if (!geofence) {
      return res.status(404).json({ 
        success: false, 
        message: 'Geofence not found' 
      });
    }
    
    res.json({
      success: true,
      data: geofence
    });
  } catch (error) {
    console.error('Error fetching geofence:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Create new geofence
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const geofence = new Geofence(req.body);
    const newGeofence = await geofence.save();
    
    res.status(201).json({
      success: true,
      data: newGeofence
    });
  } catch (error) {
    console.error('Error creating geofence:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Update geofence
router.put('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const geofence = await Geofence.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!geofence) {
      return res.status(404).json({ 
        success: false, 
        message: 'Geofence not found' 
      });
    }
    
    res.json({
      success: true,
      data: geofence
    });
  } catch (error) {
    console.error('Error updating geofence:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete geofence
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const geofence = await Geofence.findByIdAndDelete(req.params.id);
    
    if (!geofence) {
      return res.status(404).json({ 
        success: false, 
        message: 'Geofence not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Geofence deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Check if a point is inside any geofence
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const { lat, lon, routeName } = req.body;
    
    if (!lat || !lon) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude required' 
      });
    }
    
    const query = routeName ? { routeName } : {};
    const geofences = await Geofence.find(query);
    
    const results = [];
    
    for (const geofence of geofences) {
      let inside = false;
      
      if (geofence.type === 'circle') {
        // Calculate distance from center
        const R = 6371e3; // Earth's radius in meters
        const φ1 = geofence.centerLat * Math.PI/180;
        const φ2 = lat * Math.PI/180;
        const Δφ = (lat - geofence.centerLat) * Math.PI/180;
        const Δλ = (lon - geofence.centerLon) * Math.PI/180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        inside = distance <= geofence.radiusMeters;
        
        results.push({
          geofenceId: geofence._id,
          routeName: geofence.routeName,
          type: 'circle',
          inside,
          distance: Math.round(distance)
        });
        
      } else if (geofence.type === 'polygon' && geofence.polygonPoints) {
        // Ray casting algorithm for polygon
        const point = { lat, lon };
        const polygon = geofence.polygonPoints;
        
        let isInside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
          const xi = polygon[i].lat, yi = polygon[i].lon;
          const xj = polygon[j].lat, yj = polygon[j].lon;
          
          const intersect = ((yi > point.lon) !== (yj > point.lon)) &&
              (point.lat < (xj - xi) * (point.lon - yi) / (yj - yi) + xi);
          if (intersect) isInside = !isInside;
        }
        
        inside = isInside;
        
        results.push({
          geofenceId: geofence._id,
          routeName: geofence.routeName,
          type: 'polygon',
          inside
        });
      }
    }
    
    res.json({
      success: true,
      point: { lat, lon },
      results
    });
    
  } catch (error) {
    console.error('Error checking geofence:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;