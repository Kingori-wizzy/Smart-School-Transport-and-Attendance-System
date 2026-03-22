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
  const { user, isAuthenticated } = useAuth();

  const fetchChildren = useCallback(async () => {
    if (!isAuthenticated() || !user) {
      console.log('⚠️ Not authenticated, skipping fetchChildren');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Fetching children from /parents/children');
      const response = await api.get('/parents/children');
      console.log('📋 Raw children response:', response);
      
      // Handle different response formats - FIXED
      let childrenData = [];
      
      // Check the structure from your logs: { success: true, data: [...], pagination: {...} }
      if (response && response.success === true && Array.isArray(response.data)) {
        childrenData = response.data;
        console.log('✅ Found children in response.data');
      } 
      // Fallback: if response itself is an array
      else if (Array.isArray(response)) {
        childrenData = response;
        console.log('✅ Response is array directly');
      }
      // Fallback: if response has data property that is array
      else if (response && response.data && Array.isArray(response.data)) {
        childrenData = response.data;
        console.log('✅ Found children in response.data (nested)');
      }
      
      console.log(`📋 Found ${childrenData.length} children in API response`);
      
      // Transform children data to match the expected format
      const transformedChildren = childrenData.map(child => {
        // Extract bus information from transportDetails or direct fields
        let busNumber = null;
        let busId = null;
        let status = 'inactive';
        let pickupPoint = 'Not set';
        let dropoffPoint = 'Not set';
        
        // Check transportDetails first
        if (child.transportDetails) {
          busId = child.transportDetails.busId?._id || child.transportDetails.busId;
          busNumber = child.transportDetails.busNumber;
          status = child.transportDetails.status || 'inactive';
          pickupPoint = child.transportDetails.pickupPoint?.name || child.pickupPoint || 'Not set';
          dropoffPoint = child.transportDetails.dropoffPoint?.name || child.dropOffPoint || 'Not set';
        } 
        // Fallback to direct fields
        else if (child.busId) {
          busId = child.busId?._id || child.busId;
          busNumber = child.busNumber;
          pickupPoint = child.pickupPoint || 'Not set';
          dropoffPoint = child.dropOffPoint || 'Not set';
        }
        
        // Check if student has bus assigned
        const hasBus = !!(busNumber || busId);
        
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
          hasBus: hasBus,
          status: status,
          pickupPoint: pickupPoint,
          dropoffPoint: dropoffPoint,
          isActive: child.isActive !== false,
          parentId: child.parentId,
          // Store transport details for tracking
          transportDetails: child.transportDetails || null
        };
      });
      
      console.log('✅ Transformed children:', transformedChildren.length, 'children');
      if (transformedChildren.length > 0) {
        console.log('📋 Sample child:', {
          name: transformedChildren[0].firstName,
          busNumber: transformedChildren[0].busNumber,
          hasBus: transformedChildren[0].hasBus,
          status: transformedChildren[0].status
        });
      }
      
      setChildrenList(transformedChildren);
      return transformedChildren;
    } catch (err) {
      console.error('❌ Error fetching children:', err);
      console.error('❌ Error details:', err.response?.data || err.message);
      if (err.response?.status === 404) {
        setError("Endpoint not found. Please contact support.");
      } else {
        setError(err.response?.data?.message || 'Failed to load children data');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const activeChildren = useMemo(() => 
    childrenList.filter(child => child.isActive), [childrenList]
  );

  const getChildById = useCallback((childId) => {
    return childrenList.find(child => child.id === childId || child._id === childId) || null;
  }, [childrenList]);

  const refreshChildren = useCallback(async () => {
    console.log('🔄 Manually refreshing children...');
    return await fetchChildren();
  }, [fetchChildren]);

  // Fetch children when user is authenticated
  useEffect(() => {
    if (isAuthenticated() && user) {
      console.log('👤 User authenticated, fetching children');
      fetchChildren();
    } else {
      console.log('👤 No user or not authenticated, clearing children list');
      setChildrenList([]);
      setLoading(false);
    }
  }, [isAuthenticated, user, fetchChildren]);

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