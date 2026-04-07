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
import { useTheme } from '../../context/ThemeContext';
import { COLORS } from '../../constants/config';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  
  const { login, loginWithBiometrics, biometricAvailable, saveCredentials } = useAuth();
  const { colors, isDarkMode } = useTheme();

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

    console.log('LoginScreen: Attempting login with email:', email);
    setLoading(true);
    
    try {
      const result = await login(email, password);
      console.log('LoginScreen: Login result:', result);
      
      if (result && result.success) {
        console.log('LoginScreen: Login successful, saving credentials...');
        if (biometricSupported) {
          await saveCredentials(email, password);
        }
      } else {
        console.log('LoginScreen: Login failed:', result?.message || 'Unknown error');
        // Show specific error message from backend
        Alert.alert('Login Failed', result?.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('LoginScreen: Unexpected error:', error);
      
      // Extract specific error message from response
      let errorMessage = 'An unexpected error occurred';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithBiometrics();
      console.log('LoginScreen: Biometric login result:', result);
      
      if (result.success) {
        Alert.alert('Success', 'Logged in with biometrics');
      } else {
        Alert.alert('Biometric Failed', result.message);
      }
    } catch (error) {
      console.error('LoginScreen: Biometric error:', error);
      Alert.alert('Error', 'Biometric login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <Text style={styles.appName}>Driver App</Text>
        <Text style={styles.tagline}>Smart School Transport</Text>
      </LinearGradient>

      <View style={styles.formContainer}>
        <Text style={[styles.title, { color: colors.text }]}>Driver Login</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Sign in to start your trips</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[styles.input, { 
              borderColor: colors.border,
              backgroundColor: colors.card,
              color: colors.text
            }]}
            placeholder="driver@demo.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
          <TextInput
            style={[styles.input, { 
              borderColor: colors.border,
              backgroundColor: colors.card,
              color: colors.text
            }]}
            placeholder="password"
            placeholderTextColor={colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => navigation.navigate('ForgotPassword')}
        >
          <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.gradient}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Sign In</Text>}
          </LinearGradient>
        </TouchableOpacity>

        {biometricSupported && biometricAvailable && (
          <TouchableOpacity
            style={[styles.biometricButton, { borderColor: colors.primary }]}
            onPress={handleBiometricLogin}
            disabled={loading}
          >
            <Text style={[styles.biometricText, { color: colors.primary }]}>
              Login with Fingerprint
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    height: 200, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30 
  },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  formContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 30 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 16, marginBottom: 30 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  forgotPassword: { alignItems: 'flex-end', marginBottom: 20 },
  forgotPasswordText: { fontSize: 14, fontWeight: '500' },
  loginButton: { height: 50, borderRadius: 10, overflow: 'hidden', marginBottom: 15 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loginText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  biometricButton: { height: 50, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  biometricText: { fontSize: 16, fontWeight: '500' },
});