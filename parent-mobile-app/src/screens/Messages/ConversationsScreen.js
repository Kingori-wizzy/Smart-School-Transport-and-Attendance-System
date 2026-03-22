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

  return (
    <TouchableOpacity
      style={[
        styles.conversationItem, 
        { borderBottomColor: colors.border },
        !conversation.isRead && styles.unreadItem
      ]}
      onPress={() => onPress(conversation)}
    >
      <View style={[styles.avatar, { backgroundColor: conversation.unreadCount > 0 ? colors.primary : colors.secondary }]}>
        {conversation.avatar ? (
          <Image source={{ uri: conversation.avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{getInitials(conversation.title || conversation.name)}</Text>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, { color: colors.text, fontWeight: !conversation.isRead ? '700' : '500' }]} numberOfLines={1}>
            {conversation.title || conversation.name}
          </Text>
          <Text style={[styles.conversationTime, { color: colors.textSecondary }]}>
            {getLastMessageTime(conversation.createdAt || conversation.lastMessageTime)}
          </Text>
        </View>

        <View style={styles.conversationFooter}>
          <Text
            style={[
              styles.lastMessage,
              { color: !conversation.isRead ? colors.text : colors.textSecondary }
            ]}
            numberOfLines={1}
          >
            {conversation.message || conversation.lastMessage || 'No message'}
          </Text>
          {!conversation.isRead && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadCount}>New</Text>
            </View>
          )}
        </View>

        {conversation.student && (
          <Text style={[styles.studentInfo, { color: colors.textSecondary }]}>
            👤 {conversation.student.name}
          </Text>
        )}
        
        {conversation.tripName && (
          <Text style={[styles.tripInfo, { color: colors.primary }]}>
            🚌 {conversation.tripName}
          </Text>
        )}
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
  const { user, isAuthenticated, getAuthToken } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch conversations when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated()) {
        loadConversations();
        loadUnreadCount();
      }
    }, [isAuthenticated])
  );

  useEffect(() => {
    // Set up socket listeners for real-time updates
    if (socket && isConnected) {
      socket.on('new_driver_message', handleNewMessage);
      socket.on('message_read', handleMessageRead);
    }

    return () => {
      if (socket) {
        socket.off('new_driver_message', handleNewMessage);
        socket.off('message_read', handleMessageRead);
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
      console.log('📨 Loading conversations...');
      
      const response = await api.parent.getConversations();
      console.log('📨 Conversations response:', response);
      
      if (response.success) {
        setConversations(response.data || []);
      } else {
        console.error('Failed to load conversations:', response.message);
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error.response?.data || error.message);
      
      if (error.status === 401) {
        // Token expired - will be handled by interceptor
        console.log('Token expired, please login again');
      }
      
      Alert.alert('Error', 'Failed to load messages. Please pull to refresh.');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!isAuthenticated()) return;
    
    try {
      const response = await api.parent.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.unreadCount);
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
    console.log('📨 New message received:', data);
    
    // Add to conversations list or update existing
    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === data.conversationId);
      
      const newMessage = {
        id: data.conversationId,
        message: data.message,
        title: data.title || 'Driver Message',
        type: data.type || 'driver_message',
        student: data.student,
        tripName: data.tripName,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      
      if (existingIndex >= 0) {
        // Update existing conversation
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          message: data.message,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        return updated;
      } else {
        // Add new conversation
        return [newMessage, ...prev];
      }
    });
    
    // Update unread count
    setUnreadCount(prev => prev + 1);
  };

  const handleMessageRead = (data) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === data.conversationId
          ? { ...c, isRead: true }
          : c
      )
    );
  };

  const handleConversationPress = async (conversation) => {
    // Mark as read
    if (!conversation.isRead) {
      try {
        await api.parent.markConversationRead(conversation.id);
        setConversations(prev =>
          prev.map(c =>
            c.id === conversation.id
              ? { ...c, isRead: true }
              : c
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
    
    // Navigate to chat detail
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      title: conversation.title,
      student: conversation.student,
      tripName: conversation.tripName,
    });
  };

  const handleNewMessagePress = () => {
    // Navigate to contact driver screen
    navigation.navigate('ContactDriver');
  };

  const filteredConversations = conversations.filter(c =>
    (c.title || c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.message || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.student?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* Unread banner */}
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
          <Text style={styles.offlineText}>🔴 You're offline. Messages will sync when online.</Text>
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
    backgroundColor: '#FFF8E7',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
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
  studentInfo: { fontSize: 11, marginTop: 4 },
  tripInfo: { fontSize: 11, marginTop: 2 },
  unreadBadge: { 
    minWidth: 32, 
    height: 20, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingHorizontal: 6, 
    marginLeft: 8 
  },
  unreadCount: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: -50 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  newMessageButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  newMessageButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});