import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/constants';

export default function ProgressBar({ progress, total, boarded, label }) {
  const percentage = total > 0 ? (boarded / total) * 100 : 0;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${percentage}%` }]} />
      </View>
      <View style={styles.stats}>
        <Text style={styles.statsText}>📊 {boarded}/{total} boarded</Text>
        <Text style={styles.statsText}>{Math.round(percentage)}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  progressBar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: COLORS.primary },
  stats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  statsText: { fontSize: 12, color: '#666' },
});