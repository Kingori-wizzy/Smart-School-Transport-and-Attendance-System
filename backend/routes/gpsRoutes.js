const express = require('express');
const router = express.Router();

const GPSLog = require('../models/GPSLog');
const Trip = require('../models/Trip');
const Geofence = require('../models/Geofence');
const Notification = require('../models/Notification');

const { getDistanceFromLatLonInMeters } = require('../utils/geofenceUtils');
const { isPointInPolygon } = require('../utils/polygonUtils');

const { authMiddleware } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

/*
=====================================================
📍 GET ENDPOINTS - For Dashboard and Analytics
=====================================================
*/

// Get recent GPS logs for a specific vehicle (last 50)
router.get('/recent/:vehicleId', authMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const logs = await GPSLog.find({ vehicleId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching recent GPS logs:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get live locations for all active vehicles
router.get('/live', authMiddleware, async (req, res) => {
  try {
    // Find all active/running trips
    const activeTrips = await Trip.find({ 
      status: 'running' 
    }).select('vehicleId routeName driverId');
    
    // Get latest GPS log for each active vehicle
    const liveLocations = await Promise.all(
      activeTrips.map(async (trip) => {
        const latestLog = await GPSLog.findOne({ 
          vehicleId: trip.vehicleId 
        })
        .sort({ createdAt: -1 });
        
        if (latestLog) {
          return {
            tripId: trip._id,
            vehicleId: trip.vehicleId,
            routeName: trip.routeName,
            driverId: trip.driverId,
            lat: latestLog.lat,
            lon: latestLog.lon,
            speed: latestLog.speed,
            heading: latestLog.heading,
            fuelLevel: latestLog.fuelLevel,
            timestamp: latestLog.createdAt
          };
        }
        return null;
      })
    );
    
    // Filter out null values (vehicles with no GPS logs)
    const validLocations = liveLocations.filter(loc => loc !== null);
    
    res.json({
      success: true,
      count: validLocations.length,
      data: validLocations
    });
  } catch (error) {
    console.error('Error fetching live locations:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get vehicle history with date range
router.get('/history/:vehicleId', authMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    
    const query = { vehicleId };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.createdAt = { $lte: new Date(endDate) };
    }
    
    const logs = await GPSLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Calculate some basic stats
    const stats = {
      totalLogs: logs.length,
      averageSpeed: 0,
      maxSpeed: 0,
      startTime: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
      endTime: logs.length > 0 ? logs[0].createdAt : null
    };
    
    if (logs.length > 0) {
      const speeds = logs.map(log => log.speed).filter(s => s > 0);
      stats.averageSpeed = speeds.length > 0 
        ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
        : 0;
      stats.maxSpeed = Math.max(...speeds, 0);
    }
    
    res.json({
      success: true,
      count: logs.length,
      stats,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching vehicle history:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get GPS logs for a specific trip
router.get('/trip/:tripId', authMiddleware, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { limit = 100 } = req.query;
    
    const logs = await GPSLog.find({ tripId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching trip GPS logs:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get summary statistics for all vehicles
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    
    // Get total GPS logs today
    const totalLogsToday = await GPSLog.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Get unique active vehicles today
    const activeVehiclesToday = await GPSLog.distinct('vehicleId', {
      createdAt: { $gte: today }
    });
    
    // Get latest speed violations (simplified - you might want a separate collection for alerts)
    const speedViolations = await GPSLog.find({
      speed: { $gt: 80 }, // Over 80 km/h
      createdAt: { $gte: today }
    }).sort({ createdAt: -1 }).limit(10);
    
    res.json({
      success: true,
      data: {
        totalLogsToday,
        activeVehiclesCount: activeVehiclesToday.length,
        activeVehicles: activeVehiclesToday,
        recentSpeedViolations: speedViolations.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching GPS stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/*
=====================================================
🚍 DRIVER - GPS STREAM (Every ~5 seconds from device)
=====================================================
*/
router.post(
  '/',
  authMiddleware,
  roleMiddleware('driver'),
  async (req, res) => {

    try {
      const { lat, lon, speed = 0, heading, fuelLevel } = req.body;

      if (!lat || !lon) {
        return res.status(400).json({
          message: 'Latitude and Longitude required'
        });
      }

      const io = req.app.get('io');

      const activeTrip = await Trip.findOne({
        driverId: req.user.id,
        status: 'running'
      });

      if (!activeTrip) {
        return res.status(400).json({
          message: 'No active running trip'
        });
      }

      // ==============================
      // ✅ SAVE GPS LOG
      // ==============================
      const gpsLog = new GPSLog({
        vehicleId: activeTrip.vehicleId,
        routeName: activeTrip.routeName,
        tripId: activeTrip._id,
        lat,
        lon,
        speed,
        heading,
        fuelLevel
      });

      await gpsLog.save();

      // ==============================
      // 🔥 SPEEDING DETECTION
      // ==============================
      const SPEED_LIMIT = 80; // km/h

      if (speed > SPEED_LIMIT) {
        console.log("🚨 Speeding detected!");

        // ✅ UPDATED: Changed from 'speedAlert' to 'speed-alert'
        io.emit('speed-alert', {
          vehicleId: activeTrip.vehicleId,
          busId: activeTrip.vehicleId, // Add busId for compatibility
          speed,
          message: "Vehicle exceeding speed limit!",
          severity: 'high'
        });

        // Optionally save to notifications
        const notification = new Notification({
          type: 'speed_alert',
          vehicleId: activeTrip.vehicleId,
          message: `Vehicle exceeded speed limit: ${speed} km/h`,
          data: { speed, lat, lon }
        });
        await notification.save();
      }

      // ==============================
      // ⛽ FUEL ANOMALY DETECTION
      // ==============================
      const previousLog = await GPSLog.findOne({
        vehicleId: activeTrip.vehicleId
      }).sort({ createdAt: -1 }).skip(1);

      if (previousLog && fuelLevel !== undefined) {
        const drop = previousLog.fuelLevel - fuelLevel;

        if (drop > 15) { // sudden large drop
          console.log("⛽ Fuel anomaly detected!");

          // ✅ UPDATED: Changed from 'fuelAlert' to 'fuel-alert'
          io.emit('fuel-alert', {
            vehicleId: activeTrip.vehicleId,
            busId: activeTrip.vehicleId,
            message: "Sudden fuel drop detected!",
            previousLevel: previousLog.fuelLevel,
            currentLevel: fuelLevel,
            drop
          });

          // Optionally save to notifications
          const notification = new Notification({
            type: 'fuel_alert',
            vehicleId: activeTrip.vehicleId,
            message: `Sudden fuel drop detected: ${drop}% decrease`,
            data: { previousLevel: previousLog.fuelLevel, currentLevel: fuelLevel }
          });
          await notification.save();
        }
      }

      // ==============================
      // 📍 ADVANCED GEOFENCE CHECK
      // ==============================
      const geofence = await Geofence.findOne({
        routeName: activeTrip.routeName
      });

      if (geofence) {
        let outside = false;

        if (geofence.type === 'circle') {
          const distance = getDistanceFromLatLonInMeters(
            geofence.centerLat,
            geofence.centerLon,
            lat,
            lon
          );

          if (distance > geofence.radiusMeters) {
            outside = true;
          }

        } else if (geofence.type === 'polygon') {
          const inside = isPointInPolygon(
            { lat, lon },
            geofence.polygonPoints
          );

          if (!inside) {
            outside = true;
          }
        }

        if (outside) {
          console.log("🚨 Geofence violation!");

          // ✅ UPDATED: Changed from 'geofenceAlert' to 'geofence-alert'
          io.emit('geofence-alert', {
            vehicleId: activeTrip.vehicleId,
            busId: activeTrip.vehicleId,
            lat,
            lon,
            message: "Vehicle outside permitted zone!",
            severity: 'high'
          });

          // Optionally save to notifications
          const notification = new Notification({
            type: 'geofence_alert',
            vehicleId: activeTrip.vehicleId,
            message: 'Vehicle outside permitted zone',
            data: { lat, lon }
          });
          await notification.save();
        }
      }

      // ==============================
      // 🗺 LIVE BUS LOCATION UPDATE
      // ==============================
      // ✅ UPDATED: Changed from 'liveGPS' to 'bus-location-update'
      io.emit('bus-location-update', {
        vehicleId: activeTrip.vehicleId,
        busId: activeTrip.vehicleId,
        routeName: activeTrip.routeName,
        lat,
        lon,
        speed,
        fuelLevel,
        heading,
        timestamp: new Date()
      });

      // Also emit to specific bus room for targeted updates
      io.to(`bus-${activeTrip.vehicleId}`).emit('bus-location-update', {
        vehicleId: activeTrip.vehicleId,
        busId: activeTrip.vehicleId,
        lat,
        lon,
        speed,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'GPS processed successfully'
      });

    } catch (error) {
      console.error('Error processing GPS:', error);
      res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
);

module.exports = router;