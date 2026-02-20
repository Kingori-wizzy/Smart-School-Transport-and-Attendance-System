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
        await fetchChildren();
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user } = response.data;
      
      await AsyncStorage.multiSet([
        ['@auth_token', token],
        ['@user', JSON.stringify(user)]
      ]);
      
      setUser(user);
      await fetchChildren();
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
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
      const response = await api.get('/parents/children');
      setChildrenList(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching children:', error);
      return [];
    }
  };

  const register = async (userData) => {
    try {
      // Use the correct endpoint from your backend
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Request failed' 
      };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Reset failed' 
      };
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
    }}>
      {children}
    </AuthContext.Provider>
  );
};