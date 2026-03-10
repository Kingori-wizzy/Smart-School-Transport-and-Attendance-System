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

export default function PrivacyPolicyScreen({ navigation }) {
  const { colors } = useTheme();

  const sections = [
    {
      title: '1. Information We Collect',
      content: 'We collect the following types of information:\n\n• Personal Information: Name, email address, phone number, and profile photo.\n• Child Information: Names, classes, and attendance records.\n• Location Data: Bus location for tracking purposes.\n• Device Information: Device model, operating system, and unique device identifiers.\n• Usage Data: How you interact with the app.',
    },
    {
      title: '2. How We Use Your Information',
      content: 'We use your information to:\n\n• Provide and maintain the service\n• Notify you about your children\'s attendance and bus location\n• Communicate with you about updates and alerts\n• Improve and personalize your experience\n• Ensure the security of our service\n• Comply with legal obligations',
    },
    {
      title: '3. Sharing Your Information',
      content: 'We may share your information with:\n\n• School administrators and teachers\n• Bus drivers (only relevant information)\n• Service providers who assist in operating the app\n• Law enforcement when required by law\n\nWe do not sell your personal information to third parties.',
    },
    {
      title: '4. Data Security',
      content: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.',
    },
    {
      title: '5. Data Retention',
      content: 'We retain your personal information for as long as your account is active or as needed to provide you services. We may also retain and use your information to comply with legal obligations, resolve disputes, and enforce our agreements.',
    },
    {
      title: '6. Your Rights',
      content: 'You have the right to:\n\n• Access your personal information\n• Correct inaccurate information\n• Request deletion of your information\n• Object to processing of your information\n• Data portability\n• Withdraw consent at any time',
    },
    {
      title: '7. Children\'s Privacy',
      content: 'The app is used to track children\'s attendance and location with parental consent. We do not knowingly collect personal information from children without verifiable parental consent. If you believe we might have any information from a child without proper consent, please contact us.',
    },
    {
      title: '8. Location Data',
      content: 'The app collects precise location data from school buses to provide real-time tracking. Parents consent to this collection by using the service. Location data is not used for any other purpose and is retained only as long as necessary.',
    },
    {
      title: '9. Changes to Privacy Policy',
      content: 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.',
    },
    {
      title: '10. Contact Us',
      content: 'If you have questions about this Privacy Policy, please contact us at:\n\nEmail: privacy@smartschool.com\nPhone: +254 700 000 000\nAddress: 123 School Road, Nairobi, Kenya',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            Last Updated: March 10, 2026
          </Text>
          
          <Text style={[styles.intro, { color: colors.text }]}>
            This Privacy Policy describes how Smart School Transport System collects, uses, and shares your personal information when you use our mobile application.
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
            By using our app, you consent to our Privacy Policy and agree to its terms.
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