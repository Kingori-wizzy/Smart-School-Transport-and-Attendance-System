import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

const StopMarker = ({ stop, index, colors }) => (
  <Marker
    coordinate={{
      latitude: stop.latitude,
      longitude: stop.longitude,
    }}
    title={stop.name}
    description={`Stop ${index + 1}`}
  >
    <View style={[styles.stopMarker, { backgroundColor: colors.primary }]}>
      <Text style={styles.stopMarkerText}>{index + 1}</Text>
    </View>
  </Marker>
);

const TimelineItem = ({ event, isLast, colors }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineLeft}>
      <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
      {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
    </View>
    <View style={[styles.timelineContent, { backgroundColor: colors.card }]}>
      <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>
        {format(new Date(event.timestamp), 'HH:mm')}
      </Text>
      <Text style={[styles.timelineTitle, { color: colors.text }]}>
        {event.title}
      </Text>
      {event.description && (
        <Text style={[styles.timelineDescription, { color: colors.textSecondary }]}>
          {event.description}
        </Text>
      )}
      {event.location && (
        <Text style={[styles.timelineLocation, { color: colors.textSecondary }]}>
          📍 {event.location}
        </Text>
      )}
    </View>
  </View>
);

export default function RouteDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { tripId } = route.params;
  
  const mapRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [stops, setStops] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);

  useEffect(() => {
    loadTripDetails();
  }, []);

  const loadTripDetails = async () => {
    try {
      const tripData = await api.trips.getById(tripId);
      setTrip(tripData);

      // Load route coordinates
      const coordinates = await api.trips.getRouteCoordinates(tripData.routeId);
      setRouteCoordinates(coordinates);

      // Load stops
      const stopsData = await api.trips.getStops(tripData.routeId);
      setStops(stopsData);

      // Load timeline events
      const eventsData = await api.trips.getTimeline(tripId);
      setEvents(eventsData);

      // Set initial map region
      if (coordinates.length > 0) {
        setMapRegion({
          latitude: coordinates[0].latitude,
          longitude: coordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }
    } catch (error) {
      console.error('Error loading trip details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fitMapToRoute = () => {
    if (mapRef.current && routeCoordinates.length > 0) {
      mapRef.current.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#f44336';
      case 'in-progress': return '#FF9800';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading route details...
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
        <Text style={styles.headerTitle}>Route Details</Text>
        <TouchableOpacity onPress={fitMapToRoute} style={styles.fitButton}>
          <Text style={styles.fitButtonIcon}>📍</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.mapContainer, { backgroundColor: colors.card }]}>
          {mapRegion && (
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={mapRegion}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={true}
              showsScale={true}
            >
              {routeCoordinates.length > 0 && (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor={colors.primary}
                  strokeWidth={3}
                />
              )}
              {stops.map((stop, index) => (
                <StopMarker
                  key={stop.id}
                  stop={stop}
                  index={index}
                  colors={colors}
                />
              ))}
            </MapView>
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <View style={styles.routeHeader}>
            <Text style={[styles.routeName, { color: colors.text }]}>
              {trip.routeName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
              <Text style={styles.statusText}>{trip.status}</Text>
            </View>
          </View>

          <View style={styles.driverInfo}>
            <Text style={[styles.driverName, { color: colors.text }]}>
              🚌 Driver: {trip.driverName}
            </Text>
            <Text style={[styles.busNumber, { color: colors.textSecondary }]}>
              Bus: {trip.busNumber}
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {trip.distance || 0} km
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Distance
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {trip.duration || '--:--'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Duration
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {trip.students || 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Students
              </Text>
            </View>
          </View>

          <View style={styles.timeInfo}>
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                Started:
              </Text>
              <Text style={[styles.timeValue, { color: colors.text }]}>
                {trip.startTime ? format(new Date(trip.startTime), 'MMM dd, yyyy HH:mm') : 'N/A'}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                Ended:
              </Text>
              <Text style={[styles.timeValue, { color: colors.text }]}>
                {trip.endTime ? format(new Date(trip.endTime), 'MMM dd, yyyy HH:mm') : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.timelineCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.timelineTitle, { color: colors.text }]}>Trip Timeline</Text>
          {events.length > 0 ? (
            events.map((event, index) => (
              <TimelineItem
                key={event.id}
                event={event}
                isLast={index === events.length - 1}
                colors={colors}
              />
            ))
          ) : (
            <Text style={[styles.noEvents, { color: colors.textSecondary }]}>
              No timeline events available
            </Text>
          )}
        </View>

        {trip.notes && (
          <View style={[styles.notesCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.notesTitle, { color: colors.text }]}>Trip Notes</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {trip.notes}
            </Text>
          </View>
        )}

        {trip.rating && (
          <View style={[styles.ratingCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.ratingTitle, { color: colors.text }]}>Driver Rating</Text>
            <View style={styles.ratingDisplay}>
              <Text style={[styles.ratingValue, { color: colors.primary }]}>
                {trip.rating.toFixed(1)}
              </Text>
              <Text style={[styles.ratingStars, { color: colors.primary }]}>⭐</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  fitButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  fitButtonIcon: { fontSize: 18, color: '#fff' },
  mapContainer: { height: 250, margin: 15, borderRadius: 10, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  stopMarker: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  stopMarkerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  infoCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  routeName: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  driverInfo: { marginBottom: 15 },
  driverName: { fontSize: 14, marginBottom: 2 },
  busNumber: { fontSize: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#eee' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 11 },
  timeInfo: { marginBottom: 5 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  timeLabel: { fontSize: 12 },
  timeValue: { fontSize: 12, fontWeight: '500' },
  timelineCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10 },
  timelineTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  timelineItem: { flexDirection: 'row', marginBottom: 10 },
  timelineLeft: { width: 30, alignItems: 'center', position: 'relative' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  timelineLine: { width: 2, position: 'absolute', top: 16, bottom: -10, left: 5 },
  timelineContent: { flex: 1, padding: 12, borderRadius: 8, marginLeft: 10 },
  timelineTime: { fontSize: 11, marginBottom: 2 },
  timelineTitle: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  timelineDescription: { fontSize: 12, marginBottom: 2 },
  timelineLocation: { fontSize: 11, marginTop: 2 },
  noEvents: { fontSize: 13, textAlign: 'center', padding: 20, fontStyle: 'italic' },
  notesCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10 },
  notesTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  notesText: { fontSize: 13, lineHeight: 18 },
  ratingCard: { margin: 15, marginTop: 0, padding: 15, borderRadius: 10, alignItems: 'center' },
  ratingTitle: { fontSize: 14, marginBottom: 8 },
  ratingDisplay: { flexDirection: 'row', alignItems: 'center' },
  ratingValue: { fontSize: 36, fontWeight: 'bold', marginRight: 4 },
  ratingStars: { fontSize: 24 },
});