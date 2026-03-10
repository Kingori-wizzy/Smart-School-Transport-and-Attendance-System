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
import { format } from 'date-fns';

const RatingItem = ({ rating, onPress, colors }) => {
  const getDateLabel = (date) => {
    const now = new Date();
    const ratingDate = new Date(date);
    const diffDays = Math.floor((now - ratingDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return format(ratingDate, 'MMM dd, yyyy');
  };

  return (
    <TouchableOpacity
      style={[styles.ratingItem, { backgroundColor: colors.card }]}
      onPress={() => onPress(rating)}
    >
      <View style={styles.ratingHeader}>
        <View style={styles.driverInfo}>
          <Text style={[styles.driverName, { color: colors.text }]}>
            {rating.driverName}
          </Text>
          <Text style={[styles.tripDate, { color: colors.textSecondary }]}>
            {getDateLabel(rating.createdAt)}
          </Text>
        </View>
        <View style={[styles.overallBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.overallScore}>{rating.overall}.0</Text>
        </View>
      </View>

      <View style={styles.ratingBreakdown}>
        <View style={styles.breakdownItem}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
            Driving
          </Text>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>
            {rating.driving}⭐
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
            Punctuality
          </Text>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>
            {rating.punctuality}⭐
          </Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
            Safety
          </Text>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>
            {rating.safety}⭐
          </Text>
        </View>
      </View>

      {rating.comment ? (
        <Text style={[styles.comment, { color: colors.textSecondary }]} numberOfLines={2}>
          "{rating.comment}"
        </Text>
      ) : null}

      <View style={styles.ratingFooter}>
        <Text style={[styles.busNumber, { color: colors.textSecondary }]}>
          Bus: {rating.busNumber}
        </Text>
        {rating.anonymous && (
          <Text style={[styles.anonymousBadge, { color: colors.textSecondary }]}>
            Anonymous
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = ({ colors }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>⭐</Text>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Ratings Yet</Text>
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      You haven't rated any drivers yet. Ratings will appear here after trips.
    </Text>
  </View>
);

export default function RatingHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    fiveStar: 0,
  });

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      const data = await api.ratings.getMyRatings();
      setRatings(data.ratings || []);
      setStats(data.stats || { average: 0, total: 0, fiveStar: 0 });
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRatings();
    setRefreshing(false);
  };

  const handleRatingPress = (rating) => {
    navigation.navigate('RatingDetail', { ratingId: rating.id });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading ratings...
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
        <Text style={styles.headerTitle}>My Ratings</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {ratings.length > 0 && (
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.average.toFixed(1)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Average
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Total
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {stats.fiveStar}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              5-Star
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={ratings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RatingItem rating={item} onPress={handleRatingPress} colors={colors} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<EmptyState colors={colors} />}
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
  statsCard: { flexDirection: 'row', margin: 15, padding: 15, borderRadius: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  statDivider: { width: 1, height: '70%', backgroundColor: '#ddd', alignSelf: 'center' },
  listContent: { padding: 15, paddingTop: 0 },
  ratingItem: { padding: 15, borderRadius: 10, marginBottom: 10 },
  ratingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  tripDate: { fontSize: 11 },
  overallBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  overallScore: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  ratingBreakdown: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  breakdownItem: { flex: 1, alignItems: 'center' },
  breakdownLabel: { fontSize: 11, marginBottom: 2 },
  breakdownValue: { fontSize: 14, fontWeight: '500' },
  comment: { fontSize: 12, fontStyle: 'italic', marginBottom: 8 },
  ratingFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8 },
  busNumber: { fontSize: 11 },
  anonymousBadge: { fontSize: 11, fontStyle: 'italic' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});