const Notification = require('../models/Notification');
const Student = require('../models/Student');
const smsProvider = require('./smsProvider');
const config = require('../config/smsConfig');

class NotificationService {
  /**
   * Send boarding notification to parent
   */
  async sendBoardingAlert(studentId, tripId, location, timestamp) {
    try {
      const student = await Student.findById(studentId).populate('parentId');
      if (!student || !student.parentId) {
        console.log('No parent found for student:', studentId);
        return null;
      }

      const parent = student.parentId;
      const studentName = student.name || student.firstName + ' ' + student.lastName;
      const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Get message from template
      const message = config.templates.boarding(studentName, timeStr);

      // Create notification record
      const notification = new Notification({
        recipientId: parent._id,
        recipientType: 'parent',
        recipientPhone: parent.phone,
        recipientPushToken: parent.pushToken,
        studentId: student._id,
        tripId,
        type: 'boarding_alert',
        title: 'Child Boarded Bus',
        message,
        channels: parent.phone ? ['sms', 'push'] : ['push'],
        location,
        priority: 'high',
        deliveryStatus: [
          { channel: 'push', status: 'pending' }
        ]
      });

      if (parent.phone) {
        notification.deliveryStatus.push({ channel: 'sms', status: 'pending' });
      }

      await notification.save();

      // Send push notification (implement based on your push service)
      this.sendPushNotification(parent, notification);

      // Send SMS if phone exists
      if (parent.phone) {
        await this.sendSmartSMS(parent.phone, message, notification._id, {
          studentId: student._id,
          type: 'boarding'
        });
      }

      return notification;
    } catch (error) {
      console.error('Error sending boarding alert:', error);
      return null;
    }
  }

  /**
   * Send alighting notification to parent
   */
  async sendAlightingAlert(studentId, tripId, location, timestamp) {
    try {
      const student = await Student.findById(studentId).populate('parentId');
      if (!student || !student.parentId) return null;

      const parent = student.parentId;
      const studentName = student.name || student.firstName + ' ' + student.lastName;
      const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const message = config.templates.alighting(studentName, timeStr);

      const notification = new Notification({
        recipientId: parent._id,
        recipientType: 'parent',
        recipientPhone: parent.phone,
        recipientPushToken: parent.pushToken,
        studentId: student._id,
        tripId,
        type: 'alighting_alert',
        title: 'Child Alighted',
        message,
        channels: parent.phone ? ['sms', 'push'] : ['push'],
        location,
        deliveryStatus: [
          { channel: 'push', status: 'pending' }
        ]
      });

      if (parent.phone) {
        notification.deliveryStatus.push({ channel: 'sms', status: 'pending' });
      }

      await notification.save();

      this.sendPushNotification(parent, notification);
      
      if (parent.phone) {
        await this.sendSmartSMS(parent.phone, message, notification._id, {
          studentId: student._id,
          type: 'alighting'
        });
      }

      return notification;
    } catch (error) {
      console.error('Error sending alighting alert:', error);
      return null;
    }
  }

  /**
   * Smart SMS sending with dual providers
   */
  async sendSmartSMS(phone, message, notificationId, metadata = {}) {
    try {
      // Send via primary provider with fallback
      const result = await smsProvider.sendSMS(phone, message, {
        maxRetries: 3,
        retryDelay: 1000
      });

      // Update notification with delivery status
      const updateData = {
        'deliveryStatus.$[elem].status': result.success ? 'sent' : 'failed',
        'deliveryStatus.$[elem].sentAt': new Date(),
        'deliveryStatus.$[elem].provider': result.provider,
        'deliveryStatus.$[elem].messageId': result.messageId
      };

      if (!result.success) {
        updateData['deliveryStatus.$[elem].error'] = result.error;
      }

      await Notification.findByIdAndUpdate(notificationId, {
        $set: updateData
      }, {
        arrayFilters: [{ 'elem.channel': 'sms' }]
      });

      // Log for monitoring
      console.log(`📊 SMS Delivery Report:`, {
        to: phone,
        provider: result.provider,
        success: result.success,
        messageId: result.messageId,
        cost: result.cost,
        attempts: result.attempts
      });

      return result;
    } catch (error) {
      console.error('❌ Smart SMS failed:', error);
      
      // Mark as failed
      await Notification.findByIdAndUpdate(notificationId, {
        $set: {
          'deliveryStatus.$[elem].status': 'failed',
          'deliveryStatus.$[elem].error': error.message
        }
      }, {
        arrayFilters: [{ 'elem.channel': 'sms' }]
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification (implement based on your push service)
   */
  async sendPushNotification(parent, notification) {
    try {
      // If using Expo Push
      if (parent.pushToken) {
        // Implement Expo push here
        console.log(`📲 Push notification to ${parent.pushToken}`);
        
        await Notification.findByIdAndUpdate(notification._id, {
          $set: {
            'deliveryStatus.$[elem].status': 'sent',
            'deliveryStatus.$[elem].sentAt': new Date()
          }
        }, {
          arrayFilters: [{ 'elem.channel': 'push' }]
        });
      }
    } catch (error) {
      console.error('❌ Push notification failed:', error);
    }
  }

  /**
   * Get SMS provider statistics
   */
  async getSMSStats() {
    return await smsProvider.getStats();
  }

  /**
   * Send bulk notifications (e.g., for route deviations)
   */
  async sendBulkNotifications(parents, message, type, metadata = {}) {
    const results = [];
    
    for (const parent of parents) {
      try {
        const notification = new Notification({
          recipientId: parent._id,
          recipientType: 'parent',
          recipientPhone: parent.phone,
          recipientPushToken: parent.pushToken,
          type: type,
          title: metadata.title || 'Alert',
          message,
          channels: parent.phone ? ['sms', 'push'] : ['push'],
          metadata,
          deliveryStatus: [
            { channel: 'push', status: 'pending' }
          ]
        });

        if (parent.phone) {
          notification.deliveryStatus.push({ channel: 'sms', status: 'pending' });
        }

        await notification.save();

        // Send SMS
        if (parent.phone) {
          const smsResult = await this.sendSmartSMS(
            parent.phone, 
            message, 
            notification._id,
            metadata
          );
          results.push({ parent: parent._id, sms: smsResult });
        }

        // Send push
        await this.sendPushNotification(parent, notification);
        
      } catch (error) {
        console.error('Bulk notification error:', error);
        results.push({ parent: parent._id, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get notification history
   */
  async getParentNotifications(parentId, limit = 50, skip = 0) {
    return await Notification.find({ recipientId: parentId })
      .populate('studentId', 'name firstName lastName photo')
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
      const pushDelivery = notification.deliveryStatus.find(d => d.channel === 'push');
      if (pushDelivery) {
        pushDelivery.status = 'read';
        pushDelivery.readAt = new Date();
      }
      await notification.save();
    }
    return notification;
  }
}

module.exports = new NotificationService();