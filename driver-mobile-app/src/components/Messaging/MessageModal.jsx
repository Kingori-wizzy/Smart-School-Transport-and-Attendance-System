import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function MessageModal({ visible, onClose, trip, student, onMessageSent }) {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [loading, setLoading] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [delayMinutes, setDelayMinutes] = useState('15');

  const messageTypes = [
    { id: 'info', label: 'Information', icon: 'information-circle', color: '#2196F3', smsTemplate: 'Smart School Info: ' },
    { id: 'delay', label: 'Delay Update', icon: 'time', color: '#FF9800', smsTemplate: 'Smart School Delay: ' },
    { id: 'emergency', label: 'Emergency Alert', icon: 'alert-circle', color: '#f44336', smsTemplate: 'EMERGENCY: ' },
    { id: 'reminder', label: 'Reminder', icon: 'notifications', color: '#4CAF50', smsTemplate: 'Smart School Reminder: ' },
  ];

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setLoading(true);
    try {
      let endpoint;
      let payload;

      if (student) {
        // Single parent message
        endpoint = `/driver/message/parent/${student._id}`;
        payload = { 
          message: message.trim(), 
          type: messageType, 
          tripId: trip?._id,
          sendSms: smsEnabled,
          studentName: `${student.firstName} ${student.lastName}`
        };
      } else {
        // Broadcast to all parents on trip
        endpoint = `/driver/message/broadcast/${trip?._id}`;
        payload = { 
          message: message.trim(), 
          type: messageType,
          sendSms: smsEnabled,
          tripName: trip?.routeName || 'School Bus'
        };
      }

      const response = await api.post(endpoint, payload);
      
      if (response.data.success) {
        const smsMessage = smsEnabled ? ' SMS notification sent to parents.' : '';
        Alert.alert('Success', `Message sent successfully${smsMessage}`);
        setMessage('');
        setMessageType('info');
        setSmsEnabled(true);
        if (onMessageSent) onMessageSent(response.data);
        onClose();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleDelayReport = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a reason for the delay');
      return;
    }

    const minutes = parseInt(delayMinutes) || 15;

    setLoading(true);
    try {
      const response = await api.post(`/driver/trips/${trip?._id}/delay`, {
        reason: message.trim(),
        estimatedDelayMinutes: minutes,
        sendSms: smsEnabled,
        tripName: trip?.routeName || 'School Bus'
      });
      
      if (response.data.success) {
        const smsMessage = smsEnabled ? ' Parents have been notified via SMS.' : '';
        Alert.alert('Success', `Delay reported to admin.${smsMessage}`);
        setMessage('');
        setDelayMinutes('15');
        setSmsEnabled(true);
        if (onMessageSent) onMessageSent(response.data);
        onClose();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to report delay');
      }
    } catch (error) {
      console.error('Error reporting delay:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to report delay');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholderText = () => {
    switch(messageType) {
      case 'delay':
        return 'Describe the reason for delay (e.g., traffic, mechanical issue, weather)...';
      case 'emergency':
        return 'Describe the emergency situation clearly...';
      case 'reminder':
        return 'Enter reminder message (e.g., pick up time, upcoming event)...';
      default:
        return 'Type your message here...';
    }
  };

  const getCharacterLimit = () => {
    return messageType === 'emergency' ? 300 : 500;
  };

  const handleMessageChange = (text) => {
    const limit = getCharacterLimit();
    if (text.length <= limit) {
      setMessage(text);
    } else {
      Alert.alert('Character Limit', `Message cannot exceed ${limit} characters for SMS delivery.`);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {student ? `Message Parent of ${student.firstName} ${student.lastName}` : 'Broadcast Message'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Message Type</Text>
            <View style={styles.typeContainer}>
              {messageTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeButton,
                    messageType === type.id && { backgroundColor: type.color, borderColor: type.color }
                  ]}
                  onPress={() => setMessageType(type.id)}
                >
                  <Ionicons 
                    name={type.icon} 
                    size={18} 
                    color={messageType === type.id ? '#fff' : type.color} 
                  />
                  <Text style={[
                    styles.typeText,
                    messageType === type.id && { color: '#fff' }
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Message</Text>
            <TextInput
              style={[styles.messageInput, messageType === 'emergency' && styles.emergencyInput]}
              multiline
              numberOfLines={4}
              placeholder={getPlaceholderText()}
              placeholderTextColor="#999"
              value={message}
              onChangeText={handleMessageChange}
              textAlignVertical="top"
            />
            <View style={styles.charCounter}>
              <Text style={styles.charCounterText}>
                {message.length}/{getCharacterLimit()} characters
              </Text>
            </View>

            {messageType === 'delay' && (
              <View style={styles.delayContainer}>
                <Text style={styles.delayLabel}>Estimated Delay (minutes)</Text>
                <View style={styles.delayOptions}>
                  {[5, 10, 15, 20, 30, 45, 60].map(min => (
                    <TouchableOpacity
                      key={min}
                      style={[
                        styles.delayOption,
                        delayMinutes === min.toString() && styles.delayOptionActive
                      ]}
                      onPress={() => setDelayMinutes(min.toString())}
                    >
                      <Text style={[
                        styles.delayOptionText,
                        delayMinutes === min.toString() && styles.delayOptionTextActive
                      ]}>
                        {min} min
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.smsToggleContainer}>
              <Text style={styles.smsToggleLabel}>Send SMS to parents</Text>
              <TouchableOpacity
                style={[styles.smsToggle, smsEnabled && styles.smsToggleActive]}
                onPress={() => setSmsEnabled(!smsEnabled)}
              >
                <View style={[styles.smsToggleHandle, smsEnabled && styles.smsToggleHandleActive]} />
              </TouchableOpacity>
            </View>

            {smsEnabled && (
              <View style={styles.smsInfo}>
                <Ionicons name="information-circle" size={14} color="#666" />
                <Text style={styles.smsInfoText}>
                  Parents will receive this message via SMS (TextBee) and in-app notification
                </Text>
              </View>
            )}

            {messageType === 'delay' && (
              <TouchableOpacity
                style={[styles.delayButton, loading && styles.disabledButton]}
                onPress={handleDelayReport}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="time" size={20} color="#fff" />
                    <Text style={styles.delayButtonText}>Report Delay & Notify Parents</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {messageType !== 'delay' && (
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendButton, loading && styles.disabledButton, getSendButtonColor()]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      {smsEnabled && <Ionicons name="chatbubble" size={16} color="#fff" />}
                      <Text style={styles.sendButtonText}>
                        {smsEnabled ? 'Send Message & SMS' : 'Send Message'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  function getSendButtonColor() {
    switch(messageType) {
      case 'emergency':
        return { backgroundColor: '#f44336' };
      case 'delay':
        return { backgroundColor: '#FF9800' };
      default:
        return { backgroundColor: '#2196F3' };
    }
  }
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  typeText: {
    fontSize: 12,
    color: '#666',
  },
  messageInput: {
    marginHorizontal: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    minHeight: 100,
    fontSize: 14,
    color: '#333',
  },
  emergencyInput: {
    borderColor: '#f44336',
    backgroundColor: '#fff5f5',
  },
  charCounter: {
    marginHorizontal: 16,
    marginTop: 4,
    alignItems: 'flex-end',
  },
  charCounterText: {
    fontSize: 10,
    color: '#999',
  },
  delayContainer: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  delayLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  delayOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  delayOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  delayOptionActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  delayOptionText: {
    fontSize: 12,
    color: '#666',
  },
  delayOptionTextActive: {
    color: '#fff',
  },
  smsToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 8,
  },
  smsToggleLabel: {
    fontSize: 14,
    color: '#333',
  },
  smsToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ccc',
    padding: 2,
  },
  smsToggleActive: {
    backgroundColor: '#4CAF50',
  },
  smsToggleHandle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  smsToggleHandleActive: {
    transform: [{ translateX: 22 }],
  },
  smsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  smsInfoText: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  delayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
  },
  delayButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});