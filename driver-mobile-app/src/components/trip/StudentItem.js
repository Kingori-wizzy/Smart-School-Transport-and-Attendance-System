import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { COLORS } from '../../utils/constants';

export default function StudentItem({ student, onBoard, showBoardButton = true }) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
        </Text>
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{student.firstName} {student.lastName}</Text>
        <Text style={styles.details}>Class: {student.classLevel}</Text>
        <Text style={styles.details}>Pickup: {student.pickupPoint}</Text>
      </View>

      {student.boarded ? (
        <View style={styles.boardedBadge}>
          <Text style={styles.boardedText}>✅ Boarded</Text>
        </View>
      ) : showBoardButton ? (
        <TouchableOpacity
          style={styles.boardButton}
          onPress={() => onBoard(student)}
        >
          <Text style={styles.boardButtonText}>Board</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
  avatarContainer: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '500', color: '#333', marginBottom: 2 },
  details: { fontSize: 12, color: '#666', marginBottom: 2 },
  boardedBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  boardedText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  boardButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5 },
  boardButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});