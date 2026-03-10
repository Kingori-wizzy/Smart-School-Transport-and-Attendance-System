import React, { useState, useEffect } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { format, isToday, isYesterday } from 'date-fns';

const ConversationItem = ({ conversation, onPress, colors }) => {
  const getLastMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM dd');
  };

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
      style={[styles.conversationItem, { borderBottomColor: colors.border }]}
      onPress={() => onPress(conversation)}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        {conversation.avatar ? (
          <Image source={{ uri: conversation.avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{getInitials(conversation.name)}</Text>
        )}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.conversationName, { color: colors.text }]} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={[styles.conversationTime, { color: colors.textSecondary }]}>
            {getLastMessageTime(conversation.lastMessageTime)}
          </Text>
        </View>

        <View style={styles.conversationFooter}>
          <Text
            style={[
              styles.lastMessage,
              { color: conversation.unreadCount > 0 ? colors.text : colors.textSecondary }
            ]}
            numberOfLines={1}
          >
            {conversation.lastMessage || 'No messages yet'}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
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
      Start a conversation with the school or a driver
    </Text>
    <TouchableOpacity
      style={[styles.newMessageButton, { backgroundColor: colors.primary }]}
      onPress={onNewMessagePress}
    >
      <Text style={styles.newMessageButtonText}>Send New Message</Text>
    </TouchableOpacity>
  </View>
);

export default function ConversationsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();

    // Listen for new messages via socket
    if (socket) {
      socket.on('new_message', handleIncomingMessage);
      socket.on('message_read', handleMessageRead);
    }

    return () => {
      if (socket) {
        socket.off('new_message', handleIncomingMessage);
        socket.off('message_read', handleMessageRead);
      }
    };
  }, [socket]);

  const loadConversations = async () => {
    try {
      const data = await api.messages.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleIncomingMessage = (data) => {
    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === data.conversationId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage: data.message,
          lastMessageTime: data.timestamp,
          unreadCount: updated[existingIndex].unreadCount + 1,
        };
        return updated;
      }
      return prev;
    });
  };

  const handleMessageRead = (data) => {
    setConversations(prev =>
      prev.map(c =>
        c.id === data.conversationId
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('Chat', {
      conversationId: conversation.id,
      name: conversation.name,
      avatar: conversation.avatar,
    });
  };

  const handleNewMessagePress = () => {
    navigation.navigate('NewMessage');
  };

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading conversations...
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

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Text style={[styles.searchIcon, { color: colors.textSecondary }]}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search conversations..."
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  newButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  newButtonIcon: { fontSize: 18, color: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 15, paddingHorizontal: 15, borderRadius: 10, height: 50 },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  clearIcon: { fontSize: 16, padding: 5 },
  offlineBanner: { backgroundColor: '#f44336', padding: 10, alignItems: 'center' },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  listContent: { paddingBottom: 20 },
  conversationItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarImage: { width: 50, height: 50, borderRadius: 25 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  conversationContent: { flex: 1 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  conversationName: { fontSize: 16, fontWeight: '600', flex: 1 },
  conversationTime: { fontSize: 11, marginLeft: 8 },
  conversationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 13, flex: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, marginLeft: 8 },
  unreadCount: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, marginTop: -50 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  newMessageButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  newMessageButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});