import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ContactItem = ({ contact, onPress, colors }) => {
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <TouchableOpacity
      style={[styles.contactItem, { borderBottomColor: colors.border }]}
      onPress={() => onPress(contact)}
    >
      <View style={[styles.contactAvatar, { backgroundColor: colors.primary }]}>
        {contact.avatar ? (
          <Image source={{ uri: contact.avatar }} style={styles.contactAvatarImage} />
        ) : (
          <Text style={styles.contactAvatarText}>{getInitials(contact.name)}</Text>
        )}
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
        <Text style={[styles.contactRole, { color: colors.textSecondary }]}>
          {contact.role === 'driver' ? '🚌 Driver' : '🏫 School Admin'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = ({ colors, searchQuery }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>👥</Text>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Contacts Found</Text>
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      {searchQuery
        ? `No contacts matching "${searchQuery}"`
        : 'No available contacts to message'}
    </Text>
  </View>
);

export default function NewMessageScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      // Fetch drivers and admins the parent can message
      const data = await api.messages.getAvailableContacts();
      setContacts(data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact) => {
    // Create or get conversation
    navigation.navigate('Chat', {
      conversationId: contact.conversationId || `new-${contact.id}`,
      name: contact.name,
      avatar: contact.avatar,
      isNew: true,
      contactId: contact.id,
    });
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search contacts..."
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredContacts.length > 0 ? (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactItem contact={item} onPress={handleSelectContact} colors={colors} />
          )}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <EmptyState colors={colors} searchQuery={searchQuery} />
      )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  contactAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  contactAvatarImage: { width: 50, height: 50, borderRadius: 25 },
  contactAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  contactRole: { fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: -50 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});