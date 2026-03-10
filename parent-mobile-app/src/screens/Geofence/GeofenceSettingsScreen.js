import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Circle, Marker, Polygon } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import * as Location from 'expo-location';

const GeofenceCard = ({ geofence, onToggle, onEdit, onDelete, colors }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'school': return '🏫';
      case 'home': return '🏠';
      case 'bus-stop': return '🚏';
      case 'no-go': return '🚫';
      default: return '📍';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'school': return '#4CAF50';
      case 'home': return '#2196F3';
      case 'bus-stop': return '#FF9800';
      case 'no-go': return '#f44336';
      default: return '#999';
    }
  };

  return (
    <View style={[styles.geofenceCard, { backgroundColor: colors.card }]}>
      <View style={styles.geofenceHeader}>
        <View style={styles.geofenceTitleContainer}>
          <Text style={[styles.geofenceIcon, { color: getTypeColor(geofence.type) }]}>
            {getTypeIcon(geofence.type)}
          </Text>
          <View>
            <Text style={[styles.geofenceName, { color: colors.text }]}>
              {geofence.name}
            </Text>
            <Text style={[styles.geofenceType, { color: colors.textSecondary }]}>
              {geofence.type.replace('-', ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <Switch
          value={geofence.enabled}
          onValueChange={() => onToggle(geofence)}
          trackColor={{ false: '#ddd', true: colors.primary }}
        />
      </View>

      <View style={styles.geofenceDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Radius</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{geofence.radius}m</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Latitude</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {geofence.latitude.toFixed(6)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Longitude</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {geofence.longitude.toFixed(6)}
          </Text>
        </View>
      </View>

      <View style={styles.geofenceActions}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.primary }]}
          onPress={() => onEdit(geofence)}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.danger }]}
          onPress={() => onDelete(geofence)}
        >
          <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AddGeofenceModal = ({ visible, onClose, onSave, colors, initialLocation }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [type, setType] = useState('home');
  const [radius, setRadius] = useState('100');
  const [location, setLocation] = useState(initialLocation);
  const [isPlacingMarker, setIsPlacingMarker] = useState(false);

  const types = [
    { id: 'home', label: 'Home', icon: '🏠', color: '#2196F3' },
    { id: 'school', label: 'School', icon: '🏫', color: '#4CAF50' },
    { id: 'bus-stop', label: 'Bus Stop', icon: '🚏', color: '#FF9800' },
    { id: 'no-go', label: 'No-Go Zone', icon: '🚫', color: '#f44336' },
  ];

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for this zone');
      return;
    }
    if (!location) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }

    onSave({
      name,
      type,
      radius: parseInt(radius),
      latitude: location.latitude,
      longitude: location.longitude,
      enabled: true,
    });
  };

  const handleMapPress = (event) => {
    if (step === 2) {
      setLocation(event.nativeEvent.coordinate);
      setIsPlacingMarker(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {step === 1 ? 'Select Zone Type' : 'Place on Map'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {step === 1 ? (
          <ScrollView>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Choose the type of geofence you want to create:
            </Text>
            
            {types.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeOption,
                  type === t.id && { borderColor: t.color, borderWidth: 2 },
                ]}
                onPress={() => setType(t.id)}
              >
                <Text style={styles.typeIcon}>{t.icon}</Text>
                <Text style={[styles.typeLabel, { color: colors.text }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Zone Name</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                placeholder="e.g., My Home, School Gate"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Radius (meters)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text
                }]}
                placeholder="100"
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={() => setStep(2)}
            >
              <Text style={styles.nextButtonText}>Next: Place on Map →</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <View style={styles.mapStep}>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: location?.latitude || 0,
                  longitude: location?.longitude || 0,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={handleMapPress}
              >
                {location && (
                  <>
                    <Marker coordinate={location} pinColor={colors.primary} />
                    <Circle
                      center={location}
                      radius={parseInt(radius)}
                      strokeColor={colors.primary}
                      fillColor={`${colors.primary}20`}
                    />
                  </>
                )}
              </MapView>
            </View>

            <TouchableOpacity
              style={[styles.placeButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsPlacingMarker(true)}
            >
              <Text style={styles.placeButtonText}>
                {isPlacingMarker ? 'Tap on map to place' : 'Place Marker'}
              </Text>
            </TouchableOpacity>

            <View style={styles.mapActions}>
              <TouchableOpacity
                style={[styles.mapActionButton, { borderColor: colors.border }]}
                onPress={() => setStep(1)}
              >
                <Text style={[styles.mapActionText, { color: colors.text }]}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mapActionButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
              >
                <Text style={styles.mapActionText}>Save Zone</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default function GeofenceSettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [geofences, setGeofences] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    loadGeofences();
    getCurrentLocation();
  }, []);

  const loadGeofences = async () => {
    try {
      const data = await api.geofence.getUserGeofences();
      setGeofences(data);
    } catch (error) {
      console.error('Error loading geofences:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleToggleGeofence = async (geofence) => {
    try {
      await api.geofence.update(geofence.id, {
        ...geofence,
        enabled: !geofence.enabled,
      });
      setGeofences(prev =>
        prev.map(g => g.id === geofence.id ? { ...g, enabled: !g.enabled } : g)
      );
    } catch (error) {
      console.error('Error toggling geofence:', error);
      Alert.alert('Error', 'Failed to update geofence');
    }
  };

  const handleEditGeofence = (geofence) => {
    // Navigate to edit screen or open modal
    Alert.alert('Edit', `Edit ${geofence.name}`);
  };

  const handleDeleteGeofence = (geofence) => {
    Alert.alert(
      'Delete Geofence',
      `Are you sure you want to delete "${geofence.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.geofence.delete(geofence.id);
              setGeofences(prev => prev.filter(g => g.id !== geofence.id));
            } catch (error) {
              console.error('Error deleting geofence:', error);
              Alert.alert('Error', 'Failed to delete geofence');
            }
          },
        },
      ]
    );
  };

  const handleAddGeofence = async (newGeofence) => {
    try {
      const created = await api.geofence.create(newGeofence);
      setGeofences(prev => [...prev, created]);
      setShowAddModal(false);
      Alert.alert('Success', 'Geofence created successfully');
    } catch (error) {
      console.error('Error creating geofence:', error);
      Alert.alert('Error', 'Failed to create geofence');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading geofences...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Geofence Alerts</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
          <Text style={styles.addButtonIcon}>+</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>About Geofences</Text>
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Geofences create virtual boundaries. You'll receive alerts when your child's bus enters or exits these zones.
          </Text>
        </View>

        {geofences.length > 0 ? (
          geofences.map(geofence => (
            <GeofenceCard
              key={geofence.id}
              geofence={geofence}
              onToggle={handleToggleGeofence}
              onEdit={handleEditGeofence}
              onDelete={handleDeleteGeofence}
              colors={colors}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>📍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Geofences</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              You haven't set up any geofences yet. Add your first zone to start receiving location-based alerts.
            </Text>
            <TouchableOpacity
              style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addFirstButtonText}>+ Add Your First Geofence</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AddGeofenceModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddGeofence}
        colors={colors}
        initialLocation={currentLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  addButtonIcon: { fontSize: 20, color: '#fff' },
  content: { padding: 15 },
  infoCard: { padding: 15, borderRadius: 10, marginBottom: 15 },
  infoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  infoText: { fontSize: 13, lineHeight: 18 },
  geofenceCard: { padding: 15, borderRadius: 10, marginBottom: 10 },
  geofenceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  geofenceTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  geofenceIcon: { fontSize: 24, marginRight: 10 },
  geofenceName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  geofenceType: { fontSize: 11 },
  geofenceDetails: { marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { fontSize: 12 },
  detailValue: { fontSize: 12, fontWeight: '500' },
  geofenceActions: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  actionButton: { flex: 1, marginHorizontal: 5, paddingVertical: 8, borderWidth: 1, borderRadius: 6, alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  addFirstButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  addFirstButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '90%', maxHeight: '80%', borderRadius: 10, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalClose: { fontSize: 20, padding: 5 },
  modalSubtitle: { fontSize: 13, marginBottom: 15 },
  typeOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 8 },
  typeIcon: { fontSize: 20, marginRight: 10 },
  typeLabel: { fontSize: 14, fontWeight: '500' },
  inputContainer: { marginBottom: 15 },
  inputLabel: { fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  nextButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  nextButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  mapStep: { flex: 1 },
  mapContainer: { height: 300, borderRadius: 8, overflow: 'hidden', marginBottom: 10 },
  map: { flex: 1 },
  placeButton: { padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  placeButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  mapActions: { flexDirection: 'row', justifyContent: 'space-between' },
  mapActionButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5, borderWidth: 1 },
  mapActionText: { fontSize: 14, fontWeight: '600' },
});