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
import api from '../../services/api';

export default function ContactSupportScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    includeLogs: true,
  });

  const categories = [
    { id: 'general', label: 'General Inquiry', icon: '❓' },
    { id: 'technical', label: 'Technical Issue', icon: '⚙️' },
    { id: 'billing', label: 'Billing Question', icon: '💰' },
    { id: 'feedback', label: 'Feedback', icon: '💡' },
    { id: 'emergency', label: 'Emergency', icon: '🚨' },
  ];

  const handleSubmit = async () => {
    if (!formData.subject.trim() || !formData.message.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // In a real app, this would send to your backend
      await api.post('/support/contact', {
        ...formData,
        userId: user?.id,
        userName: `${user?.firstName} ${user?.lastName}`,
        userEmail: user?.email,
      });
      
      Alert.alert(
        'Message Sent',
        'Thank you for contacting us. We\'ll get back to you within 24 hours.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again later.');
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
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>Quick Contact</Text>
          
          <TouchableOpacity 
            style={styles.contactRow}
            onPress={() => Linking.openURL('tel:+254700000000')}
          >
            <Text style={[styles.contactIcon, { color: colors.primary }]}>📞</Text>
            <View>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Call Us</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>+254 700 000 000</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactRow}
            onPress={() => Linking.openURL('mailto:support@smartschool.com')}
          >
            <Text style={[styles.contactIcon, { color: colors.primary }]}>✉️</Text>
            <View>
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email Us</Text>
              <Text style={[styles.contactValue, { color: colors.text }]}>support@smartschool.com</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.hoursRow}>
            <Text style={[styles.hoursIcon, { color: colors.primary }]}>⏰</Text>
            <View>
              <Text style={[styles.hoursLabel, { color: colors.textSecondary }]}>Support Hours</Text>
              <Text style={[styles.hoursValue, { color: colors.text }]}>Mon-Fri: 8:00 AM - 6:00 PM</Text>
              <Text style={[styles.hoursValue, { color: colors.text }]}>Sat: 9:00 AM - 1:00 PM</Text>
              <Text style={[styles.hoursValue, { color: colors.text }]}>Sun: Closed</Text>
            </View>
          </View>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Send us a Message</Text>

          <View style={styles.categoriesContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Category</Text>
            <View style={styles.categoryRow}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    formData.category === cat.id && { backgroundColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setFormData({ ...formData, category: cat.id })}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text 
                    style={[
                      styles.categoryLabel,
                      { color: formData.category === cat.id ? '#fff' : colors.text }
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Brief summary of your issue"
              placeholderTextColor={colors.textSecondary}
              value={formData.subject}
              onChangeText={(text) => setFormData({ ...formData, subject: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={colors.textSecondary}
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={styles.logsRow}
            onPress={() => setFormData({ ...formData, includeLogs: !formData.includeLogs })}
          >
            <View style={[styles.checkbox, { borderColor: colors.border }]}>
              {formData.includeLogs && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.logsText, { color: colors.text }]}>
              Include diagnostic logs (helps us troubleshoot faster)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Send Message</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.responseTime, { color: colors.textSecondary }]}>
            We typically respond within 24 hours
          </Text>
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
  content: { padding: 15, paddingBottom: 30 },
  infoCard: { padding: 20, borderRadius: 10, marginBottom: 15 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  contactIcon: { fontSize: 24, width: 40 },
  contactLabel: { fontSize: 12, marginBottom: 2 },
  contactValue: { fontSize: 14, fontWeight: '500' },
  hoursRow: { flexDirection: 'row', marginTop: 5 },
  hoursIcon: { fontSize: 24, width: 40 },
  hoursLabel: { fontSize: 12, marginBottom: 2 },
  hoursValue: { fontSize: 13, marginBottom: 2 },
  formCard: { padding: 20, borderRadius: 10 },
  formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  categoriesContainer: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  categoryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderRadius: 20, 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    margin: 4 
  },
  categoryIcon: { fontSize: 14, marginRight: 4 },
  categoryLabel: { fontSize: 12, fontWeight: '500' },
  inputContainer: { marginBottom: 15 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14 },
  textArea: { minHeight: 100, paddingTop: 12 },
  logsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  checkbox: { width: 20, height: 20, borderWidth: 1, borderRadius: 4, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checkmark: { fontSize: 14, color: '#4CAF50' },
  logsText: { fontSize: 13, flex: 1 },
  submitButton: { height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  responseTime: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
});