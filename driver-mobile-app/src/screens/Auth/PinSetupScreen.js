import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../utils/constants';
import * as Haptics from 'expo-haptics';

export default function PinSetupScreen({ navigation }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('create'); // create, confirm, success
  const [loading, setLoading] = useState(false);
  const pinLength = 6;

  const handleKeyPress = (digit) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (step === 'create' && pin.length < pinLength) {
      setPin(pin + digit);
    } else if (step === 'confirm' && confirmPin.length < pinLength) {
      setConfirmPin(confirmPin + digit);
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'create') {
      setPin(pin.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleNext = async () => {
    if (step === 'create') {
      if (pin.length === pinLength) {
        setStep('confirm');
      } else {
        Vibration.vibrate();
        Alert.alert('Error', `Please enter ${pinLength} digits`);
      }
    } else if (step === 'confirm') {
      if (confirmPin.length === pinLength) {
        if (pin === confirmPin) {
          await savePin();
        } else {
          Vibration.vibrate();
          Alert.alert('Error', 'PINs do not match', [
            { text: 'Try Again', onPress: () => {
              setPin('');
              setConfirmPin('');
              setStep('create');
            }}
          ]);
        }
      } else {
        Vibration.vibrate();
        Alert.alert('Error', `Please enter ${pinLength} digits`);
      }
    }
  };

  const savePin = async () => {
    setLoading(true);
    try {
      // Save PIN to backend
      const response = await api.post('/auth/set-pin', { pin });
      if (response.data.success) {
        setStep('success');
        setTimeout(() => {
          navigation.replace('MainTabs');
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Failed to save PIN');
      }
    } catch (error) {
      console.error('Error saving PIN:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save PIN');
    } finally {
      setLoading(false);
    }
  };

  const renderDots = () => {
    const dots = [];
    const currentLength = step === 'create' ? pin.length : confirmPin.length;
    
    for (let i = 0; i < pinLength; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            i < currentLength && styles.dotFilled,
          ]}
        />
      );
    }
    return dots;
  };

  const KeypadButton = ({ digit, letters }) => (
    <TouchableOpacity
      style={styles.keypadButton}
      onPress={() => handleKeyPress(digit)}
    >
      <Text style={styles.keypadDigit}>{digit}</Text>
      {letters && <Text style={styles.keypadLetters}>{letters}</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Setup PIN</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.content}>
        {step === 'success' ? (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>PIN Setup Complete</Text>
            <Text style={styles.successText}>You can now login with biometrics</Text>
          </View>
        ) : (
          <>
            <Text style={styles.instruction}>
              {step === 'create' ? 'Create a 6-digit PIN' : 'Confirm your PIN'}
            </Text>

            <View style={styles.dotsContainer}>
              {renderDots()}
            </View>

            <View style={styles.keypad}>
              <View style={styles.keypadRow}>
                <KeypadButton digit="1" letters="" />
                <KeypadButton digit="2" letters="ABC" />
                <KeypadButton digit="3" letters="DEF" />
              </View>
              <View style={styles.keypadRow}>
                <KeypadButton digit="4" letters="GHI" />
                <KeypadButton digit="5" letters="JKL" />
                <KeypadButton digit="6" letters="MNO" />
              </View>
              <View style={styles.keypadRow}>
                <KeypadButton digit="7" letters="PQRS" />
                <KeypadButton digit="8" letters="TUV" />
                <KeypadButton digit="9" letters="WXYZ" />
              </View>
              <View style={styles.keypadRow}>
                <TouchableOpacity style={styles.keypadButton} onPress={() => {}}>
                  <Text style={styles.keypadDigit}>○</Text>
                </TouchableOpacity>
                <KeypadButton digit="0" letters="" />
                <TouchableOpacity style={styles.keypadButton} onPress={handleDelete}>
                  <Text style={styles.keypadDigit}>⌫</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.nextButton,
                ((step === 'create' && pin.length === pinLength) ||
                 (step === 'confirm' && confirmPin.length === pinLength)) &&
                styles.nextButtonActive
              ]}
              onPress={handleNext}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>
                  {step === 'create' ? 'Next' : 'Confirm'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: { 
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  backIcon: { 
    fontSize: 24, 
    color: '#fff' 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  content: { 
    flex: 1, 
    padding: 20, 
    justifyContent: 'center' 
  },
  instruction: { 
    fontSize: 18, 
    color: '#333', 
    textAlign: 'center', 
    marginBottom: 30 
  },
  dotsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 40 
  },
  dot: { 
    width: 15, 
    height: 15, 
    borderRadius: 7.5, 
    backgroundColor: '#e0e0e0', 
    marginHorizontal: 8 
  },
  dotFilled: { 
    backgroundColor: COLORS.primary 
  },
  keypad: { 
    marginBottom: 30 
  },
  keypadRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 15 
  },
  keypadButton: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    backgroundColor: '#f5f5f5', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  keypadDigit: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  keypadLetters: { 
    fontSize: 10, 
    color: '#999', 
    marginTop: 2 
  },
  nextButton: { 
    height: 50, 
    borderRadius: 10, 
    backgroundColor: '#ccc', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginHorizontal: 20 
  },
  nextButtonActive: { 
    backgroundColor: COLORS.primary 
  },
  nextButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  successContainer: { 
    alignItems: 'center' 
  },
  successIcon: { 
    fontSize: 60, 
    marginBottom: 20,
    color: '#4CAF50'
  },
  successTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 10 
  },
  successText: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center' 
  },
});