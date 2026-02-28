import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

export default function ReportScreen({ route, navigation }) {
  const { trip } = route.params;
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);

  const reportTypes = [
    { id: 'accident', label: '🚗 Accident', color: '#f44336' },
    { id: 'mechanical', label: '🔧 Mechanical Issue', color: '#FF9800' },
    { id: 'student', label: '👤 Student Issue', color: '#2196F3' },
    { id: 'traffic', label: '🚦 Traffic Delay', color: '#9C27B0' },
    { id: 'weather', label: '☔ Weather Delay', color: '#00BCD4' },
    { id: 'other', label: '📋 Other', color: '#607D8B' },
  ];

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const submitReport = async () => {
    if (!reportType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('tripId', trip.id);
      formData.append('type', reportType);
      formData.append('description', description);
      
      photos.forEach((photo, index) => {
        formData.append('photos', {
          uri: photo,
          type: 'image/jpeg',
          name: `photo_${index}.jpg`,
        });
      });

      await api.post('/driver/report', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', 'Report submitted successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incident Report</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView>
        {/* Report Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <View style={styles.typeGrid}>
            {reportTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  reportType === type.id && { backgroundColor: type.color },
                ]}
                onPress={() => setReportType(type.id)}
              >
                <Text style={[styles.typeText, reportType === type.id && styles.typeTextSelected]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={6}
            placeholder="Describe what happened..."
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
            <Text style={styles.photoIcon}>📸</Text>
            <Text style={styles.photoText}>Take Photo</Text>
          </TouchableOpacity>
          
          {photos.length > 0 && (
            <View style={styles.photoList}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Text style={styles.photoName}>Photo {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
                  >
                    <Text style={styles.removePhoto}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={submitReport}
          disabled={loading}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Report</Text>}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  section: { backgroundColor: '#fff', margin: 15, marginBottom: 10, padding: 15, borderRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 15 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  typeButton: { width: '48%', margin: '1%', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8, alignItems: 'center' },
  typeText: { fontSize: 13, color: '#333', fontWeight: '500' },
  typeTextSelected: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: '#f9f9f9', minHeight: 120 },
  photoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed' },
  photoIcon: { fontSize: 24, marginRight: 10 },
  photoText: { fontSize: 14, color: '#666' },
  photoList: { marginTop: 10 },
  photoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 6, marginBottom: 5 },
  photoName: { fontSize: 13, color: '#333' },
  removePhoto: { fontSize: 16, color: '#f44336' },
  submitButton: { margin: 15, borderRadius: 10, overflow: 'hidden' },
  gradient: { paddingVertical: 15, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});