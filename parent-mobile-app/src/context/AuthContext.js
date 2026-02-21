import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [childrenList, setChildrenList] = useState([]);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@user');
      const token = await AsyncStorage.getItem('@auth_token');
      
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
        // Verify token with backend
        try {
          await api.get('/auth/verify');
          await fetchChildren();
        } catch (error) {
          console.error('Token verification failed:', error.response?.data || error.message);
          // Token invalid, clear storage
          await AsyncStorage.multiRemove(['@auth_token', '@user']);
        }
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED LOGIN FUNCTION
  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      
      // api.post returns the data directly, NOT response.data
      const data = await api.post('/auth/login', { email, password });
      
      console.log('Login response data:', data);
      
      // Extract token and user from the response data
      const { token, user } = data;
      
      if (!token || !user) {
        console.error('Missing token or user in response:', data);
        return { success: false, message: 'Invalid response from server' };
      }
      
      await AsyncStorage.multiSet([
        ['@auth_token', token],
        ['@user', JSON.stringify(user)]
      ]);
      
      setUser(user);
      
      // Fetch children after successful login
      await fetchChildren();
      
      return { success: true };
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data
      });
      
      return { 
        success: false, 
        message: error.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove(['@auth_token', '@user']);
      setUser(null);
      setChildrenList([]);
    }
  };

  const fetchChildren = async () => {
    try {
      const data = await api.get('/parents/children');
      setChildrenList(data);
      return data;
    } catch (error) {
      console.error('Error fetching children:', error.message);
      return [];
    }
  };

  const register = async (userData) => {
    try {
      // Ensure role is set to 'parent'
      const registrationData = {
        ...userData,
        role: 'parent'
      };
      
      console.log('Registration data sent:', registrationData);
      
      const data = await api.post('/auth/register', registrationData);
      console.log('Registration response:', data);
      
      return { success: true, data };
    } catch (error) {
      console.error('Registration error:', error.message);
      return { 
        success: false, 
        message: error.message || 'Registration failed' 
      };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error.message);
      return { 
        success: false, 
        message: error.message || 'Request failed' 
      };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error.message);
      return { 
        success: false, 
        message: error.message || 'Reset failed' 
      };
    }
  };

  const refreshUser = async () => {
    try {
      const data = await api.get('/auth/verify');
      if (data.valid) {
        setUser(data.user);
        await fetchChildren();
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      childrenList,
      login,
      logout,
      register,
      forgotPassword,
      resetPassword,
      fetchChildren,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};