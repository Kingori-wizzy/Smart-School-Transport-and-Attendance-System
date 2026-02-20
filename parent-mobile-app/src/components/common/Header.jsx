import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/config';

export default function Header({
  title,
  subtitle,
  leftIcon,
  onLeftPress,
  rightIcon,
  onRightPress,
  gradient = true,
}) {
  const content = (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftContainer}>
          {leftIcon && (
            <TouchableOpacity onPress={onLeftPress} style={styles.iconButton}>
              <Text style={styles.icon}>{leftIcon}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.centerContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <View style={styles.rightContainer}>
          {rightIcon && (
            <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
              <Text style={styles.icon}>{rightIcon}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );

  if (gradient) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.gradient}
      >
        {content}
      </LinearGradient>
    );
  }

  return <View style={styles.plainHeader}>{content}</View>;
}

const styles = StyleSheet.create({
  gradient: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  plainHeader: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  safeArea: {
    paddingTop: 20,
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  leftContainer: {
    width: 50,
    alignItems: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  rightContainer: {
    width: 50,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    color: '#fff',
  },
});