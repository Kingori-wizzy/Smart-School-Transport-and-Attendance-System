import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CacheIndicator({ isFromCache, timestamp }) {
  if (!isFromCache) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        ⚡ Cached data {timestamp ? `· ${timestamp}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
  },
  text: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
});