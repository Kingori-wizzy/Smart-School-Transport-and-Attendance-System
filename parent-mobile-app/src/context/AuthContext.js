import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [childrenList, setChildrenList] = useState([]);
  const [token, setToken] = useState(null); // Store token explicitly

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@user');
      const storedToken = await AsyncStorage.getItem('@auth_token');
      
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        
        // Set token in api service
        api.setAuthToken(storedToken);
        
        // Verify token with backend
        try {
          await api.auth.verify();
          await fetchChildren();
        } catch (error) {
          console.error('Token verification failed:', error.response?.data || error.message);
          // Token invalid, clear storage
          await logout();
        }
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);
      
      const response = await api.auth.login(email, password);
      
      console.log('Login response:', response);
      
      const { token: authToken, user: userData } = response;
      
      if (!authToken || !userData) {
        console.error('Missing token or user in response:', response);
        return { success: false, message: 'Invalid response from server' };
      }
      
      // Store token
      await AsyncStorage.setItem('@auth_token', authToken);
      await AsyncStorage.setItem('@user', JSON.stringify(userData));
      
      // Set token in state and api service
      setToken(authToken);
      setUser(userData);
      api.setAuthToken(authToken);
      
      // Fetch children after successful login
      await fetchChildren();
      
      return { success: true, user: userData };
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
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove(['@auth_token', '@user', '@user_role']);
      setUser(null);
      setToken(null);
      setChildrenList([]);
      api.clearAuthToken();
    }
  };

  const fetchChildren = async () => {
    try {
      const response = await api.parent.getChildren();
      console.log('📋 Raw children response:', response);
      
      // Handle different response formats
      let childrenData = [];
      if (response && response.success && Array.isArray(response.data)) {
        childrenData = response.data;
      } else if (Array.isArray(response)) {
        childrenData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        childrenData = response.data;
      } else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        childrenData = response.data.data;
      }
      
      console.log('📋 Raw children data:', childrenData);
      
      // Transform children data to match the expected format for the dashboard
      const transformedChildren = childrenData.map(child => {
        // Extract bus information from transportDetails or direct fields
        let busNumber = null;
        let busId = null;
        let status = 'inactive';
        let pickupPoint = 'Not set';
        
        if (child.transportDetails) {
          busId = child.transportDetails.busId;
          busNumber = child.transportDetails.busNumber;
          status = child.transportDetails.status || 'inactive';
          pickupPoint = child.transportDetails.pickupPoint?.name || 'Not set';
        } else if (child.busId) {
          busId = child.busId;
          busNumber = child.busNumber;
        }
        
        return {
          id: child._id || child.id,
          _id: child._id || child.id,
          firstName: child.firstName || '',
          lastName: child.lastName || '',
          fullName: child.fullName || `${child.firstName || ''} ${child.lastName || ''}`.trim(),
          displayName: child.firstName || 'Student',
          classLevel: child.classLevel || 'N/A',
          stream: child.stream || '',
          admissionNumber: child.admissionNumber || 'N/A',
          usesTransport: child.usesTransport !== false,
          busId: busId,
          busNumber: busNumber,
          status: status,
          pickupPoint: pickupPoint,
          isActive: child.isActive !== false,
          parentId: child.parentId,
          // Store transport details for tracking
          transportDetails: child.transportDetails || null
        };
      });
      
      console.log('📋 Transformed children:', transformedChildren);
      setChildrenList(transformedChildren);
      return transformedChildren;
    } catch (error) {
      console.error('Error fetching children:', error.message);
      return [];
    }
  };

  const register = async (userData) => {
    try {
      const registrationData = {
        ...userData,
        role: 'parent'
      };
      
      console.log('Registration data sent:', registrationData);
      
      const data = await api.auth.register(registrationData);
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
      await api.auth.forgotPassword(email);
      return { success: true };
    } catch (error) {
      console.error('Forgot password error:', error.message);
      return { 
        success: false, 
        message: error.message || 'Request failed' 
      };
    }
  };

  const resetPassword = async (email, code, newPassword) => {
    try {
      await api.auth.resetPassword(email, code, newPassword);
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
      const data = await api.auth.verify();
      if (data.valid) {
        setUser(data.user);
        await fetchChildren();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return false;
    }
  };

  // Helper to check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!token;
  };

  // Helper to get user role
  const getUserRole = () => {
    return user?.role || null;
  };

  // Helper to get user name
  const getUserName = () => {
    return user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null;
  };

  // Helper to get child by ID
  const getChildById = (childId) => {
    return childrenList.find(child => child.id === childId || child._id === childId);
  };

  // Helper to refresh just the children list
  const refreshChildren = async () => {
    return await fetchChildren();
  };

  // Helper to get auth token
  const getAuthToken = () => token;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      childrenList,
      isAuthenticated,
      getUserRole,
      getUserName,
      getChildById,
      getAuthToken,
      login,
      logout,
      register,
      forgotPassword,
      resetPassword,
      fetchChildren,
      refreshChildren,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};