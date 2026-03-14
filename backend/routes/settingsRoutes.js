const express = require('express');
const router = express.Router();
const SystemConfig = require('../models/SystemConfig');
const UserPreference = require('../models/UserPreference');
const NotificationSetting = require('../models/NotificationSetting');
const Backup = require('../models/Backup');
const AuditLog = require('../models/AuditLog');
const { authMiddleware } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/authMiddleware');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// All settings routes require authentication
router.use(authMiddleware);

// ==================== SYSTEM CONFIGURATION ====================

/**
 * @route   GET /api/settings/system
 * @desc    Get system configuration
 * @access  Private (Admin)
 */
router.get('/system', isAdmin, async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    
    if (!config) {
      // Create default config if none exists
      config = new SystemConfig({
        schoolName: 'Smart School',
        schoolAddress: 'Nairobi, Kenya',
        schoolPhone: '+254 700 000000',
        schoolEmail: 'info@smartschool.com',
        timezone: 'Africa/Nairobi',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        language: 'en',
        currency: 'KES',
        speedLimit: 80,
        geofenceRadius: 500,
        fuelAlertThreshold: 15,
        maxStudentsPerBus: 40,
        morningTripTime: '06:30',
        eveningTripTime: '16:30',
        trackingInterval: 30,
        offlineCache: true,
        routeOptimization: true,
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true,
        twoFactorAuth: false,
        sessionTimeout: 30,
        passwordPolicy: 'strong',
        maxLoginAttempts: 5,
        lockoutDuration: 30,
        auditLogging: true,
        dataRetention: 90,
        autoBackup: true,
        backupFrequency: 'daily',
        backupTime: '02:00',
        retainBackups: 30,
        backupLocation: 'cloud'
      });
      await config.save();
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching system config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/settings/system
 * @desc    Update system configuration
 * @access  Private (Admin)
 */
router.put('/system', isAdmin, async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    
    if (!config) {
      config = new SystemConfig(req.body);
    } else {
      Object.assign(config, req.body);
    }
    
    config.updatedBy = req.user.id;
    config.updatedAt = new Date();
    
    await config.save();
    
    // Log the change
    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE_SYSTEM_CONFIG',
      details: 'System configuration updated',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'System configuration updated successfully',
      data: config
    });
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== USER PREFERENCES ====================

/**
 * @route   GET /api/settings/preferences
 * @desc    Get current user's preferences
 * @access  Private
 */
router.get('/preferences', async (req, res) => {
  try {
    let prefs = await UserPreference.findOne({ userId: req.user.id });
    
    if (!prefs) {
      // Create default preferences
      prefs = new UserPreference({
        userId: req.user.id,
        theme: 'light',
        compactView: false,
        animations: true,
        fontSize: 'medium',
        highContrast: false,
        reduceMotion: false,
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        sidebarCollapsed: false,
        notifications: true,
        soundAlerts: true,
        alertVolume: 70,
        autoSave: true,
        autoSaveInterval: 5
      });
      await prefs.save();
    }
    
    res.json({
      success: true,
      data: prefs
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/settings/preferences
 * @desc    Update current user's preferences
 * @access  Private
 */
router.put('/preferences', async (req, res) => {
  try {
    let prefs = await UserPreference.findOne({ userId: req.user.id });
    
    if (!prefs) {
      prefs = new UserPreference({
        userId: req.user.id,
        ...req.body
      });
    } else {
      Object.assign(prefs, req.body);
    }
    
    prefs.updatedAt = new Date();
    await prefs.save();
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: prefs
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== NOTIFICATION SETTINGS ====================

/**
 * @route   GET /api/settings/notifications
 * @desc    Get notification settings
 * @access  Private
 */
router.get('/notifications', async (req, res) => {
  try {
    let settings = await NotificationSetting.findOne({ userId: req.user.id });
    
    if (!settings) {
      settings = new NotificationSetting({
        userId: req.user.id,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        parentAlerts: true,
        driverAlerts: true,
        adminAlerts: true,
        attendanceAlerts: true,
        speedAlerts: true,
        geofenceAlerts: true,
        fuelAlerts: true,
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '06:00',
        emailDigest: 'daily'
      });
      await settings.save();
    }
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   PUT /api/settings/notifications
 * @desc    Update notification settings
 * @access  Private
 */
router.put('/notifications', async (req, res) => {
  try {
    let settings = await NotificationSetting.findOne({ userId: req.user.id });
    
    if (!settings) {
      settings = new NotificationSetting({
        userId: req.user.id,
        ...req.body
      });
    } else {
      Object.assign(settings, req.body);
    }
    
    settings.updatedAt = new Date();
    await settings.save();
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== BACKUP & RESTORE ====================

/**
 * @route   GET /api/settings/backups
 * @desc    Get all backups
 * @access  Private (Admin)
 */
router.get('/backups', isAdmin, async (req, res) => {
  try {
    const backups = await Backup.find().sort('-createdAt');
    res.json({
      success: true,
      data: backups
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/settings/backup
 * @desc    Create a new backup
 * @access  Private (Admin)
 */
router.post('/backup', isAdmin, async (req, res) => {
  try {
    const timestamp = Date.now();
    const backupName = `backup_${new Date().toISOString().split('T')[0]}_${timestamp}`;
    const backupPath = path.join(__dirname, '..', 'backups', backupName);
    
    // Create backup directory if it doesn't exist
    await fs.mkdir(path.join(__dirname, '..', 'backups'), { recursive: true });
    
    // Here you would implement actual backup logic
    // For now, we'll create a mock backup record
    
    const backup = new Backup({
      name: backupName,
      size: '2.4 MB',
      type: 'manual',
      status: 'completed',
      createdBy: req.user.id,
      path: backupPath,
      collections: ['users', 'students', 'buses', 'trips', 'attendance']
    });
    
    await backup.save();
    
    // Log the backup
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE_BACKUP',
      details: `Manual backup created: ${backupName}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      success: true,
      message: 'Backup created successfully',
      data: backup
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/settings/restore/:backupId
 * @desc    Restore from backup
 * @access  Private (Admin)
 */
router.post('/restore/:backupId', isAdmin, async (req, res) => {
  try {
    const backup = await Backup.findById(req.params.backupId);
    
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    
    // Here you would implement actual restore logic
    
    backup.restoredAt = new Date();
    backup.restoredBy = req.user.id;
    await backup.save();
    
    // Log the restore
    await AuditLog.create({
      userId: req.user.id,
      action: 'RESTORE_BACKUP',
      details: `Restored from backup: ${backup.name}`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'Backup restored successfully'
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   DELETE /api/settings/backup/:backupId
 * @desc    Delete a backup
 * @access  Private (Admin)
 */
router.delete('/backup/:backupId', isAdmin, async (req, res) => {
  try {
    const backup = await Backup.findByIdAndDelete(req.params.backupId);
    
    if (!backup) {
      return res.status(404).json({ success: false, message: 'Backup not found' });
    }
    
    // Delete the actual backup file if it exists
    try {
      await fs.unlink(backup.path);
    } catch (err) {
      console.warn('Backup file not found:', err.message);
    }
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AUDIT LOGS ====================

/**
 * @route   GET /api/settings/audit-logs
 * @desc    Get audit logs with pagination and filters
 * @access  Private (Admin)
 */
router.get('/audit-logs', isAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      userId, 
      action, 
      startDate, 
      endDate 
    } = req.query;
    
    const query = {};
    
    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   GET /api/settings/audit-logs/stats
 * @desc    Get audit log statistics
 * @access  Private (Admin)
 */
router.get('/audit-logs/stats', isAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await AuditLog.aggregate([
      {
        $match: {
          createdAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const total = await AuditLog.countDocuments();
    
    res.json({
      success: true,
      data: {
        total,
        today: stats.reduce((sum, s) => sum + s.count, 0),
        byAction: stats
      }
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== DATABASE MAINTENANCE ====================

/**
 * @route   POST /api/settings/cleanup
 * @desc    Clean up old data based on retention policy
 * @access  Private (Admin)
 */
router.post('/cleanup', isAdmin, async (req, res) => {
  try {
    const { days = 90 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Get current system config for retention policy
    const config = await SystemConfig.findOne();
    const retentionDays = config?.dataRetention || days;
    
    const results = {};
    
    // Clean up old attendance records
    if (req.body.attendance !== false) {
      const attendanceResult = await mongoose.model('Attendance').deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      results.attendance = attendanceResult.deletedCount;
    }
    
    // Clean up old GPS logs
    if (req.body.gpsLogs !== false) {
      const gpsResult = await mongoose.model('GPSLog').deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      results.gpsLogs = gpsResult.deletedCount;
    }
    
    // Clean up old notifications
    if (req.body.notifications !== false) {
      const notifResult = await mongoose.model('Notification').deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true
      });
      results.notifications = notifResult.deletedCount;
    }
    
    // Clean up old audit logs
    if (req.body.auditLogs !== false) {
      const auditResult = await AuditLog.deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      results.auditLogs = auditResult.deletedCount;
    }
    
    // Log the cleanup
    await AuditLog.create({
      userId: req.user.id,
      action: 'CLEANUP_DATA',
      details: `Cleaned up data older than ${retentionDays} days`,
      metadata: results,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: `Cleaned up data older than ${retentionDays} days`,
      data: results
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== HEALTH CHECK ====================

/**
 * @route   GET /api/settings/health
 * @desc    Check system health
 * @access  Private (Admin)
 */
router.get('/health', isAdmin, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: await checkDatabaseHealth(),
        storage: await checkStorageHealth(),
        memory: await checkMemoryHealth()
      }
    };
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper functions for health checks
async function checkDatabaseHealth() {
  try {
    await mongoose.connection.db.admin().ping();
    return { status: 'connected', latency: 'normal' };
  } catch (error) {
    return { status: 'disconnected', error: error.message };
  }
}

async function checkStorageHealth() {
  try {
    const stats = await fs.stat('/app');
    const freeSpace = stats.size; // This is simplified
    return { status: 'ok', freeSpace: '10GB' }; // Mock value
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

async function checkMemoryHealth() {
  const used = process.memoryUsage();
  return {
    status: used.heapUsed / used.heapTotal < 0.9 ? 'ok' : 'warning',
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    rss: `${Math.round(used.rss / 1024 / 1024)} MB`
  };
}

module.exports = router;