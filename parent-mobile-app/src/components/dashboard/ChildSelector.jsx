import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

export default function ChildSelector({ children, selectedChild, onSelectChild }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      {children.map((child) => (
        <TouchableOpacity
          key={child.id}
          style={[
            styles.childChip,
            selectedChild?.id === child.id && styles.selectedChildChip,
          ]}
          onPress={() => onSelectChild(child)}
        >
          <Text style={[
            styles.childName,
            selectedChild?.id === child.id && styles.selectedChildName,
          ]}>
            {child.name}
          </Text>
          <Text style={[
            styles.childClass,
            selectedChild?.id === child.id && styles.selectedChildClass,
          ]}>
            {child.class}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    maxHeight: 80,
  },
  childChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  selectedChildChip: {
    backgroundColor: '#fff',
  },
  childName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedChildName: {
    color: '#667eea',
  },
  childClass: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  selectedChildClass: {
    color: '#999',
  },
});