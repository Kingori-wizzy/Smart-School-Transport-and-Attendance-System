const Notification = require('../models/Notification');
const Student = require('../models/Student');
const emailService = require('./emailService');
const smsProvider = require('./smsProvider');

class NotificationService {
  /**
   * Send boarding notification to parent (Priority: Email > Push > SMS)
   */
  async sendBoardingAlert(studentId, tripId, location, timestamp) {
    try {
      const student = await Student.findById(studentId).populate('parentId');
      if (!student || !student.parentId) {
        console.log('No parent found for student:', studentId);
        return null;
      }

      const parent = student.parentId;
      const studentName = student.firstName + ' ' + student.lastName;
      const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const busNumber = student.busNumber || 'N/A';

      // Create notification record
      const notification = new Notification({
        recipientId: parent._id,
        recipientType: 'parent',
        recipientEmail: parent.email,
        recipientPhone: parent.phone,
        recipientPushToken: parent.pushToken,
        studentId: student._id,
        tripId,
        type: 'boarding_alert',
        title: 'Child Boarded Bus',
        message: `${studentName} boarded the bus at ${timeStr}`,
        location,
        priority: 'high'
      });

      await notification.save();

      // 1. Send Email (Primary)
      let emailResult = { success: false };
      if (parent.email) {
        emailResult = await emailService.sendParentNotification(parent, 'board', {
          studentName,
          time: timeStr,
          busNumber
        });
        notification.emailSent = emailResult.success;
      }

      // 2. Send SMS if configured (Optional)
      let smsResult = { success: false };
      if (parent.phone && process.env.SMS_ENABLED === 'true') {
        const smsMessage = `Smart School: ${studentName} boarded bus ${busNumber} at ${timeStr}`;
        smsResult = await smsProvider.sendSMS(parent.phone, smsMessage);
        notification.smsSent = smsResult.success;
      }

      notification.deliveryStatus = {
        email: { sent: emailResult.success, timestamp: new Date() },
        sms: { sent: smsResult.success, timestamp: new Date() }
      };
      await notification.save();

      console.log(`📧 Notification sent to parent of ${studentName}: Email=${emailResult.success}, SMS=${smsResult.success}`);
      return notification;

    } catch (error) {
      console.error('Error sending boarding alert:', error);
      return null;
    }
  }

  /**
   * Send alighting notification to parent (Priority: Email > Push > SMS)
   */
  async sendAlightingAlert(studentId, tripId, location, timestamp) {
    try {
      const student = await Student.findById(studentId).populate('parentId');
      if (!student || !student.parentId) return null;

      const parent = student.parentId;
      const studentName = student.firstName + ' ' + student.lastName;
      const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const busNumber = student.busNumber || 'N/A';

      const notification = new Notification({
        recipientId: parent._id,
        recipientType: 'parent',
        recipientEmail: parent.email,
        recipientPhone: parent.phone,
        recipientPushToken: parent.pushToken,
        studentId: student._id,
        tripId,
        type: 'alighting_alert',
        title: 'Child Alighted',
        message: `${studentName} alighted from the bus at ${timeStr}`,
        location,
        priority: 'high'
      });

      await notification.save();

      // 1. Send Email (Primary)
      let emailResult = { success: false };
      if (parent.email) {
        emailResult = await emailService.sendParentNotification(parent, 'alight', {
          studentName,
          time: timeStr,
          busNumber
        });
        notification.emailSent = emailResult.success;
      }

      // 2. Send SMS if configured (Optional)
      let smsResult = { success: false };
      if (parent.phone && process.env.SMS_ENABLED === 'true') {
        const smsMessage = `Smart School: ${studentName} alighted from bus ${busNumber} at ${timeStr}`;
        smsResult = await smsProvider.sendSMS(parent.phone, smsMessage);
        notification.smsSent = smsResult.success;
      }

      notification.deliveryStatus = {
        email: { sent: emailResult.success, timestamp: new Date() },
        sms: { sent: smsResult.success, timestamp: new Date() }
      };
      await notification.save();

      console.log(`📧 Notification sent: Email=${emailResult.success}, SMS=${smsResult.success}`);
      return notification;

    } catch (error) {
      console.error('Error sending alighting alert:', error);
      return null;
    }
  }

  /**
   * Send trip start notification to all parents (Priority: Email > Push > SMS)
   */
  async sendTripStartAlert(trip, parents) {
    try {
      const results = [];
      for (const parent of parents) {
        if (parent.email) {
          const result = await emailService.sendParentNotification(parent, 'trip_start', {
            routeName: trip.routeName,
            busNumber: trip.vehicleId,
            estimatedArrival: 'Track in app'
          });
          results.push({ parent: parent.email, success: result.success });
        }
      }
      return results;
    } catch (error) {
      console.error('Error sending trip start alerts:', error);
      return [];
    }
  }

  /**
   * Send delay notification to parent
   */
  async sendDelayAlert(parent, studentName, minutes, reason) {
    try {
      if (!parent.email) return null;
      
      return await emailService.sendParentNotification(parent, 'delay', {
        studentName,
        minutes,
        reason
      });
    } catch (error) {
      console.error('Error sending delay alert:', error);
      return null;
    }
  }

  /**
   * Send emergency alert to all parents
   */
  async sendEmergencyAlert(trip, parents, description, location) {
    try {
      const results = [];
      for (const parent of parents) {
        if (parent.email) {
          const result = await emailService.sendParentNotification(parent, 'emergency', {
            busNumber: trip.vehicleId,
            location: location || 'Unknown',
            description
          });
          results.push({ parent: parent.email, success: result.success });
        }
      }
      return results;
    } catch (error) {
      console.error('Error sending emergency alerts:', error);
      return [];
    }
  }

  /**
   * Send driver message to parent
   */
  async sendDriverMessage(parent, driverName, message) {
    try {
      if (!parent.email) return null;
      
      return await emailService.sendParentNotification(parent, 'driver_message', {
        driverName,
        message
      });
    } catch (error) {
      console.error('Error sending driver message:', error);
      return null;
    }
  }

  /**
   * Get notification history for parent
   */
  async getParentNotifications(parentId, limit = 50, skip = 0) {
    return await Notification.find({ recipientId: parentId })
      .populate('studentId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  /**
   * Get unread count
   */
  async getUnreadCount(parentId) {
    return await Notification.countDocuments({
      recipientId: parentId,
      readAt: null
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    const notification = await Notification.findById(notificationId);
    if (notification) {
      notification.readAt = new Date();
      await notification.save();
    }
    return notification;
  }
}

module.exports = new NotificationService();