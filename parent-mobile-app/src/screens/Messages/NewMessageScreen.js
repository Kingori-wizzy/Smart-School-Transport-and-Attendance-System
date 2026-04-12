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
          Driver - Bus {contact.busNumber}
        </Text>
        <Text style={[styles.contactStudent, { color: colors.primary }]}>
          Student: {contact.studentName}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = ({ colors, searchQuery, loading, hasChildren }) => {
  if (loading) return null;
  
  return (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>🚌</Text>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Drivers Found</Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {!hasChildren
          ? 'No children added to your account yet. Please add your children first.'
          : searchQuery
          ? `No drivers matching "${searchQuery}"`
          : 'No drivers assigned to your children yet.'}
      </Text>
    </View>
  );
};

export default function NewMessageScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user, children } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [initiatingChat, setInitiatingChat] = useState(false);

  useEffect(() => {
    loadDriversFromChildren();
  }, [children]);

  const loadDriversFromChildren = async () => {
    try {
      setLoading(true);
      
      if (!children || children.length === 0) {
        setContacts([]);
        return;
      }
      
      console.log('Children list:', children);
      
      // Extract drivers from children's bus assignments
      const driverContacts = [];
      const uniqueDrivers = new Map();
      
      for (const child of children) {
        const childId = child._id || child.id;
        const childName = child.fullName || `${child.firstName || ''} ${child.lastName || ''}`.trim();
        const busNumber = child.busNumber || child.transportDetails?.busNumber;
        const driverId = child.driverId || child.transportDetails?.driverId;
        const driverName = child.driverName || `Driver ${busNumber || 'School Bus'}`;
        
        if (busNumber && !uniqueDrivers.has(busNumber)) {
          uniqueDrivers.set(busNumber, {
            id: driverId || `driver-${busNumber}`,
            name: driverName,
            role: 'driver',
            busNumber: busNumber,
            studentName: childName,
            studentId: childId,
            avatar: null,
          });
        }
      }
      
      const contactsList = Array.from(uniqueDrivers.values());
      console.log('Driver contacts:', contactsList);
      setContacts(contactsList);
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const initiateConversation = async (contact) => {
    try {
      setInitiatingChat(true);
      
      // Try to initiate conversation with the driver
      const response = await api.post('/messaging/initiate-conversation', {
        driverId: contact.id,
        parentId: user?.id
      });
      
      if (response.success) {
        const conversationId = response.data?.conversationId;
        
        navigation.replace('Chat', {
          conversationId: conversationId,
          name: contact.name,
          driverId: contact.id,
          studentId: contact.studentId,
        });
      } else {
        // If conversation already exists, try to get existing one
        const conversationsResponse = await api.parentConversations.getConversations();
        if (conversationsResponse.success) {
          const existingConv = conversationsResponse.data.find(
            c => c.name === contact.name || c.type === 'driver'
          );
          
          if (existingConv) {
            navigation.replace('Chat', {
              conversationId: existingConv.id,
              name: existingConv.name,
              driverId: contact.id,
              studentId: contact.studentId,
            });
          } else {
            // Navigate with contact info even without conversation ID
            navigation.replace('Chat', {
              name: contact.name,
              driverId: contact.id,
              studentId: contact.studentId,
              isNew: true,
            });
          }
        } else {
          navigation.replace('Chat', {
            name: contact.name,
            driverId: contact.id,
            studentId: contact.studentId,
            isNew: true,
          });
        }
      }
      
    } catch (error) {
      console.error('Error initiating conversation:', error);
      
      // Still navigate to chat even if conversation creation fails
      navigation.replace('Chat', {
        name: contact.name,
        driverId: contact.id,
        studentId: contact.studentId,
        isNew: true,
      });
    } finally {
      setInitiatingChat(false);
    }
  };

  const handleSelectContact = (contact) => {
    initiateConversation(contact);
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.studentName && c.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.busNumber && c.busNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const hasChildren = children && children.length > 0;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading drivers...
        </Text>
      </View>
    );
  }

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

      {initiatingChat ? (
        <View style={styles.initiatingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.initiatingText, { color: colors.textSecondary }]}>
            Starting conversation...
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
                Select a driver to start messaging
              </Text>
            </View>
          }
        />
      ) : (
        <EmptyState 
          colors={colors} 
          searchQuery={searchQuery} 
          loading={loading}
          hasChildren={hasChildren}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    margin: 15, 
    paddingHorizontal: 15, 
    borderRadius: 10, 
    height: 50 
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  clearIcon: { fontSize: 16, padding: 5 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  initiatingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  initiatingText: { marginTop: 10, fontSize: 14 },
  listContent: { paddingBottom: 20 },
  infoHeader: { paddingHorizontal: 15, paddingVertical: 10 },
  infoText: { fontSize: 12, textAlign: 'center' },
  contactItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    borderBottomWidth: 1 
  },
  contactAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  contactAvatarImage: { width: 50, height: 50, borderRadius: 25 },
  contactAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  contactRole: { fontSize: 12, marginBottom: 2 },
  contactStudent: { fontSize: 11 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: -50 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});