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
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

export default function ChildDetailsScreen({ route, navigation }) {
  const { child } = route.params;
  const { fetchChildren } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadChildStats();
  }, []);

  const loadChildStats = async () => {
    try {
      const response = await api.attendance.getStats(child.id || child._id);
      setStats(response);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditChild', { childId: child.id || child._id });
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Child',
      `Are you sure you want to remove ${child.firstName} ${child.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.parent.deleteChild(child.id || child._id);
              await fetchChildren();
              Alert.alert('Success', 'Child removed successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to remove child');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const InfoRow = ({ label, value }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || 'Not specified'}</Text>
    </View>
  );

  const StatCard = ({ title, value, icon }) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Child Details</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
            </Text>
          </View>
          <Text style={styles.name}>{child.firstName} {child.lastName}</Text>
          <Text style={styles.class}>{child.classLevel || child.class}</Text>
        </View>

        <View style={styles.statsContainer}>
          <StatCard icon="📊" title="Attendance" value={stats?.attendanceRate || '0%'} />
          <StatCard icon="🚌" title="Bus" value={child.busNumber || 'N/A'} />
          <StatCard icon="📅" title="School Days" value={stats?.totalTrips || '0'} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <InfoRow label="Student ID" value={child.studentId || child.admissionNumber} />
          <InfoRow label="School" value={child.school} />
          <InfoRow label="Pickup Point" value={child.pickupPoint} />
          <InfoRow label="Drop-off Point" value={child.dropoffPoint} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <InfoRow label="Contact Name" value={child.emergencyContact} />
          <InfoRow label="Phone" value={child.emergencyPhone} />
          <InfoRow label="Medical Notes" value={child.medicalNotes} />
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit} disabled={loading}>
            <Text style={styles.buttonText}>✏️ Edit Child</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.removeButton} onPress={handleRemove} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>🗑️ Remove Child</Text>
            )}
          </TouchableOpacity>
        </View>
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
  placeholder: { width: 40 },
  profileCard: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  class: { fontSize: 14, color: '#666', marginTop: 4 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 15, marginBottom: 20 },
  statCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, alignItems: 'center', flex: 1, marginHorizontal: 5, elevation: 2 },
  statIcon: { fontSize: 24, marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  statTitle: { fontSize: 11, color: '#666', marginTop: 2 },
  section: { backgroundColor: '#fff', marginHorizontal: 15, marginBottom: 15, padding: 15, borderRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  infoRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  infoLabel: { width: 120, fontSize: 14, color: '#666' },
  infoValue: { flex: 1, fontSize: 14, color: '#333', fontWeight: '500' },
  actionButtons: { flexDirection: 'row', margin: 15, marginBottom: 30 },
  editButton: { flex: 1, backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, marginRight: 5, alignItems: 'center' },
  removeButton: { flex: 1, backgroundColor: '#f44336', padding: 15, borderRadius: 10, marginLeft: 5, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});