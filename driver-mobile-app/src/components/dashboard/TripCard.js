import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../utils/constants';

export default function TripCard({ trip, onPress, onStart }) {
  const getStatusColor = () => {
    switch(trip.status) {
      case 'scheduled': return '#FF9800';
      case 'in-progress': return '#4CAF50';
      case 'completed': return '#2196F3';
      default: return '#999';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(trip)}>
      <View style={styles.header}>
        <View style={styles.routeContainer}>
          <Text style={styles.routeName}>{trip.routeName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{trip.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>🕒 Time</Text>
          <Text style={styles.detailValue}>{trip.startTime} - {trip.endTime}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>🚌 Bus</Text>
          <Text style={styles.detailValue}>{trip.busNumber}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>👥 Students</Text>
          <Text style={styles.detailValue}>{trip.studentCount || 0}</Text>
        </View>
      </View>

      {trip.status === 'scheduled' && (
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => onStart(trip)}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradient}>
            <Text style={styles.startButtonText}>▶ Start Trip</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 10, elevation: 2 },
  header: { marginBottom: 10 },
  routeContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  details: { marginBottom: 10 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  detailLabel: { fontSize: 13, color: '#666' },
  detailValue: { fontSize: 13, fontWeight: '500', color: '#333' },
  startButton: { borderRadius: 8, overflow: 'hidden' },
  gradient: { paddingVertical: 12, alignItems: 'center' },
  startButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});