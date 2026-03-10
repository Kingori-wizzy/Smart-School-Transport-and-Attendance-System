import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { format } from 'date-fns';

export default function RatingDetailScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { ratingId } = route.params;

  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRating();
  }, []);

  const loadRating = async () => {
    try {
      const data = await api.ratings.getById(ratingId);
      setRating(data);
    } catch (error) {
      console.error('Error loading rating:', error);
      Alert.alert('Error', 'Failed to load rating details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('DriverRating', {
      tripId: rating.tripId,
      driverId: rating.driverId,
      driverName: rating.driverName,
      busNumber: rating.busNumber,
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Rating',
      'Are you sure you want to delete this rating? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.ratings.delete(ratingId);
              Alert.alert('Success', 'Rating deleted successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting rating:', error);
              Alert.alert('Error', 'Failed to delete rating');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const RatingRow = ({ label, value }) => (
    <View style={[styles.ratingRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.ratingLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.ratingValue}>
        <Text style={[styles.ratingNumber, { color: colors.primary }]}>{value}</Text>
        <Text style={[styles.ratingStar, { color: colors.primary }]}>⭐</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading rating details...
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
        <Text style={styles.headerTitle}>Rating Details</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.driverCard, { backgroundColor: colors.card }]}>
          <View style={styles.driverAvatar}>
            <Text style={[styles.driverAvatarText, { color: colors.primary }]}>
              {rating.driverName?.charAt(0) || 'D'}
            </Text>
          </View>
          <Text style={[styles.driverName, { color: colors.text }]}>{rating.driverName}</Text>
          <Text style={[styles.busNumber, { color: colors.textSecondary }]}>
            Bus: {rating.busNumber}
          </Text>
          <Text style={[styles.tripDate, { color: colors.textSecondary }]}>
            {format(new Date(rating.createdAt), 'MMMM dd, yyyy • HH:mm')}
          </Text>
        </View>

        <View style={[styles.ratingsCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ratings</Text>
          
          <RatingRow label="Overall" value={rating.overall} />
          <RatingRow label="Driving Quality" value={rating.driving} />
          <RatingRow label="Punctuality" value={rating.punctuality} />
          <RatingRow label="Communication" value={rating.communication} />
          <RatingRow label="Safety" value={rating.safety} />
        </View>

        {rating.comment ? (
          <View style={[styles.commentCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.commentLabel, { color: colors.text }]}>Comment</Text>
            <Text style={[styles.commentText, { color: colors.textSecondary }]}>
              "{rating.comment}"
            </Text>
          </View>
        ) : null}

        <View style={styles.metaInfo}>
          {rating.anonymous && (
            <View style={[styles.metaBadge, { backgroundColor: colors.card }]}>
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                ⚫ Rated Anonymously
              </Text>
            </View>
          )}
          <View style={[styles.metaBadge, { backgroundColor: colors.card }]}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              🕒 Submitted {format(new Date(rating.createdAt), 'MMM dd, yyyy')}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={handleEdit}
            disabled={deleting}
          >
            <Text style={styles.editButtonText}>✏️ Edit Rating</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, { backgroundColor: colors.danger }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            )}
          </TouchableOpacity>
        </View>
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
  content: { padding: 15, paddingBottom: 30 },
  driverCard: { padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  driverAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#ddd' },
  driverAvatarText: { fontSize: 30, fontWeight: 'bold' },
  driverName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  busNumber: { fontSize: 14, marginBottom: 4 },
  tripDate: { fontSize: 12 },
  ratingsCard: { padding: 15, borderRadius: 10, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  ratingLabel: { fontSize: 14 },
  ratingValue: { flexDirection: 'row', alignItems: 'center' },
  ratingNumber: { fontSize: 16, fontWeight: '600', marginRight: 4 },
  ratingStar: { fontSize: 14 },
  commentCard: { padding: 15, borderRadius: 10, marginBottom: 15 },
  commentLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  commentText: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  metaInfo: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  metaBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, marginBottom: 8 },
  metaText: { fontSize: 11 },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  editButton: { flex: 1, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  editButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteButton: { flex: 1, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  deleteButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});