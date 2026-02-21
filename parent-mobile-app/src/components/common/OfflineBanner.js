import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useOffline } from '../../hooks/useOffline';

export default function OfflineBanner({ onRetry }) {
  const { isOffline, socketConnected, connectionType } = useOffline();

  if (!isOffline && socketConnected) return null;

  let message = '';
  let backgroundColor = '#f44336';

  if (isOffline && !socketConnected) {
    message = '📶 You are offline. Using cached data.';
  } else if (isOffline) {
    message = '📶 No internet connection';
  } else if (!socketConnected) {
    message = '🔌 Real-time updates disconnected';
    backgroundColor = '#FF9800';
  }

  return (
    <TouchableOpacity 
      style={[styles.banner, { backgroundColor }]} 
      onPress={onRetry}
      activeOpacity={0.9}
    >
      <Text style={styles.message}>{message}</Text>
      {onRetry && <Text style={styles.retry}>⟳ Retry</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  message: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  retry: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});