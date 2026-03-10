import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

const FAQItem = ({ question, answer, isOpen, onToggle }) => (
  <View style={[styles.faqItem, { backgroundColor: isOpen ? colors.card : 'transparent' }]}>
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

const GuideCard = ({ icon, title, description, onPress }) => (
  <TouchableOpacity style={[styles.guideCard, { backgroundColor: colors.card }]} onPress={onPress}>
    <Text style={styles.guideIcon}>{icon}</Text>
    <View style={styles.guideContent}>
      <Text style={[styles.guideTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.guideDescription, { color: colors.textSecondary }]}>{description}</Text>
    </View>
    <Text style={[styles.guideArrow, { color: colors.primary }]}>→</Text>
  </TouchableOpacity>
);

export default function HelpCenterScreen({ navigation }) {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFAQ, setOpenFAQ] = useState(null);

  const faqs = [
    {
      id: 1,
      question: 'How do I track my child\'s bus?',
      answer: 'Go to the Dashboard and tap "Track" on your child\'s card. You\'ll see the bus location on a map with real-time updates every 10 seconds.',
    },
    {
      id: 2,
      question: 'How do I add a new child?',
      answer: 'On the Dashboard, tap "Add Child" button. Fill in your child\'s details including name, class, and admission number. The school must verify the information.',
    },
    {
      id: 3,
      question: 'Why am I not receiving notifications?',
      answer: 'Check your notification settings in Profile → Notification Settings. Also ensure phone permissions are enabled and you have internet connection.',
    },
    {
      id: 4,
      question: 'How do I change my password?',
      answer: 'Go to Profile → Change Password. Enter your current password and new password twice to update.',
    },
    {
      id: 5,
      question: 'What should I do if my child misses the bus?',
      answer: 'Contact the school transport office immediately. You can also send a message through the app in the Messages section.',
    },
    {
      id: 6,
      question: 'How accurate is the bus location?',
      answer: 'GPS updates every 10 seconds with accuracy within 10 meters. Traffic conditions may affect ETA calculations.',
    },
  ];

  const guides = [
    {
      icon: '🚀',
      title: 'Getting Started',
      description: 'Learn the basics of using the app',
      screen: 'GettingStartedGuide',
    },
    {
      icon: '👨‍👩‍👧',
      title: 'Managing Children',
      description: 'Add, edit, and track your children',
      screen: 'ChildrenGuide',
    },
    {
      icon: '🔔',
      title: 'Notifications Guide',
      description: 'Understanding different alert types',
      screen: 'NotificationsGuide',
    },
    {
      icon: '❓',
      title: 'Troubleshooting',
      description: 'Common issues and solutions',
      screen: 'TroubleshootingGuide',
    },
  ];

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContactSupport = () => {
    navigation.navigate('ContactSupport');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search FAQs..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearIcon, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Guides</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.guidesScroll}>
            {guides.map((guide, index) => (
              <GuideCard
                key={index}
                icon={guide.icon}
                title={guide.title}
                description={guide.description}
                onPress={() => navigation.navigate(guide.screen)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
          {filteredFAQs.length > 0 ? (
            filteredFAQs.map(faq => (
              <FAQItem
                key={faq.id}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFAQ === faq.id}
                onToggle={() => setOpenFAQ(openFAQ === faq.id ? null : faq.id)}
              />
            ))
          ) : (
            <View style={[styles.noResults, { backgroundColor: colors.card }]}>
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                No FAQs found matching "{searchQuery}"
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Still Need Help?</Text>
          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card }]}
            onPress={handleContactSupport}
          >
            <Text style={styles.contactIcon}>💬</Text>
            <View style={styles.contactContent}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Contact Support</Text>
              <Text style={[styles.contactDescription, { color: colors.textSecondary }]}>
                Get help from our support team
              </Text>
            </View>
            <Text style={[styles.contactArrow, { color: colors.primary }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card }]}
            onPress={() => Linking.openURL('tel:+254700000000')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View style={styles.contactContent}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Call Us</Text>
              <Text style={[styles.contactDescription, { color: colors.textSecondary }]}>
                +254 700 000 000
              </Text>
            </View>
            <Text style={[styles.contactArrow, { color: colors.primary }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { backgroundColor: colors.card }]}
            onPress={() => Linking.openURL('mailto:support@smartschool.com')}
          >
            <Text style={styles.contactIcon}>✉️</Text>
            <View style={styles.contactContent}>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Email Us</Text>
              <Text style={[styles.contactDescription, { color: colors.textSecondary }]}>
                support@smartschool.com
              </Text>
            </View>
            <Text style={[styles.contactArrow, { color: colors.primary }]}>→</Text>
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 15, paddingHorizontal: 15, borderRadius: 10, height: 50 },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  clearIcon: { fontSize: 16, padding: 5 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 15, marginBottom: 10 },
  guidesScroll: { paddingLeft: 15 },
  guideCard: { width: 150, padding: 15, marginRight: 10, borderRadius: 10, alignItems: 'center' },
  guideIcon: { fontSize: 32, marginBottom: 10 },
  guideContent: { alignItems: 'center' },
  guideTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  guideDescription: { fontSize: 11, textAlign: 'center' },
  guideArrow: { fontSize: 18, marginTop: 8 },
  faqItem: { marginHorizontal: 15, marginBottom: 5, borderRadius: 8, overflow: 'hidden' },
  faqQuestion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  faqQuestionText: { fontSize: 14, fontWeight: '500', flex: 1 },
  faqIcon: { fontSize: 20, marginLeft: 10 },
  faqAnswer: { padding: 15, paddingTop: 0 },
  faqAnswerText: { fontSize: 13, lineHeight: 18 },
  noResults: { marginHorizontal: 15, padding: 20, borderRadius: 8, alignItems: 'center' },
  noResultsText: { fontSize: 14 },
  contactCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 8 },
  contactIcon: { fontSize: 24, width: 40 },
  contactContent: { flex: 1 },
  contactTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  contactDescription: { fontSize: 12 },
  contactArrow: { fontSize: 18 },
});