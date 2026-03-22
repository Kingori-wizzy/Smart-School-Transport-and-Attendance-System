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
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ContactItem = ({ contact, onPress, colors }) => {
  const getInitials = (name) => {
    if (!name) return '?';
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
          {contact.role === 'driver' ? '🚌 Driver' : contact.role === 'admin' ? '🏫 School Admin' : '👤 Staff'}
        </Text>
        {contact.busNumber && (
          <Text style={[styles.contactBus, { color: colors.primary }]}>
            Bus: {contact.busNumber}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = ({ colors, searchQuery, loading }) => {
  if (loading) return null;
  
  return (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>👥</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Contacts Found</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {searchQuery
          ? `No contacts matching "${searchQuery}"`
          : 'No drivers assigned to your children yet'}
      </Text>
    </View>
  );
};

export default function NewMessageScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user, childrenList } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDriversFromChildren();
  }, [childrenList]);

  const loadDriversFromChildren = async () => {
    try {
      setLoading(true);
      
      // Extract drivers from children's bus assignments
      const driverContacts = [];
      const uniqueDrivers = new Map();
      
      for (const child of childrenList) {
        if (child.busId && child.busNumber && !uniqueDrivers.has(child.busNumber)) {
          uniqueDrivers.set(child.busNumber, {
            id: child.busId,
            name: `Driver - ${child.busNumber}`,
            role: 'driver',
            busNumber: child.busNumber,
            studentName: child.fullName || `${child.firstName} ${child.lastName}`,
            studentId: child.id,
            avatar: null,
          });
        }
      }
      
      setContacts(Array.from(uniqueDrivers.values()));
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectContact = (contact) => {
    navigation.navigate('Chat', {
      conversationId: `driver-${contact.id}`,
      title: contact.name,
      name: contact.name,
      student: { id: contact.studentId, name: contact.studentName },
      tripName: contact.busNumber,
      isNew: true,
      contactId: contact.id,
      contactType: 'driver',
    });
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.studentName && c.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.busNumber && c.busNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Driver</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by driver name, bus number, or student..."
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
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading drivers...
          </Text>
        </View>
      ) : filteredContacts.length > 0 ? (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ContactItem contact={item} onPress={handleSelectContact} colors={colors} />
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.infoHeader}>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Contact your child's bus driver directly
              </Text>
            </View>
          }
        />
      ) : (
        <EmptyState colors={colors} searchQuery={searchQuery} loading={loading} />
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
  loadingText: { marginTop: 10, fontSize: 14 },
  listContent: { paddingBottom: 20 },
  infoHeader: { paddingHorizontal: 15, paddingVertical: 10 },
  infoText: { fontSize: 12, textAlign: 'center' },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
  contactAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  contactAvatarImage: { width: 50, height: 50, borderRadius: 25 },
  contactAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  contactRole: { fontSize: 12, marginBottom: 2 },
  contactBus: { fontSize: 11 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: -50 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});