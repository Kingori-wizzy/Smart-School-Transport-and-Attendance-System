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

        io.emit('speedAlert', {
          vehicleId: activeTrip.vehicleId,
          speed,
          message: "Vehicle exceeding speed limit!"
        });
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

          io.emit('fuelAlert', {
            vehicleId: activeTrip.vehicleId,
            message: "Sudden fuel drop detected!"
          });
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

          io.emit('geofenceAlert', {
            vehicleId: activeTrip.vehicleId,
            lat,
            lon,
            message: "Vehicle outside permitted zone!"
          });
        }
      }


      // ==============================
      // 🗺 MAP CLUSTER SUPPORT EVENT
      // ==============================
      io.emit('liveGPS', {
        vehicleId: activeTrip.vehicleId,
        routeName: activeTrip.routeName,
        lat,
        lon,
        speed,
        fuelLevel,
        timestamp: new Date()
      });

      res.json({
        message: 'GPS processed successfully'
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
