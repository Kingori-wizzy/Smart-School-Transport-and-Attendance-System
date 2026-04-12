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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { format } from 'date-fns';

const MessageBubble = ({ message, isOwn, colors }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return format(date, 'HH:mm');
  };

  const getMessageText = () => {
    return message.message || message.text;
  };

  return (
    <View style={[styles.messageRow, isOwn ? styles.ownMessageRow : styles.otherMessageRow]}>
      <View
        style={[
          styles.messageBubble,
          { backgroundColor: isOwn ? colors.primary : colors.card },
          isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        {!isOwn && (
          <Text style={[styles.senderName, { color: colors.textSecondary }]}>
            {message.senderName || 'Driver'}
          </Text>
        )}
        <Text style={[styles.messageText, { color: isOwn ? '#fff' : colors.text }]}>
          {getMessageText()}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
            {formatTime(message.createdAt || message.timestamp)}
          </Text>
          {message.smsSent && (
            <View style={styles.smsBadge}>
              <Text style={styles.smsBadgeText}>SMS</Text>
            </View>
          )}
          {isOwn && (
            <Text style={[styles.readReceipt, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
              {message.isRead ? ' ✓✓' : message.delivered ? ' ✓' : ' ⏳'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const TypingIndicator = ({ colors, userName }) => (
  <View style={[styles.messageRow, styles.otherMessageRow]}>
    <View style={[styles.typingBubble, { backgroundColor: colors.card }]}>
      <View style={styles.typingDots}>
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
      </View>
      <Text style={[styles.typingText, { color: colors.textSecondary }]}>
        {userName || 'Driver'} is typing...
      </Text>
    </View>
  </View>
);

export default function ChatScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { socket, isConnected, sendTyping, sendMessage: sendSocketMessage, joinConversation, leaveConversation } = useSocket();
  const flatListRef = useRef();
  
  const { 
    conversationId, 
    title, 
    name, 
    driverId,
    studentId 
  } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const typingTimeoutRef = useRef();
  const displayName = title || name || 'Driver';

  useEffect(() => {
    loadMessages();
    markConversationAsRead();

    if (socket && isConnected) {
      joinConversation(conversationId);
      
      socket.on('new-message', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('message-delivered', handleMessageDelivered);
      socket.on('message-read', handleMessageRead);
    }

    return () => {
      if (socket && isConnected) {
        leaveConversation(conversationId);
        socket.off('new-message');
        socket.off('typing');
        socket.off('message-delivered');
        socket.off('message-read');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, socket, isConnected]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.parentConversations.getMessages(conversationId);
      
      if (response.success) {
        const messagesData = response.data || [];
        setMessages(messagesData);
        setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async () => {
    try {
      await api.parentConversations.markAsRead(conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleNewMessage = (data) => {
    if (data.conversationId === conversationId) {
      const newMessage = {
        id: data.id || `msg-${Date.now()}`,
        text: data.text,
        message: data.text,
        senderId: data.senderId,
        senderName: data.senderName,
        createdAt: data.timestamp || new Date().toISOString(),
        isRead: false,
        delivered: data.delivered || false,
        smsSent: data.smsSent || false
      };
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      markConversationAsRead();
    }
  };

  const handleTyping = (data) => {
    if (data.conversationId === conversationId) {
      setOtherTyping(data.isTyping);
      if (data.userName) {
        setTypingUserName(data.userName);
      }
    }
  };

  const handleMessageDelivered = (data) => {
    if (data.conversationId === conversationId) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId ? { ...msg, delivered: true } : msg
        )
      );
    }
  };

  const handleMessageRead = (data) => {
    if (data.conversationId === conversationId) {
      setMessages(prev =>
        prev.map(msg =>
          msg.senderId === user?.id ? { ...msg, isRead: true } : msg
        )
      );
    }
  };

  const handleTypingStart = () => {
    if (!typing && socket && isConnected) {
      setTyping(true);
      sendTyping(conversationId, true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      if (socket && isConnected) {
        sendTyping(conversationId, false);
      }
    }, 2000);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const trimmedText = inputText.trim();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    const newMessage = {
      id: tempId,
      conversationId: conversationId,
      senderId: user?.id,
      senderName: `${user?.firstName} ${user?.lastName}`,
      text: trimmedText,
      timestamp: new Date().toISOString(),
      read: false,
      delivered: false,
      sending: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setSending(true);
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
    if (socket && isConnected) {
      sendTyping(conversationId, false);
    }

    try {
      const response = await api.parentConversations.sendMessage(conversationId, trimmedText);
      
      if (response.success) {
        const sentMessage = response.data;
        
        setMessages(prev =>
          prev.map(msg => msg.id === tempId ? { ...sentMessage, sending: false } : msg)
        );

        if (socket && isConnected) {
          sendSocketMessage(sentMessage);
        }
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(msg => 
          msg.id === tempId ? { ...msg, failed: true, sending: false } : msg
        )
      );
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleContactDriver = () => {
    navigation.navigate('ContactDriver', {
      driverId: driverId,
      conversationId: conversationId
    });
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading conversation...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.card }]}>
            <Text style={[styles.headerAvatarText, { color: colors.primary }]}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{displayName}</Text>
            <Text style={styles.headerStatus}>
              {isConnected ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleContactDriver} style={styles.contactButton}>
          <Text style={styles.contactIcon}>📞</Text>
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isOwn={item.senderId === user?.id}
            colors={colors}
          />
        )}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Send a message to start the conversation
            </Text>
          </View>
        }
      />

      {otherTyping && <TypingIndicator colors={colors} userName={typingUserName} />}

      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            if (text) handleTypingStart();
          }}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14 },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backIcon: { fontSize: 24, color: '#fff' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  headerAvatarText: { fontSize: 18, fontWeight: 'bold' },
  headerName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 2 },
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  contactButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  contactIcon: { fontSize: 20, color: '#fff' },
  messagesList: { padding: 15, paddingBottom: 10 },
  messageRow: { marginBottom: 10, flexDirection: 'row' },
  ownMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  ownBubble: { borderBottomRightRadius: 4 },
  otherBubble: { borderBottomLeftRadius: 4 },
  senderName: { fontSize: 11, marginBottom: 2 },
  messageText: { fontSize: 14, lineHeight: 18, marginBottom: 4 },
  messageFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4 },
  messageTime: { fontSize: 10, alignSelf: 'flex-end' },
  readReceipt: { fontSize: 10, marginLeft: 2 },
  smsBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 8, marginLeft: 4 },
  smsBadgeText: { fontSize: 8, color: '#4CAF50' },
  typingBubble: { padding: 12, borderRadius: 18, borderBottomLeftRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingDots: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2, opacity: 0.5 },
  typingText: { fontSize: 12, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1 },
  input: { flex: 1, maxHeight: 100, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14, borderRadius: 20 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  sendButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptyMessages: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  emptySubtext: { fontSize: 13, textAlign: 'center' },
});