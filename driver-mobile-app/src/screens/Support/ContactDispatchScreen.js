import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function ContactDispatchScreen({ navigation }) {
  const { colors } = useTheme();
  const { driver } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCall = () => {
    Linking.openURL('tel:+254700000002');
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setLoading(true);
    try {
      // In a real app, this would send to your backend
      console.log('Message to dispatch:', { driverId: driver?.id, message });
      Alert.alert('Message Sent', 'Dispatch has been notified');
      setMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Dispatch</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Emergency Contact</Text>
          
          <TouchableOpacity style={styles.contactRow} onPress={handleCall}>
            <Text style={[styles.contactIcon, { color: colors.primary }]}>📞</Text>
            <View>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Call Dispatch</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>+254 700 000 002</Text>
            </View>
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            For emergencies, use the SOS button on the dashboard for immediate assistance.
          </Text>
        </View>

        <View style={[styles.messageCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.messageTitle, { color: colors.text }]}>Send a Message</Text>
          
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.background,
              borderColor: colors.border,
              color: colors.text
            }]}
            placeholder="Type your message..."
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.primary }]}
            onPress={handleSendMessage}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Send Message</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 15 },
  infoCard: { padding: 20, borderRadius: 10, marginBottom: 15 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  contactIcon: { fontSize: 24, width: 40 },
  contactLabel: { fontSize: 12, marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: '500' },
  disclaimer: { fontSize: 12, fontStyle: 'italic', marginTop: 10 },
  messageCard: { padding: 20, borderRadius: 10 },
  messageTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 100, marginBottom: 15 },
  sendButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});