import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const StarRating = ({ rating, onRate, size = 40, colors }) => {
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRate(star)}
          style={styles.starButton}
        >
          <Text style={[styles.star, { fontSize: size }]}>
            {star <= rating ? '⭐' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const RatingCategory = ({ title, rating, onRate, colors }) => (
  <View style={[styles.categoryCard, { backgroundColor: colors.card }]}>
    <Text style={[styles.categoryTitle, { color: colors.text }]}>{title}</Text>
    <StarRating
      rating={rating}
      onRate={onRate}
      size={30}
      colors={colors}
    />
  </View>
);

export default function DriverRatingScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { tripId, driverId, driverName, busNumber } = route.params;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState({
    overall: 0,
    driving: 0,
    punctuality: 0,
    communication: 0,
    safety: 0,
  });
  const [comment, setComment] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [existingRating, setExistingRating] = useState(null);

  useEffect(() => {
    checkExistingRating();
  }, []);

  const checkExistingRating = async () => {
    try {
      setLoading(true);
      const response = await api.ratings.getForTrip(tripId);
      if (response) {
        setExistingRating(response);
        setRatings({
          overall: response.overall,
          driving: response.driving,
          punctuality: response.punctuality,
          communication: response.communication,
          safety: response.safety,
        });
        setComment(response.comment || '');
        setAnonymous(response.anonymous || false);
      }
    } catch (error) {
      console.error('Error checking existing rating:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = (category, value) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const calculateOverall = () => {
    const values = Object.values(ratings);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  };

  const handleSubmit = async () => {
    // Validate at least one rating
    if (calculateOverall() === 0) {
      Alert.alert('Error', 'Please rate at least one category');
      return;
    }

    setSubmitting(true);
    try {
      const ratingData = {
        tripId,
        driverId,
        ...ratings,
        comment,
        anonymous,
      };

      if (existingRating) {
        await api.ratings.update(existingRating.id, ratingData);
        Alert.alert('Success', 'Rating updated successfully');
      } else {
        await api.ratings.create(ratingData);
        Alert.alert('Success', 'Thank you for rating the driver!');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading rating...
        </Text>
      </View>
    );
  }

  const overallRating = calculateOverall();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Driver</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.driverCard, { backgroundColor: colors.card }]}>
          <View style={styles.driverAvatar}>
            <Text style={[styles.driverAvatarText, { color: colors.primary }]}>
              {driverName?.charAt(0) || 'D'}
            </Text>
          </View>
          <Text style={[styles.driverName, { color: colors.text }]}>{driverName}</Text>
          <Text style={[styles.busNumber, { color: colors.textSecondary }]}>Bus: {busNumber}</Text>
          
          <View style={styles.overallRating}>
            <Text style={[styles.overallLabel, { color: colors.text }]}>Overall Rating</Text>
            <View style={styles.overallStars}>
              <StarRating
                rating={overallRating}
                onRate={(value) => handleRate('overall', value)}
                size={35}
                colors={colors}
              />
              <Text style={[styles.overallScore, { color: colors.primary }]}>
                {overallRating > 0 ? `${overallRating}.0` : '?'}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Rate Specific Categories
        </Text>

        <RatingCategory
          title="Driving Quality"
          rating={ratings.driving}
          onRate={(value) => handleRate('driving', value)}
          colors={colors}
        />

        <RatingCategory
          title="Punctuality"
          rating={ratings.punctuality}
          onRate={(value) => handleRate('punctuality', value)}
          colors={colors}
        />

        <RatingCategory
          title="Communication"
          rating={ratings.communication}
          onRate={(value) => handleRate('communication', value)}
          colors={colors}
        />

        <RatingCategory
          title="Safety"
          rating={ratings.safety}
          onRate={(value) => handleRate('safety', value)}
          colors={colors}
        />

        <View style={[styles.commentCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.commentLabel, { color: colors.text }]}>
            Additional Comments (Optional)
          </Text>
          <TextInput
            style={[styles.commentInput, {
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text,
            }]}
            placeholder="Share your experience with this driver..."
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={styles.anonymousRow}
          onPress={() => setAnonymous(!anonymous)}
        >
          <View style={[styles.checkbox, { borderColor: colors.border }]}>
            {anonymous && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.anonymousText, { color: colors.text }]}>
            Rate anonymously (your name won't be shown)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {existingRating ? 'Update Rating' : 'Submit Rating'}
            </Text>
          )}
        </TouchableOpacity>
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
  driverCard: { padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  driverAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#ddd' },
  driverAvatarText: { fontSize: 30, fontWeight: 'bold' },
  driverName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  busNumber: { fontSize: 14, marginBottom: 15 },
  overallRating: { width: '100%', alignItems: 'center', marginTop: 10 },
  overallLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  overallStars: { flexDirection: 'row', alignItems: 'center' },
  overallScore: { fontSize: 24, fontWeight: 'bold', marginLeft: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, marginLeft: 5 },
  categoryCard: { padding: 15, borderRadius: 8, marginBottom: 10 },
  categoryTitle: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  starContainer: { flexDirection: 'row' },
  starButton: { padding: 2 },
  star: { fontSize: 30 },
  commentCard: { padding: 15, borderRadius: 8, marginBottom: 15 },
  commentLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  commentInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100 },
  anonymousRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderWidth: 1, borderRadius: 4, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkmark: { fontSize: 16, color: '#4CAF50' },
  anonymousText: { fontSize: 14, flex: 1 },
  submitButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});