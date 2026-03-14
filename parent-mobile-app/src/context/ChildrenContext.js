import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const ChildrenContext = createContext();

export const useChildren = () => {
  const context = useContext(ChildrenContext);
  if (!context) {
    throw new Error('useChildren must be used within a ChildrenProvider');
  }
  return context;
};

export const ChildrenProvider = ({ children }) => {
  const [childrenList, setChildrenList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, token } = useAuth();

  const fetchChildren = useCallback(async () => {
    if (!user || !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Now that the backend is fixed, this GET request will return 200 OK
      const response = await api.get('/api/parents/children');

      // The backend returns { success: true, data: [...], pagination: {...} }
      // Axios puts the whole JSON in response.data
      let childrenData = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        childrenData = response.data.data;
      } else if (Array.isArray(response.data)) {
        childrenData = response.data;
      }

      const transformedChildren = childrenData.map(child => ({
        id: child._id || child.id,
        _id: child._id || child.id,
        firstName: child.firstName || '',
        lastName: child.lastName || '',
        fullName: child.fullName || `${child.firstName} ${child.lastName}`.trim(),
        displayName: child.firstName || 'Student',
        // Updated to match your new Student.js schema fields
        classLevel: child.classLevel || 'N/A',
        stream: child.stream || '',
        admissionNumber: child.admissionNumber || 'N/A',
        // Transport logic matching your new transportDetails nested object
        usesTransport: child.usesTransport || false,
        busId: child.transportDetails?.busId || child.busId || null,
        status: child.transportDetails?.status || 'inactive',
        pickupPoint: child.transportDetails?.pickupPoint?.name || child.pickupPoint || 'Not set',
        isActive: child.isActive !== false,
      }));

      setChildrenList(transformedChildren);
    } catch (err) {
      console.error('❌ Error fetching children:', err);
      // Fallback for 404/legacy if needed
      if (err.response?.status === 404) {
         setError("Endpoint not found. Check API routes.");
      } else {
         setError(err.response?.data?.message || 'Failed to load children data');
      }
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  // Memoized filters for the dashboard
  const activeChildren = useMemo(() => 
    childrenList.filter(child => child.isActive), [childrenList]
  );

  const getChildById = useCallback((childId) => {
    return childrenList.find(child => child.id === childId || child._id === childId) || null;
  }, [childrenList]);

  const refreshChildren = useCallback(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const value = {
    childrenList,
    loading,
    error,
    refreshChildren,
    getChildById,
    activeChildren,
    totalCount: childrenList.length
  };

  return (
    <ChildrenContext.Provider value={value}>
      {children}
    </ChildrenContext.Provider>
  );
};