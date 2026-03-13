// File: C:\Developer\SmartSchoolTransportandAttendanceSystem\frontend\src\hooks\useAuthHooks.js

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Hook to require authentication for a route
 * @param {string} redirectTo - Where to redirect if not authenticated
 * @returns {Object} - Authentication state
 */
export const useRequireAuth = (redirectTo = '/login') => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(redirectTo);
    }
  }, [isAuthenticated, loading, navigate, redirectTo]);

  return { isAuthenticated, loading };
};

/**
 * Hook to require specific role for a route
 * @param {string|string[]} roles - Required role(s)
 * @param {string} redirectTo - Where to redirect if unauthorized
 * @returns {Object} - Access state
 */
export const useRequireRole = (roles, redirectTo = '/dashboard') => {
  const { hasRole, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate('/login');
      } else if (!hasRole(roles)) {
        navigate(redirectTo);
      }
    }
  }, [isAuthenticated, hasRole, loading, navigate, redirectTo, roles]);

  return { hasAccess: hasRole(roles), loading };
};