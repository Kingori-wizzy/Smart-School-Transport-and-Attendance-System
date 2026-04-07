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

  const messageTypes = [
    { id: 'info', label: 'Information', icon: 'information-circle', color: '#2196F3' },
    { id: 'delay', label: 'Delay Update', icon: 'time', color: '#FF9800' },
    { id: 'emergency', label: 'Emergency Alert', icon: 'alert-circle', color: '#f44336' },
    { id: 'reminder', label: 'Reminder', icon: 'notifications', color: '#4CAF50' },
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
        endpoint = `/driver/message/parent/${student._id}`;
        payload = { message, type: messageType, tripId: trip._id };
      } else {
        endpoint = `/driver/message/broadcast/${trip._id}`;
        payload = { message, type: messageType };
      }

      const response = await api.post(endpoint, payload);
      
      if (response.data.success) {
        Alert.alert('Success', 'Message sent successfully');
        setMessage('');
        if (onMessageSent) onMessageSent();
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

    setLoading(true);
    try {
      const response = await api.post(`/driver/trips/${trip._id}/delay`, {
        reason: message,
        estimatedDelayMinutes: 15
      });
      
      if (response.data.success) {
        Alert.alert('Success', 'Delay reported to admin. Parents will be notified.');
        setMessage('');
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
                    messageType === type.id && { backgroundColor: type.color }
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
              style={styles.messageInput}
              multiline
              numberOfLines={4}
              placeholder="Type your message here..."
              placeholderTextColor="#999"
              value={message}
              onChangeText={setMessage}
              textAlignVertical="top"
            />

            {messageType === 'delay' && (
              <TouchableOpacity
                style={styles.delayButton}
                onPress={handleDelayReport}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.delayButtonText}>Report Delay</Text>
                )}
              </TouchableOpacity>
            )}

            {messageType !== 'delay' && (
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sendButton, loading && styles.disabledButton]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send Message</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
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
    maxHeight: '80%',
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
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  delayButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    alignItems: 'center',
  },
  delayButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});