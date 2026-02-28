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
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/config';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  
  const { login, loginWithBiometrics, biometricAvailable, saveCredentials } = useAuth();

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricSupported(compatible && enrolled);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      await saveCredentials(email, password);
      Alert.alert('Success', 'Logged in successfully');
    } else {
      Alert.alert('Login Failed', result.message);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    const result = await loginWithBiometrics();
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Logged in with biometrics');
    } else {
      Alert.alert('Biometric Failed', result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <Text style={styles.appName}>Driver App</Text>
        <Text style={styles.tagline}>Smart School Transport</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={styles.title}>Driver Login</Text>
        <Text style={styles.subtitle}>Sign in to start your trips</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="driver@school.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.gradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Sign In</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {biometricSupported && biometricAvailable && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
            disabled={loading}
          >
            <Text style={styles.biometricText}>🔒 Login with Fingerprint</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 200, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  formContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 30 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  loginButton: { height: 50, borderRadius: 10, overflow: 'hidden', marginBottom: 15 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  biometricButton: { height: 50, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  biometricText: { color: COLORS.primary, fontSize: 16, fontWeight: '500' },
});