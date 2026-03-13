import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';
import { dispatchAuthEvent } from '../utils/authEvents';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Removed unused 'token' state - we can get it from localStorage when needed

  // Verify token with backend
  const verifyToken = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return false;

    try {
      // Try to get user data from token verification endpoint
      const response = await api.get('/auth/verify');
      
      if (response.data?.success && response.data?.user) {
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return false;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (!storedToken) {
        setLoading(false);
        return;
      }

      const isValid = await verifyToken();
      
      if (!isValid) {
        // Token invalid, clear storage
        localStorage.removeItem('token');
        setUser(null);
      }
      
      setLoading(false);
    };

    initAuth();
  }, [verifyToken]);

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Handle response
      const { token: newToken, user: userData } = response.data;
      
      if (!newToken) {
        throw new Error('No token received from server');
      }

      // Store token
      localStorage.setItem('token', newToken);
      
      // Set user data
      if (userData) {
        setUser(userData);
      }

      // Dispatch auth event for socket
      dispatchAuthEvent('login');
      
      return { success: true };
      
    } catch (error) {
      const message = error.response?.data?.message || 
                     error.message || 
                     'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    dispatchAuthEvent('logout');
  };

  // Register function (if needed)
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/register', userData);
      
      const responseData = response.data?.data || response.data;
      const newToken = responseData?.token || response.data?.token;
      const userDataResponse = responseData?.user || response.data?.user;
      
      if (newToken) {
        localStorage.setItem('token', newToken);
      }
      
      if (userDataResponse) {
        setUser(userDataResponse);
      }
      
      dispatchAuthEvent('register');
      
      return { success: true, data: responseData };
      
    } catch (error) {
      console.error('❌ Registration error:', error);
      const message = error.response?.data?.message || 
                     error.response?.data?.error || 
                     error.message || 
                     'Registration failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateUser = async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      if (response.data?.user) {
        setUser(response.data.user);
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Profile update error:', error);
      const message = error.response?.data?.message || 'Update failed';
      return { success: false, error: message };
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ Password change error:', error);
      const message = error.response?.data?.message || 'Password change failed';
      return { success: false, error: message };
    }
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh-token');
      const newToken = response.data?.token;
      
      if (newToken) {
        localStorage.setItem('token', newToken);
        dispatchAuthEvent('token-refresh');
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return { success: false };
    }
  };

  // Check if user has specific role
  const hasRole = useCallback((roles) => {
    if (!user || !user.role) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  }, [user]);

  // Check if authenticated
  const isAuthenticated = !!localStorage.getItem('token') && !!user;

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    register,
    updateUser,
    changePassword,
    refreshToken,
    hasRole,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// REMOVED: useRequireAuth and useRequireRole hooks
// These should be in a separate file to avoid Fast Refresh warnings