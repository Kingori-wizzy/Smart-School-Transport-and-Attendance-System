import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

export default function TermsOfServiceScreen({ navigation }) {
  const { colors } = useTheme();

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing or using the Smart School Transport & Attendance System mobile application ("App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.',
    },
    {
      title: '2. Description of Service',
      content: 'The App provides real-time tracking of school buses, automated attendance recording via QR codes, notifications to parents, and communication between parents, drivers, and school administrators.',
    },
    {
      title: '3. User Accounts',
      content: 'You must create an account to use the App. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
    },
    {
      title: '4. Privacy',
      content: 'Your use of the App is also governed by our Privacy Policy, which explains how we collect, use, and share your personal information.',
    },
    {
      title: '5. User Conduct',
      content: 'You agree to use the App only for lawful purposes and in accordance with these Terms. You may not use the App to harass, abuse, or harm others, or to transmit any harmful code or material.',
    },
    {
      title: '6. Intellectual Property',
      content: 'The App and its original content, features, and functionality are owned by Smart School Transport System and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.',
    },
    {
      title: '7. Termination',
      content: 'We may terminate or suspend your account and bar access to the App immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.',
    },
    {
      title: '8. Limitation of Liability',
      content: 'In no event shall Smart School Transport System, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the App.',
    },
    {
      title: '9. Changes to Terms',
      content: 'We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.',
    },
    {
      title: '10. Contact Us',
      content: 'If you have any questions about these Terms, please contact us at:\n\nEmail: legal@smartschool.com\nPhone: +254 700 000 000\nAddress: 123 School Road, Nairobi, Kenya',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            Last Updated: March 10, 2026
          </Text>
          
          <Text style={[styles.intro, { color: colors.text }]}>
            Please read these Terms of Service carefully before using the Smart School Parent App.
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
              {section.content}
            </Text>
          </View>
        ))}

        <View style={[styles.footer, { backgroundColor: colors.card }]}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By using this app, you acknowledge that you have read and understood these Terms of Service.
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
  card: { padding: 20, borderRadius: 10, marginBottom: 15 },
  lastUpdated: { fontSize: 12, marginBottom: 10, fontStyle: 'italic' },
  intro: { fontSize: 14, lineHeight: 20 },
  section: { padding: 20, borderRadius: 10, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  sectionContent: { fontSize: 14, lineHeight: 20 },
  footer: { padding: 20, borderRadius: 10, alignItems: 'center' },
  footerText: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});