import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useChildren } from '../../context/ChildrenContext';
import { useAuth } from '../../context/AuthContext';

const LinkChildScreen = ({ navigation }) => {
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState('input');
  const [verifiedStudent, setVerifiedStudent] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { refreshChildren } = useChildren();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    console.log('🔐 LinkChildScreen mounted');
    console.log('   User:', user ? `${user.firstName} ${user.lastName}` : 'No user');
    console.log('   Authenticated:', isAuthenticated());
    
    if (!isAuthenticated()) {
      Alert.alert(
        'Session Expired',
        'Please log in again to continue.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [user, isAuthenticated, navigation]);

  const handleVerify = async () => {
    if (!admissionNumber.trim()) {
      Alert.alert('Error', 'Please enter an admission number');
      return;
    }

    if (!isAuthenticated()) {
      Alert.alert('Session Expired', 'Please log in again to continue.');
      return;
    }

    setLoading(true);
    setVerificationStep('verifying');
    setErrorMessage('');

    try {
      console.log('🔍 Verifying admission:', admissionNumber);
      
      // api.post automatically attaches the token via interceptor
      const response = await api.post('/students/verify-admission', {
        admissionNumber: admissionNumber.trim().toUpperCase(),
        studentName: studentName.trim() || undefined
      });

      console.log('✅ Verification response:', response);

      if (response.success) {
        setVerifiedStudent(response.data);
        setVerificationStep('success');
        await refreshChildren();
        console.log('✅ Children list refreshed');
      } else {
        throw new Error(response.message || 'Verification failed');
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      
      let errorMsg = 'Failed to verify admission number';
      if (error.message === 'Request timeout') {
        errorMsg = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      Alert.alert('Verification Failed', errorMsg);
      setVerificationStep('input');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAnother = () => {
    setAdmissionNumber('');
    setStudentName('');
    setVerifiedStudent(null);
    setVerificationStep('input');
    setErrorMessage('');
  };

  const renderInputStep = () => (
    <View style={styles.formContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="school-outline" size={80} color="#4CAF50" />
      </View>
      
      <Text style={styles.title}>Link Your Child</Text>
      <Text style={styles.subtitle}>
        Enter the admission number provided by your school
      </Text>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={20} color="#f44336" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.inputContainer}>
        <Ionicons name="card-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Admission Number (e.g., 2024/4A/001)"
          value={admissionNumber}
          onChangeText={setAdmissionNumber}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Child's Name (optional, for verification)"
          value={studentName}
          onChangeText={setStudentName}
          autoCapitalize="words"
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.verifyButtonText}>Verify & Link</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={loading}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerifyingStep = () => (
    <View style={styles.verifyingContainer}>
      <ActivityIndicator size="large" color="#4CAF50" />
      <Text style={styles.verifyingText}>Verifying admission number...</Text>
      <Text style={styles.verifyingSubtext}>Please wait, this may take a few seconds</Text>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIconContainer}>
        <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />
      </View>
      
      <Text style={styles.successTitle}>Success!</Text>
      <Text style={styles.successSubtitle}>
        Your child has been linked successfully
      </Text>

      {verifiedStudent && (
        <View style={styles.studentCard}>
          <Text style={styles.studentName}>{verifiedStudent.name}</Text>
          <Text style={styles.studentClass}>
            Class: {verifiedStudent.class} {verifiedStudent.stream || ''}
          </Text>
          <Text style={styles.studentAdmission}>
            Admission: {verifiedStudent.admissionNumber}
          </Text>
          
          {verifiedStudent.busAssigned ? (
            <View style={styles.busInfo}>
              <Ionicons name="bus-outline" size={16} color="#4CAF50" />
              <Text style={styles.busInfoText}>Bus assigned: {verifiedStudent.busNumber || 'Yes'}</Text>
            </View>
          ) : (
            <Text style={styles.pendingText}>
              Bus assignment pending. Contact school admin.
            </Text>
          )}
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => {
            refreshChildren();
            navigation.replace('MainTabs');
          }}
        >
          <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkAnotherButton}
          onPress={handleLinkAnother}
        >
          <Text style={styles.linkAnotherButtonText}>Link Another Child</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {verificationStep === 'input' && renderInputStep()}
        {verificationStep === 'verifying' && renderVerifyingStep()}
        {verificationStep === 'success' && renderSuccessStep()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  keyboardView: { flex: 1 },
  formContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { flex: 1, color: '#f44336', fontSize: 14, marginLeft: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16 },
  verifyButton: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  verifyButtonDisabled: { backgroundColor: '#a5d6a7' },
  verifyButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  cancelButton: { marginTop: 15, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontSize: 16 },
  verifyingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  verifyingText: { marginTop: 20, fontSize: 16, color: '#666' },
  verifyingSubtext: { marginTop: 8, fontSize: 12, color: '#999' },
  successContainer: { flex: 1, padding: 20, justifyContent: 'center' },
  successIconContainer: { alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 10 },
  successSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  studentCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  studentName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  studentClass: { fontSize: 16, color: '#666', marginBottom: 4 },
  studentAdmission: { fontSize: 14, color: '#999', marginBottom: 12 },
  busInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', padding: 10, borderRadius: 8, marginTop: 10 },
  busInfoText: { marginLeft: 8, color: '#2e7d32', fontSize: 14, fontWeight: '500' },
  pendingText: { color: '#f57c00', fontSize: 14, fontStyle: 'italic', marginTop: 10 },
  actionButtons: { gap: 12 },
  dashboardButton: { backgroundColor: '#2196F3', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  dashboardButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkAnotherButton: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  linkAnotherButtonText: { color: '#666', fontSize: 16 },
});

export default LinkChildScreen;