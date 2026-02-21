import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';

const ChatBubble = ({ message, isOwn }) => (
  <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
    {!isOwn && (
      <View style={styles.senderAvatar}>
        <Text style={styles.senderInitials}>
          {message.senderName?.charAt(0) || 'S'}
        </Text>
      </View>
    )}
    <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
      {!isOwn && <Text style={styles.senderName}>{message.senderName}</Text>}
      <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
        {message.text}
      </Text>
      <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
        {format(new Date(message.timestamp), 'HH:mm')}
        {isOwn && <Text style={styles.messageStatus}> {message.read ? '✓✓' : '✓'}</Text>}
      </Text>
    </View>
  </View>
);

const ConversationItem = ({ conversation, onPress }) => {
  const getLastMessageTime = () => {
    if (!conversation.lastMessage) return '';
    const date = new Date(conversation.lastMessage.timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'HH:mm');
    }
    return format(date, 'MMM dd');
  };

  return (
    <TouchableOpacity style={styles.conversationItem} onPress={onPress}>
      <View style={styles.conversationAvatar}>
        <Text style={styles.conversationInitials}>
          {conversation.name?.charAt(0) || '?'}
        </Text>
      </View>
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={styles.conversationTime}>{getLastMessageTime()}</Text>
        </View>
        <View style={styles.conversationFooter}>
          <Text style={[styles.conversationLastMessage, conversation.unread && styles.unreadMessage]} numberOfLines={1}>
            {conversation.lastMessage?.text || 'No messages yet'}
          </Text>
          {conversation.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{conversation.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const EmptyConversations = () => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyIcon}>💬</Text>
    <Text style={styles.emptyTitle}>No Messages</Text>
    <Text style={styles.emptyText}>
      Start a conversation with the school, teachers, or drivers.
    </Text>
  </View>
);

export default function MessagesScreen({ route, navigation }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);

  const flatListRef = useRef();

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('new-message', handleNewMessage);
      socket.on('typing', handleTyping);
    }

    return () => {
      if (socket) {
        socket.off('new-message');
        socket.off('typing');
      }
    };
  }, [socket, selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await api.messages.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const data = await api.messages.getMessages(conversationId);
      setMessages(data);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleNewMessage = (data) => {
    if (data.conversationId === selectedConversation?.id) {
      setMessages(prev => [...prev, data]);
      scrollToBottom();
    }
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === data.conversationId 
          ? { 
              ...conv, 
              lastMessage: data,
              unread: conv.id === selectedConversation?.id ? 0 : (conv.unread || 0) + 1 
            }
          : conv
      )
    );
  };

  const handleTyping = (data) => {
    if (data.conversationId === selectedConversation?.id) {
      setTyping(data.isTyping);
    }
  };

  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    
    if (conversation.unread > 0) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id ? { ...conv, unread: 0 } : conv
        )
      );
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedConversation) return;

    const tempId = `temp-${Date.now()}`;
    const newMessage = {
      id: tempId,
      conversationId: selectedConversation.id,
      senderId: user?.id,
      senderName: `${user?.firstName} ${user?.lastName}`,
      text: inputText.trim(),
      timestamp: new Date(),
      read: false,
      sending: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    scrollToBottom();

    try {
      const sentMessage = await api.messages.sendMessage(selectedConversation.id, newMessage.text);
      
      setMessages(prev =>
        prev.map(msg => msg.id === tempId ? sentMessage : msg)
      );

      if (socket) {
        socket.emit('send-message', sentMessage);
      }
      
    } catch (error) {
      setMessages(prev =>
        prev.map(msg => msg.id === tempId ? { ...msg, failed: true, sending: false } : msg)
      );
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);
    
    if (socket && selectedConversation) {
      socket.emit('typing', {
        conversationId: selectedConversation.id,
        isTyping: text.length > 0,
      });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }) => (
    <ChatBubble
      message={item}
      isOwn={item.senderId === user?.id}
    />
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    if (selectedConversation) {
      await loadMessages(selectedConversation.id);
    }
    setRefreshing(false);
  };

  const goBack = () => {
    if (selectedConversation) {
      setSelectedConversation(null);
      setMessages([]);
    } else {
      navigation.goBack();
    }
  };

  if (loading && !selectedConversation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedConversation ? selectedConversation.name : 'Messages'}
        </Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            🔴 You're offline. Messages may be delayed.
          </Text>
        </View>
      )}

      {!selectedConversation ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationItem
              conversation={item}
              onPress={() => selectConversation(item)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={<EmptyConversations />}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
          />

          {typing && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Someone is typing...</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={handleInputChange}
              placeholder="Type a message..."
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.sendGradient}
              >
                <Text style={styles.sendButtonText}>➤</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  offlineBanner: { backgroundColor: '#f44336', padding: 8, alignItems: 'center' },
  offlineText: { color: '#fff', fontSize: 12 },
  listContent: { paddingVertical: 8 },
  conversationItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginVertical: 1, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  conversationAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  conversationInitials: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  conversationContent: { flex: 1 },
  conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  conversationName: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  conversationTime: { fontSize: 11, color: '#999' },
  conversationFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  conversationLastMessage: { fontSize: 13, color: '#666', flex: 1 },
  unreadMessage: { fontWeight: '600', color: '#333' },
  unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 12, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8, paddingHorizontal: 6 },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  messagesList: { padding: 15, paddingBottom: 20 },
  messageContainer: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
  ownMessage: { justifyContent: 'flex-end' },
  otherMessage: { justifyContent: 'flex-start' },
  senderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  senderInitials: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  messageBubble: { maxWidth: '75%', padding: 10, borderRadius: 16 },
  ownBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, color: '#666', marginBottom: 2 },
  messageText: { fontSize: 14, lineHeight: 18 },
  ownMessageText: { color: '#fff' },
  messageTime: { fontSize: 9, color: '#999', alignSelf: 'flex-end', marginTop: 2 },
  ownMessageTime: { color: 'rgba(255,255,255,0.7)' },
  messageStatus: { fontSize: 9, marginLeft: 2 },
  typingIndicator: { paddingHorizontal: 20, paddingVertical: 8 },
  typingText: { fontSize: 12, color: '#999', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, fontSize: 14, marginRight: 10 },
  sendButton: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  sendButtonDisabled: { opacity: 0.5 },
  sendGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sendButtonText: { color: '#fff', fontSize: 18 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyIcon: { fontSize: 60, marginBottom: 20, opacity: 0.5 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
});