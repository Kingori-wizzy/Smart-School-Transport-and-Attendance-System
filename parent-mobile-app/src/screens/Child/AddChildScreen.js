import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { Picker } from '@react-native-picker/picker';

export default function AddChildScreen({ navigation }) {
  const { fetchChildren } = useAuth();
  const [loading, setLoading] = useState(false);
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

  const [errors, setErrors] = useState({});

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Child name is required';
    }

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    }

    if (!formData.class) {
      newErrors.class = 'Please select a class';
    }

    if (!formData.busNumber) {
      newErrors.busNumber = 'Please select a bus';
    }

    if (!formData.emergencyContact.trim()) {
      newErrors.emergencyContact = 'Emergency contact name is required';
    }

    if (!formData.emergencyPhone.trim()) {
      newErrors.emergencyPhone = 'Emergency phone is required';
    } else if (!/^(\+254|0)[7][0-9]{8}$/.test(formData.emergencyPhone)) {
      newErrors.emergencyPhone = 'Please enter a valid Kenyan phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please check all required fields');
      return;
    }

    setLoading(true);
    try {
      // Replace with your actual API endpoint
      await api.post('/children', formData);
      
      await fetchChildren();
      
      Alert.alert(
        'Success',
        'Child added successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add child. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, required, error, ...props }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor="#999"
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
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
        <Text style={styles.headerTitle}>Add Child</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <InputField
              label="Child's Full Name"
              required
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter child's full name"
              error={errors.name}
            />

            <InputField
              label="Student ID"
              required
              value={formData.studentId}
              onChangeText={(text) => setFormData({ ...formData, studentId: text })}
              placeholder="Enter student ID"
              error={errors.studentId}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Class/Grade <Text style={styles.required}>*</Text></Text>
              <View style={[styles.pickerContainer, errors.class && styles.inputError]}>
                <Picker
                  selectedValue={formData.class}
                  onValueChange={(value) => setFormData({ ...formData, class: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select class" value="" />
                  {classes.map((cls, index) => (
                    <Picker.Item key={index} label={cls} value={cls} />
                  ))}
                </Picker>
              </View>
              {errors.class && <Text style={styles.errorText}>{errors.class}</Text>}
            </View>

            <InputField
              label="School Name"
              value={formData.school}
              onChangeText={(text) => setFormData({ ...formData, school: text })}
              placeholder="Enter school name"
            />
          </View>

          {/* Transport Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transport Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bus Number/Route <Text style={styles.required}>*</Text></Text>
              <View style={[styles.pickerContainer, errors.busNumber && styles.inputError]}>
                <Picker
                  selectedValue={formData.busNumber}
                  onValueChange={(value) => setFormData({ ...formData, busNumber: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select bus" value="" />
                  {buses.map((bus, index) => (
                    <Picker.Item key={index} label={bus} value={bus} />
                  ))}
                </Picker>
              </View>
              {errors.busNumber && <Text style={styles.errorText}>{errors.busNumber}</Text>}
            </View>

            <InputField
              label="Pickup Point"
              value={formData.pickupPoint}
              onChangeText={(text) => setFormData({ ...formData, pickupPoint: text })}
              placeholder="Enter pickup location"
            />

            <InputField
              label="Dropoff Point"
              value={formData.dropoffPoint}
              onChangeText={(text) => setFormData({ ...formData, dropoffPoint: text })}
              placeholder="Enter dropoff location"
            />
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>

            <InputField
              label="Emergency Contact Name"
              required
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
              placeholder="Enter emergency contact name"
              error={errors.emergencyContact}
            />

            <InputField
              label="Emergency Phone Number"
              required
              value={formData.emergencyPhone}
              onChangeText={(text) => setFormData({ ...formData, emergencyPhone: text })}
              placeholder="e.g., 0712345678 or +254712345678"
              keyboardType="phone-pad"
              error={errors.emergencyPhone}
            />

            <InputField
              label="Medical Notes / Special Requirements"
              value={formData.medicalNotes}
              onChangeText={(text) => setFormData({ ...formData, medicalNotes: text })}
              placeholder="Any medical conditions or special needs"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={styles.textArea}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.secondary]}
              style={styles.gradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Child</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  required: {
    color: '#f44336',
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
  inputError: {
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});