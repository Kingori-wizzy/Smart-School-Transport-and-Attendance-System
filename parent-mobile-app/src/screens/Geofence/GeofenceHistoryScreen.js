import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { format, isToday, isYesterday } from 'date-fns';

const GeofenceEventItem = ({ event, colors }) => {
  const getEventIcon = (type) => {
    switch (type) {
      case 'entry': return '➡️';
      case 'exit': return '⬅️';
      default: return '📍';
    }
  };

  const getZoneIcon = (zoneType) => {
    switch (zoneType) {
      case 'school': return '🏫';
      case 'home': return '🏠';
      case 'bus-stop': return '🚏';
      case 'no-go': return '🚫';
      default: return '📍';
    }
  };

  const getEventColor = (type) => {
    return type === 'entry' ? '#4CAF50' : '#f44336';
  };

  const getDateLabel = (date) => {
    const eventDate = new Date(date);
    if (isToday(eventDate)) return 'Today';
    if (isYesterday(eventDate)) return 'Yesterday';
    return format(eventDate, 'MMM dd, yyyy');
  };

  return (
    <View style={[styles.eventCard, { backgroundColor: colors.card }]}>
      <View style={styles.eventHeader}>
        <View style={styles.eventIconContainer}>
          <Text style={styles.zoneIcon}>{getZoneIcon(event.zoneType)}</Text>
          <Text style={[styles.eventIcon, { color: getEventColor(event.type) }]}>
            {getEventIcon(event.type)}
          </Text>
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: colors.text }]}>
            {event.zoneName}
          </Text>
          <Text style={[styles.eventSubtitle, { color: colors.textSecondary }]}>
            {event.childName} • Bus {event.busNumber}
          </Text>
        </View>
        <View style={[styles.eventBadge, { backgroundColor: getEventColor(event.type) }]}>
          <Text style={styles.eventBadgeText}>
            {event.type === 'entry' ? 'ENTERED' : 'EXITED'}
          </Text>
        </View>
      </View>

      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Time</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {format(new Date(event.timestamp), 'HH:mm:ss')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {getDateLabel(event.timestamp)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Location</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
          </Text>
        </View>
      </View>

      {event.speed !== undefined && (
        <View style={[styles.speedBadge, { backgroundColor: colors.background }]}>
          <Text style={[styles.speedText, { color: colors.textSecondary }]}>
            🚌 Speed: {event.speed} km/h
          </Text>
        </View>
      )}
    </View>
  );
};

const FilterBar = ({ selectedFilter, onFilterChange, colors }) => {
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'entry', label: 'Entries' },
    { id: 'exit', label: 'Exits' },
  ];

  return (
    <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterButton,
            selectedFilter === filter.id && { backgroundColor: colors.primary },
          ]}
          onPress={() => onFilterChange(filter.id)}
        >
          <Text
            style={[
              styles.filterText,
              { color: selectedFilter === filter.id ? '#fff' : colors.text },
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const EmptyState = ({ colors, onAddGeofence }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>📍</Text>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Events Yet</Text>
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      Geofence alerts will appear here when buses enter or exit your defined zones.
    </Text>
    <TouchableOpacity
      style={[styles.setupButton, { backgroundColor: colors.primary }]}
      onPress={onAddGeofence}
    >
      <Text style={styles.setupButtonText}>Set Up Geofences</Text>
    </TouchableOpacity>
  </View>
);

export default function GeofenceHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    today: 0,
    entries: 0,
    exits: 0,
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await api.geofence.getHistory();
      setEvents(data.events || []);
      setStats(data.stats || { today: 0, entries: 0, exits: 0 });
    } catch (error) {
      console.error('Error loading geofence events:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const filterEvents = () => {
    switch (filter) {
      case 'today':
        return events.filter(e => isToday(new Date(e.timestamp)));
      case 'entry':
        return events.filter(e => e.type === 'entry');
      case 'exit':
        return events.filter(e => e.type === 'exit');
      default:
        return events;
    }
  };

  const filteredEvents = filterEvents();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading geofence history...
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
        <Text style={styles.headerTitle}>Geofence History</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('GeofenceSettings')}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsButtonIcon}>⚙️</Text>
        </TouchableOpacity>
      </LinearGradient>

      {events.length > 0 && (
        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.today}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Today</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.entries}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#f44336' }]}>{stats.exits}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exits</Text>
          </View>
        </View>
      )}

      <FilterBar selectedFilter={filter} onFilterChange={setFilter} colors={colors} />

      {filteredEvents.length > 0 ? (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GeofenceEventItem event={item} colors={colors} />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <EmptyState
          colors={colors}
          onAddGeofence={() => navigation.navigate('GeofenceSettings')}
        />
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
  settingsButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  settingsButtonIcon: { fontSize: 18, color: '#fff' },
  statsContainer: { flexDirection: 'row', margin: 15, padding: 15, borderRadius: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 11 },
  statDivider: { width: 1, height: '70%', backgroundColor: '#ddd', alignSelf: 'center' },
  filterContainer: { flexDirection: 'row', marginHorizontal: 15, marginBottom: 15, borderRadius: 8, padding: 4 },
  filterButton: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  filterText: { fontSize: 12, fontWeight: '500' },
  listContent: { padding: 15, paddingTop: 0 },
  eventCard: { padding: 15, borderRadius: 10, marginBottom: 10 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  eventIconContainer: { position: 'relative', marginRight: 10 },
  zoneIcon: { fontSize: 24 },
  eventIcon: { position: 'absolute', bottom: -5, right: -5, fontSize: 14 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  eventSubtitle: { fontSize: 12 },
  eventBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  eventBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  eventDetails: { marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { fontSize: 11 },
  detailValue: { fontSize: 11, fontWeight: '500' },
  speedBadge: { padding: 6, borderRadius: 4, alignSelf: 'flex-start' },
  speedText: { fontSize: 11 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  setupButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  setupButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});