import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { format, isToday, isYesterday } from 'date-fns';

const ConversationItem = ({ conversation, onPress, colors }) => {
  const getLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const hasUnread = conversation.unread > 0;

  return (
    <TouchableOpacity
      style={[
        styles.conversationItem, 
        { borderBottomColor: colors.border },
        hasUnread && styles.unreadItem
      ]}
      onPress={() => onPress(conversation)}
    >
      <View style={[styles.avatar, { backgroundColor: hasUnread ? colors.primary : colors.secondary }]}>
        {conversation.avatar ? (
          <Image source={{ uri: conversation.avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{getInitials(conversation.name)}</Text>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, { color: colors.text, fontWeight: hasUnread ? '700' : '500' }]} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={[styles.conversationTime, { color: colors.textSecondary }]}>
            {getLastMessageTime(conversation.lastMessage?.timestamp || conversation.updatedAt)}
          </Text>
        </View>

        <View style={styles.conversationFooter}>
          <Text
            style={[
              styles.lastMessage,
              { color: hasUnread ? colors.text : colors.textSecondary }
            ]}
            numberOfLines={1}
          >
            {conversation.lastMessage?.text || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadCount}>{conversation.unread}</Text>
            </View>
          )}
        </View>

        <View style={styles.conversationMeta}>
          {conversation.type === 'driver' && (
            <View style={styles.driverBadge}>
              <Text style={styles.driverBadgeText}>Driver</Text>
            </View>
          )}
          {conversation.lastMessage?.smsSent && (
            <View style={styles.smsBadge}>
              <Text style={styles.smsBadgeText}>SMS</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const EmptyState = ({ colors, onNewMessagePress }) => (
  <View style={styles.emptyContainer}>
    <Text style={[styles.emptyIcon, { color: colors.textSecondary }]}>💬</Text>
    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Messages Yet</Text>
    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
      Messages from your driver will appear here
    </Text>
    <TouchableOpacity
      style={[styles.newMessageButton, { backgroundColor: colors.primary }]}
      onPress={onNewMessagePress}
    >
      <Text style={styles.newMessageButtonText}>Contact Driver</Text>
    </TouchableOpacity>
  </View>
);

export default function ConversationsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated()) {
        loadConversations();
        loadUnreadCount();
      }
    }, [isAuthenticated])
  );

  useEffect(() => {
    if (socket && isConnected) {
      socket.on('new-message', handleNewMessage);
      socket.on('message-read', handleMessageRead);
    }

    return () => {
      if (socket) {
        socket.off('new-message', handleNewMessage);
        socket.off('message-read', handleMessageRead);
      }
    };
  }, [socket, isConnected]);

  const loadConversations = async () => {
    if (!isAuthenticated()) {
      console.log('Not authenticated, skipping conversation load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading conversations...');
      
      const response = await api.parentConversations.getConversations();
      console.log('Conversations response:', response);
      
      if (response.success) {
        const data = response.data || [];
        setConversations(data);
        
        // Calculate total unread count
        const totalUnread = data.reduce((sum, conv) => sum + (conv.unread || 0), 0);
        setUnreadCount(totalUnread);
      } else {
        console.error('Failed to load conversations:', response.message);
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      Alert.alert('Error', 'Failed to load messages. Please pull to refresh.');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!isAuthenticated()) return;
    
    try {
      const response = await api.parentConversations.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data?.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadConversations(), loadUnreadCount()]);
    setRefreshing(false);
  };

  const handleNewMessage = (data) => {
    console.log('New message received:', data);
    
    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === data.conversationId);
      
      const newConversation = {
        id: data.conversationId,
        name: data.senderName || 'Driver',
        type: 'driver',
        lastMessage: {
          text: data.text,
          timestamp: data.timestamp,
          smsSent: data.smsSent || false
        },
        unread: 1,
        updatedAt: data.timestamp
      };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage: newConversation.lastMessage,
          unread: (updated[existingIndex].unread || 0) + 1,
          updatedAt: data.timestamp
        };
        return updated;
      } else {
        return [newConversation, ...prev];
      }
    });
    
    setUnreadCount(prev => prev + 1);
  };

  const handleMessageRead = (data) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === data.conversationId
          ? { ...c, unread: 0 }
          : c
      )
    );
  };

  const handleConversationPress = async (conversation) => {
    // Navigate to chat detail
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      name: conversation.name,
      driverId: conversation.driverId,
    });
  };

  const handleNewMessagePress = () => {
    navigation.navigate('NewMessage');
  };

  const filteredConversations = conversations.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lastMessage?.text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading messages...
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
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={handleNewMessagePress} style={styles.newButton}>
          <Text style={styles.newButtonIcon}>✏️</Text>
        </TouchableOpacity>
      </LinearGradient>

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadBannerText}>
            You have {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search messages..."
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

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You're offline. Messages will sync when online.</Text>
        </View>
      )}

      {filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={handleConversationPress}
              colors={colors}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <EmptyState colors={colors} onNewMessagePress={handleNewMessagePress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
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
  newButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255,255,255,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  newButtonIcon: { fontSize: 18, color: '#fff' },
  unreadBanner: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  unreadBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
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
  offlineBanner: { backgroundColor: '#f44336', padding: 10, alignItems: 'center' },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  listContent: { paddingBottom: 20 },
  conversationItem: { 
    flexDirection: 'row', 
    padding: 15, 
    borderBottomWidth: 1,
    backgroundColor: '#fff',
  },
  unreadItem: {
    backgroundColor: '#e3f2fd',
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  conversationContent: { flex: 1 },
  conversationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  conversationName: { fontSize: 16, flex: 1, marginRight: 8 },
  conversationTime: { fontSize: 11 },
  conversationFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  lastMessage: { fontSize: 13, flex: 1 },
  conversationMeta: { 
    flexDirection: 'row', 
    marginTop: 4,
    gap: 6
  },
  driverBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  driverBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  smsBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smsBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  unreadBadge: { 
    minWidth: 22, 
    height: 22, 
    borderRadius: 11, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 6, 
    marginLeft: 8 
  },
  unreadCount: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: -50 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  newMessageButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  newMessageButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});