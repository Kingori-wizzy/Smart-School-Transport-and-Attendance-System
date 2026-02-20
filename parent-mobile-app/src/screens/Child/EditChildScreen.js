import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { Picker } from '@react-native-picker/picker';

export default function EditChildScreen({ route, navigation }) {
  const { childId } = route.params;
  const { childrenList, fetchChildren } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    class: '',
    school: '',
    busNumber: '',
    pickupPoint: '',
    dropoffPoint: '',
    emergencyContact: '',
    emergencyPhone: '',
    medicalNotes: '',
  });

  useEffect(() => {
    loadChildData();
  }, []);

  const loadChildData = () => {
    const child = childrenList.find(c => c.id === childId);
    if (child) {
      setFormData({
        name: child.name || '',
        studentId: child.studentId || '',
        class: child.class || '',
        school: child.school || '',
        busNumber: child.busNumber || '',
        pickupPoint: child.pickupPoint || '',
        dropoffPoint: child.dropoffPoint || '',
        emergencyContact: child.emergencyContact || '',
        emergencyPhone: child.emergencyPhone || '',
        medicalNotes: child.medicalNotes || '',
      });
    }
    setLoading(false);
  };

  const classes = [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5',
    'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
    'Grade 11', 'Grade 12'
  ];

  const buses = [
    'BUS001 - Route A',
    'BUS002 - Route B',
    'BUS003 - Route C',
    'BUS004 - Route D',
    'BUS005 - Route E',
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/children/${childId}`, formData);
      await fetchChildren();
      Alert.alert('Success', 'Child information updated');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update child information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Child</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView>
        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Child's Full Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Student ID</Text>
              <TextInput
                style={styles.input}
                value={formData.studentId}
                onChangeText={(text) => setFormData({ ...formData, studentId: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Class/Grade</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.class}
                  onValueChange={(value) => setFormData({ ...formData, class: value })}
                >
                  <Picker.Item label="Select class" value="" />
                  {classes.map((cls, index) => (
                    <Picker.Item key={index} label={cls} value={cls} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transport Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bus Number/Route</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.busNumber}
                  onValueChange={(value) => setFormData({ ...formData, busNumber: value })}
                >
                  <Picker.Item label="Select bus" value="" />
                  {buses.map((bus, index) => (
                    <Picker.Item key={index} label={bus} value={bus} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Pickup Point</Text>
              <TextInput
                style={styles.input}
                value={formData.pickupPoint}
                onChangeText={(text) => setFormData({ ...formData, pickupPoint: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Dropoff Point</Text>
              <TextInput
                style={styles.input}
                value={formData.dropoffPoint}
                onChangeText={(text) => setFormData({ ...formData, dropoffPoint: text })}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Emergency Contact Name</Text>
              <TextInput
                style={styles.input}
                value={formData.emergencyContact}
                onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Emergency Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.emergencyPhone}
                onChangeText={(text) => setFormData({ ...formData, emergencyPhone: text })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Medical Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.medicalNotes}
                onChangeText={(text) => setFormData({ ...formData, medicalNotes: text })}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.gradient}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  form: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  saveButton: {
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 30,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});