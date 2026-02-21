import React, { useState, useRef } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';

// --- SUB-COMPONENTS (Moved outside to prevent focus loss) ---

const InputField = ({ label, required, error, inputRef, nextRef, ...props }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <TextInput
      ref={inputRef}
      style={[styles.input, error && styles.inputError, props.multiline && styles.textArea]}
      placeholderTextColor="#999"
      returnKeyType={nextRef ? "next" : "done"}
      onSubmitEditing={() => {
        if (nextRef?.current) {
          nextRef.current.focus();
        }
      }}
      blurOnSubmit={!nextRef}
      {...props}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const PickerModal = ({ visible, title, items, onSelect, onClose, selectedValue }) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedValue === item && styles.modalItemSelected
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.modalItemText,
                    selectedValue === item && styles.modalItemTextSelected
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

// --- MAIN SCREEN ---

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
    age: '',
    gender: '',
  });

  const [errors, setErrors] = useState({});
  const [showClassModal, setShowClassModal] = useState(false);
  const [showBusModal, setShowBusModal] = useState(false);

  // Refs for auto-focusing next input
  const nameRef = useRef();
  const studentIdRef = useRef();
  const ageRef = useRef();
  const schoolRef = useRef();
  const pickupRef = useRef();
  const dropoffRef = useRef();
  const emergencyNameRef = useRef();
  const emergencyPhoneRef = useRef();
  const medicalRef = useRef();

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
    
    // Basic Information
    if (!formData.name.trim()) newErrors.name = 'Child name is required';
    if (!formData.studentId.trim()) newErrors.studentId = 'Student ID is required';
    if (!formData.class) newErrors.class = 'Please select a class';
    
    // Age validation
    if (!formData.age.trim()) {
      newErrors.age = 'Age is required';
    } else if (isNaN(formData.age) || parseInt(formData.age) < 1 || parseInt(formData.age) > 18) {
      newErrors.age = 'Please enter a valid age (1-18)';
    }
    
    // Gender validation
    if (!formData.gender) {
      newErrors.gender = 'Please select gender';
    }
    
    // Transport Information
    if (!formData.busNumber) newErrors.busNumber = 'Please select a bus';
    
    // Emergency Contact
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
    Keyboard.dismiss();
    
    try {
      const response = await api.post('/parents/children', formData);
      await fetchChildren();
      Alert.alert(
        'Success',
        'Child added successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add child.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Child</Text>
            <View style={styles.placeholder} />
          </LinearGradient>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.form}>
              {/* Basic Information Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Information</Text>
                
                <InputField
                  label="Child's Full Name"
                  required
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter child's full name"
                  error={errors.name}
                  inputRef={nameRef}
                  nextRef={studentIdRef}
                />

                <InputField
                  label="Student ID"
                  required
                  value={formData.studentId}
                  onChangeText={(text) => setFormData({ ...formData, studentId: text })}
                  placeholder="Enter student ID"
                  error={errors.studentId}
                  inputRef={studentIdRef}
                  nextRef={ageRef}
                />

                {/* Age input field */}
                <InputField
                  label="Age"
                  required
                  value={formData.age}
                  onChangeText={(text) => setFormData({ ...formData, age: text })}
                  placeholder="Enter age"
                  keyboardType="numeric"
                  error={errors.age}
                  inputRef={ageRef}
                  nextRef={schoolRef}
                />

                {/* Gender Selection */}
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Gender <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.genderContainer}>
                    <TouchableOpacity
                      style={[
                        styles.genderOption,
                        formData.gender === 'Male' && styles.genderOptionSelected
                      ]}
                      onPress={() => setFormData({ ...formData, gender: 'Male' })}
                    >
                      <Text style={[
                        styles.genderText,
                        formData.gender === 'Male' && styles.genderTextSelected
                      ]}>Male</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.genderOption,
                        formData.gender === 'Female' && styles.genderOptionSelected
                      ]}
                      onPress={() => setFormData({ ...formData, gender: 'Female' })}
                    >
                      <Text style={[
                        styles.genderText,
                        formData.gender === 'Female' && styles.genderTextSelected
                      ]}>Female</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.genderOption,
                        formData.gender === 'Other' && styles.genderOptionSelected
                      ]}
                      onPress={() => setFormData({ ...formData, gender: 'Other' })}
                    >
                      <Text style={[
                        styles.genderText,
                        formData.gender === 'Other' && styles.genderTextSelected
                      ]}>Other</Text>
                    </TouchableOpacity>
                  </View>
                  {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Class/Grade <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, errors.class && styles.inputError]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowClassModal(true);
                    }}
                  >
                    <Text style={formData.class ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                      {formData.class || 'Tap to select class'}
                    </Text>
                  </TouchableOpacity>
                  {errors.class && <Text style={styles.errorText}>{errors.class}</Text>}
                </View>

                <InputField
                  label="School Name"
                  value={formData.school}
                  onChangeText={(text) => setFormData({ ...formData, school: text })}
                  placeholder="Enter school name"
                  inputRef={schoolRef}
                  nextRef={pickupRef}
                />
              </View>

              {/* Transport Information Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transport Information</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Bus Number/Route <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, errors.busNumber && styles.inputError]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowBusModal(true);
                    }}
                  >
                    <Text style={formData.busNumber ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
                      {formData.busNumber || 'Tap to select bus'}
                    </Text>
                  </TouchableOpacity>
                  {errors.busNumber && <Text style={styles.errorText}>{errors.busNumber}</Text>}
                </View>

                <InputField
                  label="Pickup Point"
                  value={formData.pickupPoint}
                  onChangeText={(text) => setFormData({ ...formData, pickupPoint: text })}
                  placeholder="Enter pickup location"
                  inputRef={pickupRef}
                  nextRef={dropoffRef}
                />

                <InputField
                  label="Dropoff Point"
                  value={formData.dropoffPoint}
                  onChangeText={(text) => setFormData({ ...formData, dropoffPoint: text })}
                  placeholder="Enter dropoff location"
                  inputRef={dropoffRef}
                  nextRef={emergencyNameRef}
                />
              </View>

              {/* Emergency Contact Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Emergency Contact</Text>

                <InputField
                  label="Emergency Contact Name"
                  required
                  value={formData.emergencyContact}
                  onChangeText={(text) => setFormData({ ...formData, emergencyContact: text })}
                  placeholder="Enter emergency contact name"
                  error={errors.emergencyContact}
                  inputRef={emergencyNameRef}
                  nextRef={emergencyPhoneRef}
                />

                <InputField
                  label="Emergency Phone Number"
                  required
                  value={formData.emergencyPhone}
                  onChangeText={(text) => setFormData({ ...formData, emergencyPhone: text })}
                  placeholder="e.g., 0712345678"
                  keyboardType="phone-pad"
                  error={errors.emergencyPhone}
                  inputRef={emergencyPhoneRef}
                  nextRef={medicalRef}
                />

                <InputField
                  label="Medical Notes / Special Requirements"
                  value={formData.medicalNotes}
                  onChangeText={(text) => setFormData({ ...formData, medicalNotes: text })}
                  placeholder="Any medical conditions or special needs"
                  multiline
                  numberOfLines={3}
                  inputRef={medicalRef}
                />
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={loading}
              >
                <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradient}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Add Child</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <PickerModal
            visible={showClassModal}
            title="Select Class"
            items={classes}
            selectedValue={formData.class}
            onSelect={(value) => setFormData({ ...formData, class: value })}
            onClose={() => setShowClassModal(false)}
          />

          <PickerModal
            visible={showBusModal}
            title="Select Bus"
            items={buses}
            selectedValue={formData.busNumber}
            onSelect={(value) => setFormData({ ...formData, busNumber: value })}
            onClose={() => setShowBusModal(false)}
          />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { paddingBottom: 30 },
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
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  form: { padding: 20 },
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 15 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 5 },
  required: { color: '#f44336' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#f44336', borderWidth: 1 },
  errorText: { color: '#f44336', fontSize: 12, marginTop: 5 },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pickerButtonText: { fontSize: 14, color: '#333' },
  pickerButtonPlaceholder: { fontSize: 14, color: '#999' },
  
  // Gender styles
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  genderOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  genderOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#fff',
  },
  
  submitButton: { height: 50, borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
  cancelButtonText: { color: '#666', fontSize: 16, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalCloseButton: { padding: 5 },
  modalCloseText: { fontSize: 18, color: '#999' },
  modalItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemSelected: { backgroundColor: '#e3f2fd' },
  modalItemText: { fontSize: 16, color: '#333' },
  modalItemTextSelected: { color: COLORS.primary, fontWeight: '600' },
});