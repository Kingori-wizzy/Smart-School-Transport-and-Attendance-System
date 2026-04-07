import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function TripScreen({ route, navigation }) {
  const { trip: initialTrip } = route.params || {};
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [trip, setTrip] = useState(initialTrip);
  const [students, setStudents] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalStudents: 0,
    boarded: 0,
    alighted: 0,
    remaining: 0,
    progress: 0,
  });
  
  // Messaging state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Delay report state
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [delayMinutes, setDelayMinutes] = useState('15');
  const [sendingDelay, setSendingDelay] = useState(false);
  
  const locationWatcher = useRef(null);
  let socketRef = useRef(null);

  useEffect(() => {
    if (!trip || !trip._id) {
      Alert.alert('Error', 'No trip data available');
      navigation.goBack();
      return;
    }
    loadTripData();
    startLocationTracking();
    setupSocketConnection();

    return () => {
      if (locationWatcher.current) {
        locationWatcher.current.remove();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const setupSocketConnection = () => {
    try {
      const { io } = require('socket.io-client');
      socketRef.current = io('http://localhost:5000', {
        transports: ['websocket'],
        auth: { token: user?.token }
      });
      
      socketRef.current.on('connect', () => {
        console.log('Socket connected for trip');
        socketRef.current.emit('join-trip', trip._id);
      });
      
      socketRef.current.on(`student-boarded-${trip._id}`, (data) => {
        console.log('Student boarded event:', data);
        loadTripData(); // Refresh the list
      });
      
      socketRef.current.on(`student-alighted-${trip._id}`, (data) => {
        console.log('Student alighted event:', data);
        loadTripData(); // Refresh the list
      });
    } catch (error) {
      console.error('Socket setup error:', error);
    }
  };

  const loadTripData = async () => {
    try {
      setLoading(true);
      
      const response = await api.get(`/driver/trips/${trip._id}/students`);
      console.log('Students response:', response.data);
      
      const studentsData = response.data?.data || [];
      setStudents(studentsData);
      calculateStats(studentsData);
      
    } catch (error) {
      console.error('Error loading trip students:', error);
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (studentsList) => {
    const boarded = studentsList.filter(s => s.status === 'boarded' || s.boarded).length;
    const alighted = studentsList.filter(s => s.status === 'alighted' || s.alighted).length;
    
    setStats({
      totalStudents: studentsList.length,
      boarded,
      alighted,
      remaining: studentsList.length - boarded,
      progress: studentsList.length > 0 ? (boarded / studentsList.length) * 100 : 0,
    });
  };

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      locationWatcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 20,
        },
        (newLocation) => {
          setLocation(newLocation);
          if (trip && trip._id) {
            updateLocation(trip._id, newLocation.coords);
          }
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const updateLocation = async (tripId, coords) => {
    try {
      await api.post('/driver/gps/update', {
        tripId,
        lat: coords.latitude,
        lon: coords.longitude,
        speed: coords.speed || 0,
        heading: coords.heading || 0
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  // This will auto-send SMS and Push notification to parent
  const handleBoardStudent = async (student) => {
    Alert.alert(
      'Confirm Boarding',
      `Confirm ${student.firstName} ${student.lastName} has boarded? Parent will be notified automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Boarding',
          onPress: async () => {
            try {
              const response = await api.post(`/driver/trips/${trip._id}/board/${student._id}`, {
                method: 'manual',
                location: location ? {
                  lat: location.coords.latitude,
                  lng: location.coords.longitude
                } : null,
                timestamp: new Date().toISOString()
              });
              
              if (response.data.success) {
                const updatedStudents = students.map(s =>
                  s._id === student._id ? { ...s, status: 'boarded', boarded: true } : s
                );
                setStudents(updatedStudents);
                calculateStats(updatedStudents);
                Alert.alert('Success', `${student.firstName} boarded. Parent notified via SMS and push notification.`);
              } else {
                Alert.alert('Error', response.data.message || 'Failed to record boarding');
              }
            } catch (error) {
              console.error('Error boarding student:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to record boarding');
            }
          }
        },
      ]
    );
  };

  // This will auto-send SMS and Push notification to parent
  const handleAlightStudent = async (student) => {
    Alert.alert(
      'Confirm Alighting',
      `Confirm ${student.firstName} ${student.lastName} has alighted? Parent will be notified automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Alighting',
          onPress: async () => {
            try {
              const response = await api.post(`/driver/trips/${trip._id}/alight/${student._id}`, {
                method: 'manual',
                location: location ? {
                  lat: location.coords.latitude,
                  lng: location.coords.longitude
                } : null,
                timestamp: new Date().toISOString()
              });
              
              if (response.data.success) {
                const updatedStudents = students.map(s =>
                  s._id === student._id ? { ...s, status: 'alighted', alighted: true } : s
                );
                setStudents(updatedStudents);
                calculateStats(updatedStudents);
                Alert.alert('Success', `${student.firstName} alighted. Parent notified via SMS and push notification.`);
              } else {
                Alert.alert('Error', response.data.message || 'Failed to record alighting');
              }
            } catch (error) {
              console.error('Error alighting student:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to record alighting');
            }
          }
        },
      ]
    );
  };

  const handleStartTrip = async () => {
    Alert.alert(
      'Start Trip',
      'Are you sure you want to start this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Trip',
          onPress: async () => {
            try {
              const response = await api.post(`/driver/trips/${trip._id}/start`);
              if (response.data.success) {
                setTrip({ ...trip, status: 'in-progress' });
                Alert.alert('Success', 'Trip started successfully');
              } else {
                Alert.alert('Error', response.data.message || 'Failed to start trip');
              }
            } catch (error) {
              console.error('Error starting trip:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to start trip');
            }
          }
        },
      ]
    );
  };

  const handleEndTrip = async () => {
    Alert.alert(
      'End Trip',
      'Are you sure you want to end this trip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Trip',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.post(`/driver/trips/${trip._id}/end`);
              if (response.data.success) {
                Alert.alert('Success', 'Trip ended successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', response.data.message || 'Failed to end trip');
              }
            } catch (error) {
              console.error('Error ending trip:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to end trip');
            }
          }
        },
      ]
    );
  };

  const handleEmergency = () => {
    navigation.navigate('SOS', { trip });
  };

  const handleScanQR = () => {
    navigation.navigate('QRScan', { tripId: trip._id });
  };

  const handleViewRoute = () => {
    navigation.navigate('Navigation', { tripId: trip._id });
  };

  const handleOpenMessageModal = (student = null) => {
    setSelectedStudent(student);
    setMessageText('');
    setMessageType('info');
    setShowMessageModal(true);
  };

  const handleOpenDelayModal = () => {
    setDelayReason('');
    setDelayMinutes('15');
    setShowDelayModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSendingMessage(true);
    try {
      let endpoint;
      let payload;

      if (selectedStudent) {
        endpoint = `/driver/message/parent/${selectedStudent._id}`;
        payload = {
          message: messageText,
          type: messageType,
          tripId: trip._id
        };
      } else {
        endpoint = `/driver/message/broadcast/${trip._id}`;
        payload = {
          message: messageText,
          type: messageType
        };
      }

      const response = await api.post(endpoint, payload);
      
      if (response.data.success) {
        Alert.alert('Success', `Message sent to ${selectedStudent ? `${selectedStudent.firstName}'s parent` : 'all parents'}`);
        setShowMessageModal(false);
        setMessageText('');
        setSelectedStudent(null);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReportDelay = async () => {
    if (!delayReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for the delay');
      return;
    }

    setSendingDelay(true);
    try {
      const response = await api.post(`/driver/trips/${trip._id}/delay`, {
        reason: delayReason,
        estimatedDelayMinutes: parseInt(delayMinutes)
      });
      
      if (response.data.success) {
        Alert.alert('Success', 'Delay reported to admin');
        setShowDelayModal(false);
        setDelayReason('');
      } else {
        Alert.alert('Error', response.data.message || 'Failed to report delay');
      }
    } catch (error) {
      console.error('Error reporting delay:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to report delay');
    } finally {
      setSendingDelay(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTripData();
    setRefreshing(false);
  };

  const getStudentStatus = (student) => {
    if (student.status === 'alighted') return 'alighted';
    if (student.status === 'boarded') return 'boarded';
    return 'pending';
  };

  const StudentItem = ({ student }) => {
    const status = getStudentStatus(student);
    
    return (
      <View style={[styles.studentItem, { borderBottomColor: colors.border || '#eee' }]}>
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, { color: colors.text || '#333' }]}>
            {student.firstName} {student.lastName}
          </Text>
          <Text style={[styles.studentDetails, { color: colors.textSecondary || '#666' }]}>
            Class: {student.classLevel} | ID: {student.admissionNumber}
          </Text>
          {student.pickupPoint && (
            <Text style={[styles.studentDetails, { color: colors.textSecondary || '#666' }]}>
              Pickup: {student.pickupPoint}
            </Text>
          )}
        </View>
        
        <View style={styles.studentActions}>
          <TouchableOpacity
            style={[styles.messageButton, { backgroundColor: colors.secondary || '#9C27B0' }]}
            onPress={() => handleOpenMessageModal(student)}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#fff" />
          </TouchableOpacity>
          
          {status === 'boarded' ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.success || '#4CAF50' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.statusBadgeText}>Boarded</Text>
            </View>
          ) : status === 'alighted' ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.warning || '#FF9800' }]}>
              <Ionicons name="flag" size={14} color="#fff" />
              <Text style={styles.statusBadgeText}>Alighted</Text>
            </View>
          ) : (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary || '#2196F3' }]}
                onPress={() => handleBoardStudent(student)}
              >
                <Ionicons name="log-in-outline" size={14} color="#fff" />
                <Text style={styles.actionButtonText}>Board</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.warning || '#FF9800' }]}
                onPress={() => handleAlightStudent(student)}
              >
                <Ionicons name="log-out-outline" size={14} color="#fff" />
                <Text style={styles.actionButtonText}>Alight</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background || '#f5f5f5' }]}>
        <ActivityIndicator size="large" color={colors.primary || '#2196F3'} />
        <Text style={[styles.loadingText, { color: colors.textSecondary || '#666' }]}>
          Loading trip details...
        </Text>
      </View>
    );
  }

  const busNumber = trip.busNumber || trip.vehicleId || 'N/A';
  const isTripActive = trip.status === 'in-progress' || trip.status === 'running';
  const isTripScheduled = trip.status === 'scheduled';
  const hasPendingStudents = stats.remaining > 0;

  const messageTypes = [
    { id: 'info', label: 'Information', icon: 'information-circle', color: '#2196F3' },
    { id: 'delay', label: 'Delay Update', icon: 'time', color: '#FF9800' },
    { id: 'reminder', label: 'Reminder', icon: 'notifications', color: '#4CAF50' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#f5f5f5' }]}>
      <LinearGradient colors={[colors.primary || '#2196F3', colors.secondary || '#1976D2']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{trip.routeName || 'Trip'}</Text>
          <TouchableOpacity onPress={handleEmergency} style={styles.emergencyButton}>
            <Ionicons name="alert-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.tripMeta}>
          <Text style={styles.tripMetaText}>
            {trip.tripType === 'morning' ? 'Morning' : 'Evening'} Trip
          </Text>
          <Text style={styles.tripMetaText}>
            Bus: {busNumber}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Trip Progress */}
        <View style={[styles.progressCard, { backgroundColor: colors.card || '#fff' }]}>
          <Text style={[styles.progressTitle, { color: colors.text || '#333' }]}>Trip Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${stats.progress}%`, backgroundColor: colors.primary || '#2196F3' }]} />
          </View>
          <View style={styles.progressStats}>
            <Text style={[styles.progressStat, { color: colors.textSecondary || '#666' }]}>
              Boarded: {stats.boarded}/{stats.totalStudents}
            </Text>
            <Text style={[styles.progressStat, { color: colors.textSecondary || '#666' }]}>
              Alighted: {stats.alighted}
            </Text>
            <Text style={[styles.progressStat, { color: colors.textSecondary || '#666' }]}>
              Remaining: {stats.remaining}
            </Text>
            <Text style={[styles.progressStat, { color: colors.textSecondary || '#666' }]}>
              Time: {format(new Date(), 'HH:mm')}
            </Text>
          </View>
        </View>

        {/* Trip Details */}
        <View style={[styles.detailsCard, { backgroundColor: colors.card || '#fff' }]}>
          <Text style={[styles.detailsTitle, { color: colors.text || '#333' }]}>Trip Details</Text>
          <View style={[styles.detailRow, { borderBottomColor: colors.border || '#eee' }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary || '#666' }]}>Start Time:</Text>
            <Text style={[styles.detailValue, { color: colors.text || '#333' }]}>
              {trip.scheduledStartTime ? format(new Date(trip.scheduledStartTime), 'HH:mm') : 'N/A'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border || '#eee' }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary || '#666' }]}>End Time:</Text>
            <Text style={[styles.detailValue, { color: colors.text || '#333' }]}>
              {trip.scheduledEndTime ? format(new Date(trip.scheduledEndTime), 'HH:mm') : 'N/A'}
            </Text>
          </View>
          <View style={[styles.detailRow, { borderBottomColor: colors.border || '#eee' }]}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary || '#666' }]}>Status:</Text>
            <View style={[styles.statusChip, { 
              backgroundColor: isTripActive ? colors.success || '#4CAF50' : 
                             isTripScheduled ? colors.warning || '#FF9800' : 
                             colors.textSecondary || '#999' 
            }]}>
              <Text style={styles.statusChipText}>{trip.status || 'scheduled'}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.mainActionButton, { backgroundColor: colors.primary || '#2196F3' }]}
            onPress={handleScanQR}
          >
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
            <Text style={styles.mainActionText}>Scan QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainActionButton, { backgroundColor: '#9C27B0' }]}
            onPress={() => handleOpenMessageModal()}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.mainActionText}>Broadcast</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainActionButton, { backgroundColor: '#FF9800' }]}
            onPress={handleOpenDelayModal}
          >
            <Ionicons name="time-outline" size={20} color="#fff" />
            <Text style={styles.mainActionText}>Report Delay</Text>
          </TouchableOpacity>

          {isTripActive && hasPendingStudents && (
            <TouchableOpacity
              style={[styles.mainActionButton, { backgroundColor: colors.success || '#4CAF50' }]}
              onPress={handleViewRoute}
            >
              <Ionicons name="map-outline" size={20} color="#fff" />
              <Text style={styles.mainActionText}>View Route</Text>
            </TouchableOpacity>
          )}

          {isTripScheduled && (
            <TouchableOpacity
              style={[styles.mainActionButton, { backgroundColor: colors.success || '#4CAF50' }]}
              onPress={handleStartTrip}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.mainActionText}>Start Trip</Text>
            </TouchableOpacity>
          )}

          {isTripActive && (
            <TouchableOpacity
              style={[styles.mainActionButton, { backgroundColor: colors.danger || '#f44336' }]}
              onPress={handleEndTrip}
            >
              <Ionicons name="stop" size={20} color="#fff" />
              <Text style={styles.mainActionText}>End Trip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Students List */}
        <View style={[styles.studentsCard, { backgroundColor: colors.card || '#fff' }]}>
          <Text style={[styles.studentsTitle, { color: colors.text || '#333' }]}>
            Students ({stats.totalStudents})
          </Text>
          
          {students.length > 0 ? (
            students.map(student => (
              <StudentItem key={student._id} student={student} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={50} color={colors.textSecondary || '#666'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary || '#666' }]}>
                No students assigned to this trip
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Message Modal */}
      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card || '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text || '#333' }]}>
                {selectedStudent ? `Message ${selectedStudent.firstName}'s Parent` : 'Broadcast Message'}
              </Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary || '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={[styles.modalLabel, { color: colors.textSecondary || '#666' }]}>Message Type</Text>
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

              <Text style={[styles.modalLabel, { color: colors.textSecondary || '#666' }]}>Message</Text>
              <TextInput
                style={[styles.messageInput, { 
                  backgroundColor: colors.background || '#f5f5f5',
                  color: colors.text || '#333',
                  borderColor: colors.border || '#ddd'
                }]}
                multiline
                numberOfLines={4}
                placeholder="Type your message here..."
                placeholderTextColor={colors.textSecondary || '#999'}
                value={messageText}
                onChangeText={setMessageText}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: colors.border || '#ddd' }]}
                  onPress={() => setShowMessageModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary || '#666' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSendButton, { backgroundColor: colors.primary || '#2196F3' }]}
                  onPress={handleSendMessage}
                  disabled={sendingMessage}
                >
                  {sendingMessage ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSendText}>Send Message</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delay Report Modal */}
      <Modal
        visible={showDelayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDelayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card || '#fff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text || '#333' }]}>Report Delay</Text>
              <TouchableOpacity onPress={() => setShowDelayModal(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary || '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={[styles.modalLabel, { color: colors.textSecondary || '#666' }]}>Reason for Delay</Text>
              <TextInput
                style={[styles.messageInput, { 
                  backgroundColor: colors.background || '#f5f5f5',
                  color: colors.text || '#333',
                  borderColor: colors.border || '#ddd'
                }]}
                multiline
                numberOfLines={3}
                placeholder="e.g., Heavy traffic, mechanical issue, etc."
                placeholderTextColor={colors.textSecondary || '#999'}
                value={delayReason}
                onChangeText={setDelayReason}
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary || '#666' }]}>Estimated Delay (minutes)</Text>
              <TextInput
                style={[styles.delayInput, { 
                  backgroundColor: colors.background || '#f5f5f5',
                  color: colors.text || '#333',
                  borderColor: colors.border || '#ddd'
                }]}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={colors.textSecondary || '#999'}
                value={delayMinutes}
                onChangeText={setDelayMinutes}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: colors.border || '#ddd' }]}
                  onPress={() => setShowDelayModal(false)}
                >
                  <Text style={[styles.modalCancelText, { color: colors.textSecondary || '#666' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSendButton, { backgroundColor: '#FF9800' }]}
                  onPress={handleReportDelay}
                  disabled={sendingDelay}
                >
                  {sendingDelay ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSendText}>Report Delay</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'center' },
  emergencyButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(244,67,54,0.3)', justifyContent: 'center', alignItems: 'center' },
  tripMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 },
  tripMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  scrollContent: { paddingBottom: 20 },
  progressCard: { margin: 15, padding: 15, borderRadius: 10, elevation: 2 },
  progressTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  progressBar: { height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressStats: { marginTop: 10, gap: 5 },
  progressStat: { fontSize: 13 },
  detailsCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  detailsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '500' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginHorizontal: 15, marginBottom: 15, gap: 10 },
  mainActionButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, minWidth: 90 },
  mainActionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  studentsCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  studentsTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  studentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  studentDetails: { fontSize: 12, marginBottom: 2 },
  studentActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  messageButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15, gap: 3 },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  actionButtons: { flexDirection: 'row', gap: 5 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15, gap: 3 },
  actionButtonText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  emptyText: { marginTop: 10, fontSize: 14, textAlign: 'center' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxHeight: '80%', borderRadius: 12, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 4 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8, marginHorizontal: 16 },
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  typeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  typeText: { fontSize: 12, color: '#666' },
  messageInput: { marginHorizontal: 16, padding: 12, borderWidth: 1, borderRadius: 8, minHeight: 100, fontSize: 14 },
  delayInput: { marginHorizontal: 16, padding: 12, borderWidth: 1, borderRadius: 8, fontSize: 14 },
  modalButtons: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#eee', marginTop: 16 },
  modalCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '500' },
  modalSendButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalSendText: { color: '#fff', fontSize: 16, fontWeight: '500' },
});