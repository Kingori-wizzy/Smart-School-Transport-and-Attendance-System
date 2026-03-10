import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { format, subDays, isToday, isYesterday } from 'date-fns';

const TripCard = ({ trip, onPress, colors }) => {
  const getDateLabel = (date) => {
    const tripDate = new Date(date);
    if (isToday(tripDate)) return 'Today';
    if (isYesterday(tripDate)) return 'Yesterday';
    return format(tripDate, 'MMM dd, yyyy');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#f44336';
      case 'in-progress': return '#FF9800';
      default: return '#999';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.tripCard, { backgroundColor: colors.card }]}
      onPress={() => onPress(trip)}
    >
      <View style={styles.tripHeader}>
        <View>
          <Text style={[styles.childName, { color: colors.text }]}>
            {trip.childName}
          </Text>
          <Text style={[styles.routeName, { color: colors.textSecondary }]}>
            {trip.routeName}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
          <Text style={styles.statusText}>{trip.status}</Text>
        </View>
      </View>

      <View style={styles.tripInfo}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Date</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {getDateLabel(trip.date)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Bus</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {trip.busNumber}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Driver</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {trip.driverName}
          </Text>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeItem}>
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Start</Text>
            <Text style={[styles.timeValue, { color: colors.text }]}>
              {trip.startTime ? format(new Date(trip.startTime), 'HH:mm') : '--:--'}
            </Text>
          </View>

          <View style={styles.timeItem}>
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>End</Text>
            <Text style={[styles.timeValue, { color: colors.text }]}>
              {trip.endTime ? format(new Date(trip.endTime), 'HH:mm') : '--:--'}
            </Text>
          </View>

          <View style={styles.timeItem}>
            <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.timeValue, { color: colors.text }]}>
              {trip.duration || '--:--'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {trip.distance || '0'} km
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Distance</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {trip.stops || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Stops</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {trip.students || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Students</Text>
          </View>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <View style={styles.ratingSummary}>
          <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
            Driver Rating: 
          </Text>
          {trip.rating ? (
            <View style={styles.ratingStars}>
              <Text style={[styles.ratingValue, { color: colors.primary }]}>
                {trip.rating.toFixed(1)}
              </Text>
              <Text style={[styles.starIcon, { color: colors.primary }]}>⭐</Text>
            </View>
          ) : (
            <Text style={[styles.noRating, { color: colors.textSecondary }]}>
              Not rated
            </Text>
          )}
        </View>
        <Text style={[styles.viewDetails, { color: colors.primary }]}>
          View Details →
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const DateFilter = ({ selected, onSelect, colors }) => {
  const filters = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

  return (
    <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterButton,
            selected === filter.id && { backgroundColor: colors.primary },
          ]}
          onPress={() => onSelect(filter.id)}
        >
          <Text
            style={[
              styles.filterText,
              { color: selected === filter.id ? '#fff' : colors.text },
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const EmptyState = ({ colors, onSelectChild }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>🗺️</Text>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Trips Found</Text>
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      There are no completed trips to display. Check back after your child has taken a bus.
    </Text>
    <TouchableOpacity
      style={[styles.selectChildButton, { backgroundColor: colors.primary }]}
      onPress={onSelectChild}
    >
      <Text style={styles.selectChildText}>Select a Different Child</Text>
    </TouchableOpacity>
  </View>
);

export default function RouteHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, childrenList } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [trips, setTrips] = useState([]);
  const [dateFilter, setDateFilter] = useState('week');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [showChildPicker, setShowChildPicker] = useState(false);

  useEffect(() => {
    if (childrenList.length > 0 && !selectedChild) {
      setSelectedChild(childrenList[0]);
    }
  }, [childrenList]);

  useEffect(() => {
    if (selectedChild) {
      loadTrips();
    }
  }, [selectedChild, dateFilter]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      
      let startDate, endDate;
      const today = new Date();
      
      switch (dateFilter) {
        case 'week':
          startDate = subDays(today, 7);
          endDate = today;
          break;
        case 'month':
          startDate = subDays(today, 30);
          endDate = today;
          break;
        case 'custom':
          startDate = customStartDate || subDays(today, 7);
          endDate = customEndDate || today;
          break;
      }

      const data = await api.trips.getChildHistory(
        selectedChild.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      
      setTrips(data);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const handleTripPress = (trip) => {
    navigation.navigate('RouteDetail', { tripId: trip.id });
  };

  const handleChildSelect = (child) => {
    setSelectedChild(child);
    setShowChildPicker(false);
  };

  const getAverageStats = () => {
    if (trips.length === 0) return null;

    const avgDistance = trips.reduce((sum, t) => sum + (t.distance || 0), 0) / trips.length;
    const avgDuration = trips.reduce((sum, t) => sum + (t.durationMinutes || 0), 0) / trips.length;
    const onTimeCount = trips.filter(t => t.onTime).length;
    const onTimePercentage = (onTimeCount / trips.length) * 100;

    return {
      avgDistance: avgDistance.toFixed(1),
      avgDuration: Math.round(avgDuration),
      onTimePercentage: Math.round(onTimePercentage),
    };
  };

  const stats = getAverageStats();

  if (loading && trips.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading route history...
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
        <Text style={styles.headerTitle}>Route History</Text>
        <TouchableOpacity
          onPress={() => setShowChildPicker(true)}
          style={styles.childButton}
        >
          <Text style={styles.childButtonIcon}>👤</Text>
        </TouchableOpacity>
      </LinearGradient>

      {selectedChild && (
        <View style={[styles.childSelector, { backgroundColor: colors.card }]}>
          <Text style={[styles.childLabel, { color: colors.textSecondary }]}>
            Showing trips for:
          </Text>
          <TouchableOpacity
            style={[styles.childSelectorButton, { borderColor: colors.primary }]}
            onPress={() => setShowChildPicker(true)}
          >
            <Text style={[styles.childName, { color: colors.primary }]}>
              {selectedChild.name}
            </Text>
            <Text style={[styles.changeText, { color: colors.textSecondary }]}>▼</Text>
          </TouchableOpacity>
        </View>
      )}

      {stats && trips.length > 0 && (
        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statBoxValue, { color: colors.primary }]}>
              {stats.avgDistance}
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>
              Avg km/trip
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statBoxValue, { color: colors.primary }]}>
              {stats.avgDuration} min
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>
              Avg duration
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statBoxValue, { color: colors.primary }]}>
              {stats.onTimePercentage}%
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>
              On-time
            </Text>
          </View>
        </View>
      )}

      <DateFilter selected={dateFilter} onSelect={setDateFilter} colors={colors} />

      {trips.length > 0 ? (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={handleTripPress} colors={colors} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <EmptyState
          colors={colors}
          onSelectChild={() => setShowChildPicker(true)}
        />
      )}

      {/* Child Picker Modal (simplified - in real app use a proper modal) */}
      {showChildPicker && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select a Child</Text>
            {childrenList.map((child) => (
              <TouchableOpacity
                key={child.id}
                style={[styles.modalItem, { borderBottomColor: colors.border }]}
                onPress={() => handleChildSelect(child)}
              >
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  {child.name}
                </Text>
                {selectedChild?.id === child.id && (
                  <Text style={[styles.checkIcon, { color: colors.primary }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowChildPicker(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  childButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  childButtonIcon: { fontSize: 18, color: '#fff' },
  childSelector: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  childLabel: { fontSize: 13, marginRight: 8 },
  childSelectorButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  childName: { fontSize: 14, fontWeight: '600', marginRight: 4 },
  changeText: { fontSize: 12 },
  statsContainer: { flexDirection: 'row', margin: 15, padding: 15, borderRadius: 10 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statBoxLabel: { fontSize: 11 },
  statDivider: { width: 1, height: '70%', backgroundColor: '#ddd', alignSelf: 'center' },
  filterContainer: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 15, borderRadius: 8, padding: 4 },
  filterButton: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  filterText: { fontSize: 12, fontWeight: '500' },
  listContent: { padding: 15, paddingTop: 0 },
  tripCard: { padding: 15, borderRadius: 10, marginBottom: 10 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  childName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  routeName: { fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  tripInfo: { marginBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 12, fontWeight: '500' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  timeItem: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 10, marginBottom: 2 },
  timeValue: { fontSize: 12, fontWeight: '500' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '600' },
  statLabel: { fontSize: 10 },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  ratingSummary: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 12, marginRight: 4 },
  ratingStars: { flexDirection: 'row', alignItems: 'center' },
  ratingValue: { fontSize: 12, fontWeight: '600', marginRight: 2 },
  starIcon: { fontSize: 12 },
  noRating: { fontSize: 12, fontStyle: 'italic' },
  viewDetails: { fontSize: 12, fontWeight: '500' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  selectChildButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  selectChildText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  modalItemText: { fontSize: 14 },
  checkIcon: { fontSize: 18 },
  modalCloseButton: { marginTop: 15, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalCloseText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});