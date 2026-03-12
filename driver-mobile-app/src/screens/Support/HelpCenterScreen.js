import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

const FAQItem = ({ question, answer, isOpen, onToggle, colors }) => (
  <View style={[styles.faqItem, { backgroundColor: colors.card }]}>
    <TouchableOpacity style={styles.faqQuestion} onPress={onToggle}>
      <Text style={[styles.faqQuestionText, { color: colors.text }]}>{question}</Text>
      <Text style={[styles.faqIcon, { color: colors.primary }]}>{isOpen ? '−' : '+'}</Text>
    </TouchableOpacity>
    {isOpen && (
      <View style={styles.faqAnswer}>
        <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>{answer}</Text>
      </View>
    )}
  </View>
);

export default function HelpCenterScreen({ navigation }) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I start my trip?',
      answer: 'From the dashboard, tap on your scheduled trip and then tap "Start Trip". You can also tap the "Start" button directly on the trip card.',
    },
    {
      id: 2,
      question: 'How do I scan student QR codes?',
      answer: 'During an active trip, tap "Scan QR Code" and point your camera at the student\'s QR code. The app will vibrate and confirm when scanned.',
    },
    {
      id: 3,
      question: 'What happens if I lose internet connection?',
      answer: 'The app switches to offline mode. Scans are saved locally and will sync automatically when connection is restored.',
    },
    {
      id: 4,
      question: 'How do I report an incident?',
      answer: 'During a trip, tap "Report Incident", select the type, add details, and submit. You can also attach photos.',
    },
    {
      id: 5,
      question: 'What should I do in an emergency?',
      answer: 'Tap the SOS button on the dashboard. This will immediately alert school administrators with your location.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView>
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search FAQs..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
          {faqs.map(faq => (
            <FAQItem
              key={faq.id}
              question={faq.question}
              answer={faq.answer}
              isOpen={openFAQ === faq.id}
              onToggle={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
              colors={colors}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Still Need Help?</Text>
          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('ContactDispatch')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View style={styles.contactContent}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Contact Dispatch</Text>
              <Text style={[styles.contactDescription, { color: colors.textSecondary }]}>
                Get immediate help from your dispatcher
              </Text>
            </View>
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
  searchContainer: { margin: 15, paddingHorizontal: 15, borderRadius: 10, height: 50 },
  searchInput: { flex: 1, fontSize: 14 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 15, marginBottom: 10 },
  faqItem: { marginHorizontal: 15, marginBottom: 5, borderRadius: 8, overflow: 'hidden' },
  faqQuestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  faqQuestionText: { fontSize: 14, fontWeight: '500', flex: 1 },
  faqIcon: { fontSize: 20, marginLeft: 10 },
  faqAnswer: { padding: 15, paddingTop: 0 },
  faqAnswerText: { fontSize: 13, lineHeight: 18 },
  contactCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15, padding: 15, borderRadius: 8 },
  contactIcon: { fontSize: 24, width: 40 },
  contactContent: { flex: 1 },
  contactTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  contactDescription: { fontSize: 12 },
});