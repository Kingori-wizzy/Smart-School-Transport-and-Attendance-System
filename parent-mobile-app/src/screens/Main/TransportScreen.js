import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

const RouteCard = ({ route, onPress, isSelected }) => (
  <TouchableOpacity
    style={[styles.routeCard, isSelected && styles.selectedRouteCard]}
    onPress={() => onPress(route)}
  >
    <View style={styles.routeHeader}>
      <Text style={styles.routeName}>{route.name}</Text>
      <View style={[styles.routeStatus, { backgroundColor: route.active ? '#4CAF50' : '#f44336' }]}>
        <Text style={styles.routeStatusText}>{route.active ? 'Active' : 'Inactive'}</Text>
      </View>
    </View>
    <Text style={styles.routeDescription}>{route.description}</Text>
    <View style={styles.routeDetails}>
      <Text style={styles.routeDetail}>🚌 {route.buses} buses</Text>
      <Text style={styles.routeDetail}>🕒 {route.duration} min</Text>
      <Text style={styles.routeDetail}>📍 {route.stops} stops</Text>
    </View>
  </TouchableOpacity>
);

const StopItem = ({ stop, index }) => (
  <View style={styles.stopItem}>
    <View style={styles.stopNumber}>
      <Text style={styles.stopNumberText}>{index + 1}</Text>
    </View>
    <View style={styles.stopInfo}>
      <Text style={styles.stopName}>{stop.name}</Text>
      <Text style={styles.stopAddress}>{stop.address}</Text>
      <Text style={styles.stopTime}>🕒 {stop.eta}</Text>
    </View>
    <View style={styles.stopMarker}>
      <Text style={styles.stopMarkerIcon}>📍</Text>
    </View>
  </View>
);

const ScheduleItem = ({ schedule }) => (
  <View style={styles.scheduleItem}>
    <View style={styles.scheduleTime}>
      <Text style={styles.scheduleTimeText}>{schedule.time}</Text>
      <Text style={styles.scheduleType}>{schedule.type}</Text>
    </View>
    <View style={styles.scheduleDetails}>
      <Text style={styles.scheduleBus}>Bus: {schedule.busNumber}</Text>
      <Text style={styles.scheduleDriver}>Driver: {schedule.driverName}</Text>
    </View>
    <View style={[styles.scheduleStatus, { backgroundColor: schedule.status === 'On Time' ? '#4CAF50' : '#FF9800' }]}>
      <Text style={styles.scheduleStatusText}>{schedule.status}</Text>
    </View>
  </View>
);

export default function TransportScreen({ navigation }) {
  const { user } = useAuth();
  const { isConnected } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [mapRegion, setMapRegion] = useState({
    latitude: -1.2864,
    longitude: 36.8172,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  useEffect(() => {
    loadTransportData();
  }, []);

  const loadTransportData = async () => {
    try {
      setLoading(true);
      
      const [routesData, scheduleData] = await Promise.all([
        api.transport.getRoutes().catch(() => null),
        api.transport.getSchedule(format(new Date(), 'yyyy-MM-dd')).catch(() => null)
      ]);

      if (routesData) {
        setRoutes(routesData);
        if (routesData.length > 0) {
          setSelectedRoute(routesData[0]);
          setRouteCoordinates(routesData[0].coordinates || []);
          if (routesData[0].stops) {
            setStops(routesData[0].stops);
          }
        }
      }
      
      if (scheduleData) setSchedule(scheduleData);
      
    } catch (error) {
      console.error('Error loading transport data:', error);
      Alert.alert('Error', 'Failed to load transport information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransportData();
    setRefreshing(false);
  };

  const handleRouteSelect = (route) => {
    setSelectedRoute(route);
    setRouteCoordinates(route.coordinates || []);
    setStops(route.stops || []);
    
    if (route.coordinates && route.coordinates.length > 0) {
      const lats = route.coordinates.map(c => c.latitude);
      const lngs = route.coordinates.map(c => c.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      
      setMapRegion({
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
        latitudeDelta: (maxLat - minLat) * 1.5,
        longitudeDelta: (maxLng - minLng) * 1.5,
      });
    }
  };

  const handleReportProblem = () => {
    Alert.alert(
      'Report Problem',
      'What type of issue would you like to report?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Late Bus', onPress: () => reportIssue('late') },
        { text: 'Missed Stop', onPress: () => reportIssue('missed') },
        { text: 'Driver Issue', onPress: () => reportIssue('driver') },
        { text: 'Safety Concern', onPress: () => reportIssue('safety'), style: 'destructive' },
      ]
    );
  };

  const reportIssue = async (type) => {
    try {
      await api.transport.reportProblem({
        type,
        routeId: selectedRoute?.id,
        timestamp: new Date().toISOString(),
      });
      Alert.alert('Report Submitted', 'Your report has been sent to the school.');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    }
  };

  const handleContactDriver = (busNumber) => {
    Alert.alert(
      'Contact Driver',
      `How would you like to contact driver of ${busNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Message', onPress: () => navigation.navigate('Messages', { conversationId: `driver-${busNumber}` }) },
        { text: 'Call', onPress: () => Alert.alert('Call', 'Calling driver...') },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading transport information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transport</Text>
        <TouchableOpacity onPress={handleReportProblem} style={styles.reportButton}>
          <Text style={styles.reportButtonText}>🚨</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Live Status</Text>
            <View style={[styles.connectionBadge, isConnected ? styles.connected : styles.disconnected]}>
              <Text style={styles.connectionText}>{isConnected ? '● Live' : '○ Offline'}</Text>
            </View>
          </View>
          <Text style={styles.statusMessage}>
            {isConnected ? 'All systems operational' : 'You are offline. Data may be outdated.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Routes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.routesScroll}>
            {routes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isSelected={selectedRoute?.id === route.id}
                onPress={handleRouteSelect}
              />
            ))}
          </ScrollView>
        </View>

        {selectedRoute && (
          <View style={styles.mapCard}>
            <Text style={styles.mapTitle}>{selectedRoute.name} Route Map</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                region={mapRegion}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                {routeCoordinates.length > 1 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={COLORS.primary}
                    strokeWidth={4}
                  />
                )}
                {stops.map((stop, index) => (
                  <Marker
                    key={stop.id}
                    coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                    title={stop.name}
                    description={stop.address}
                  >
                    <View style={styles.mapMarker}>
                      <Text style={styles.mapMarkerText}>{index + 1}</Text>
                    </View>
                  </Marker>
                ))}
              </MapView>
            </View>
            <TouchableOpacity
              style={styles.viewFullMapButton}
              onPress={() => navigation.navigate('Tracking', { route: selectedRoute })}
            >
              <Text style={styles.viewFullMapText}>View Full Map →</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectedRoute && stops.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bus Stops</Text>
            {stops.map((stop, index) => (
              <StopItem key={stop.id} stop={stop} index={index} />
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {schedule.map((item) => (
            <ScheduleItem key={item.id} schedule={item} />
          ))}
        </View>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Need to contact a driver?</Text>
          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => navigation.navigate('Messages')}
            >
              <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.contactGradient}>
                <Text style={styles.contactIcon}>💬</Text>
                <Text style={styles.contactText}>Message</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleReportProblem}
            >
              <LinearGradient colors={['#f44336', '#d32f2f']} style={styles.contactGradient}>
                <Text style={styles.contactIcon}>🚨</Text>
                <Text style={styles.contactText}>Report</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  reportButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  reportButtonText: { fontSize: 20 },
  statusCard: { backgroundColor: '#fff', margin: 15, padding: 15, borderRadius: 10, elevation: 2 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  connectionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  connected: { backgroundColor: '#4CAF50' },
  disconnected: { backgroundColor: '#f44336' },
  connectionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  statusMessage: { fontSize: 13, color: '#666' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginHorizontal: 15, marginBottom: 10 },
  routesScroll: { paddingLeft: 15 },
  routeCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginRight: 10, width: 250, elevation: 2 },
  selectedRouteCard: { borderWidth: 2, borderColor: COLORS.primary },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  routeName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  routeStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  routeStatusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  routeDescription: { fontSize: 12, color: '#666', marginBottom: 8 },
  routeDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  routeDetail: { fontSize: 11, color: '#999' },
  mapCard: { backgroundColor: '#fff', margin: 15, marginTop: 0, padding: 15, borderRadius: 10, elevation: 2 },
  mapTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  mapContainer: { height: 200, borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  map: { flex: 1 },
  mapMarker: { backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  mapMarkerText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  viewFullMapButton: { alignItems: 'center', padding: 8 },
  viewFullMapText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  stopItem: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 8, padding: 12, borderRadius: 10, alignItems: 'center', elevation: 1 },
  stopNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  stopNumberText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 2 },
  stopAddress: { fontSize: 12, color: '#666', marginBottom: 2 },
  stopTime: { fontSize: 11, color: '#999' },
  stopMarker: { marginLeft: 8 },
  stopMarkerIcon: { fontSize: 20 },
  scheduleItem: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 8, padding: 12, borderRadius: 10, alignItems: 'center', elevation: 1 },
  scheduleTime: { width: 70 },
  scheduleTimeText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  scheduleType: { fontSize: 10, color: '#666' },
  scheduleDetails: { flex: 1, marginLeft: 12 },
  scheduleBus: { fontSize: 13, fontWeight: '500', color: '#333', marginBottom: 2 },
  scheduleDriver: { fontSize: 11, color: '#666' },
  scheduleStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginLeft: 8 },
  scheduleStatusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  contactSection: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 10, alignItems: 'center', elevation: 2 },
  contactTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 15 },
  contactButtons: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  contactButton: { flex: 0.45, borderRadius: 8, overflow: 'hidden' },
  contactGradient: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  contactIcon: { fontSize: 20, marginBottom: 4 },
  contactText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});