import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';

export default function OfflineBanner({ onRetry }) {
  const netInfo = useNetInfo();

  if (netInfo.isConnected && netInfo.isInternetReachable) return null;

  return (
    <TouchableOpacity style={styles.banner} onPress={onRetry} activeOpacity={0.9}>
      <Text style={styles.message}>📶 You're offline. Some features may be limited.</Text>
      {onRetry && <Text style={styles.retry}>⟳ Retry</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f44336', paddingHorizontal: 15, paddingVertical: 10 },
  message: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1 },
  retry: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 10 },
});