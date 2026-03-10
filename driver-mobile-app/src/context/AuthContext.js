import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import api from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);

  useEffect(() => {
    checkBiometrics();
    loadStoredData();
  }, []);

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  };

  const loadStoredData = async () => {
    try {
      const storedDriver = await AsyncStorage.getItem('@driver');
      const token = await AsyncStorage.getItem('@auth_token');
      
      if (storedDriver && token) {
        setDriver(JSON.parse(storedDriver));
        await fetchCurrentTrip();
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Attempting login with', email);
      
      // ✅ FIXED: Use the correct endpoint
      const response = await api.post('/auth/login', { email, password });
      
      console.log('✅ AuthContext: Login response:', response.data);
      
      const { token, user } = response.data;
      
      if (!token) {
        console.error('❌ AuthContext: No token in response');
        return { 
          success: false, 
          message: 'Invalid server response: no token received' 
        };
      }
      
      await AsyncStorage.multiSet([
        ['@auth_token', token],
        ['@driver', JSON.stringify(user)]
      ]);
      
      setDriver(user);
      await fetchCurrentTrip();
      
      return { success: true };
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error.message);
      console.error('❌ Response:', error.response?.data);
      
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const loginWithBiometrics = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const credentials = await AsyncStorage.getItem('@driver_credentials');
        if (credentials) {
          const { email, password } = JSON.parse(credentials);
          return await login(email, password);
        }
      }
      return { success: false, message: 'Biometric authentication failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const saveCredentials = async (email, password) => {
    await AsyncStorage.setItem('@driver_credentials', JSON.stringify({ email, password }));
  };

  const fetchCurrentTrip = async () => {
    try {
      const response = await api.get('/driver/current-trip');
      setCurrentTrip(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching current trip:', error);
      return null;
    }
  };

  const startTrip = async (tripId) => {
    try {
      const response = await api.post(`/driver/trip/${tripId}/start`);
      setCurrentTrip(response.data);
      return { success: true, trip: response.data };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to start trip' 
      };
    }
  };

  const endTrip = async (tripId) => {
    try {
      const response = await api.post(`/driver/trip/${tripId}/end`);
      setCurrentTrip(null);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to end trip' 
      };
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['@auth_token', '@driver']);
    setDriver(null);
    setCurrentTrip(null);
  };

  return (
    <AuthContext.Provider value={{
      driver,
      loading,
      currentTrip,
      biometricAvailable,
      login,
      loginWithBiometrics,
      saveCredentials,
      startTrip,
      endTrip,
      fetchCurrentTrip,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};