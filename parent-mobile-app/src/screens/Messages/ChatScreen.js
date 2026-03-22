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

  return (
    <View style={[styles.messageRow, isOwn ? styles.ownMessageRow : styles.otherMessageRow]}>
      <View
        style={[
          styles.messageBubble,
          { backgroundColor: isOwn ? colors.primary : colors.card },
          isOwn ? styles.ownBubble : styles.otherBubble,
        ]}
      >
        <Text style={[styles.messageText, { color: isOwn ? '#fff' : colors.text }]}>
          {message.message || message.text}
        </Text>
        <Text style={[styles.messageTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
          {formatTime(message.createdAt || message.timestamp)}
          {message.isRead && isOwn && <Text style={styles.readReceipt}> ✓✓</Text>}
        </Text>
      </View>
    </View>
  );
};

const TypingIndicator = ({ colors }) => (
  <View style={[styles.messageRow, styles.otherMessageRow]}>
    <View style={[styles.typingBubble, { backgroundColor: colors.card }]}>
      <View style={styles.typingDots}>
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
        <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
      </View>
    </View>
  </View>
);

export default function ChatScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user, getAuthToken } = useAuth();
  const { socket, isConnected } = useSocket();
  const flatListRef = useRef();
  
  const { 
    conversationId, 
    title, 
    name, 
    avatar, 
    student, 
    tripName 
  } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef();
  const displayName = title || name || 'Driver';

  useEffect(() => {
    loadMessages();
    markConversationAsRead();

    if (socket && isConnected) {
      socket.emit('join_conversation', conversationId);
      
      socket.on('new_driver_message', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('stop_typing', handleStopTyping);
      socket.on('message_read', handleMessageRead);
    }

    return () => {
      if (socket && isConnected) {
        socket.emit('leave_conversation', conversationId);
        socket.off('new_driver_message');
        socket.off('typing');
        socket.off('stop_typing');
        socket.off('message_read');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, socket, isConnected]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      // Since we don't have a messages endpoint yet, we'll show the conversation message
      // You can expand this when you add message history endpoint
      const response = await api.parent.getConversations();
      
      if (response.success) {
        const conversation = response.data.find(c => c.id === conversationId);
        if (conversation) {
          // Format the conversation as a message
          setMessages([{
            id: conversation.id,
            message: conversation.message,
            title: conversation.title,
            type: conversation.type,
            createdAt: conversation.createdAt,
            isRead: conversation.isRead,
            student: conversation.student,
            tripName: conversation.tripName
          }]);
        }
      }
      
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markConversationAsRead = async () => {
    try {
      await api.parent.markConversationRead(conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleNewMessage = (data) => {
    if (data.conversationId === conversationId) {
      const newMessage = {
        id: `msg-${Date.now()}`,
        message: data.message,
        title: data.title,
        type: data.type,
        createdAt: new Date().toISOString(),
        isRead: false,
        student: data.student,
        tripName: data.tripName
      };
      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
      markConversationAsRead();
    }
  };

  const handleTyping = () => {
    setOtherTyping(true);
  };

  const handleStopTyping = () => {
    setOtherTyping(false);
  };

  const handleMessageRead = (data) => {
    if (data.conversationId === conversationId) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId ? { ...msg, isRead: true } : msg
        )
      );
    }
  };

  const handleTypingStart = () => {
    if (!typing && socket && isConnected) {
      setTyping(true);
      socket.emit('typing', { conversationId });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      if (socket && isConnected) {
        socket.emit('stop_typing', { conversationId });
      }
    }, 2000);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const trimmedText = inputText.trim();
    setInputText('');
    setSending(true);

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
    if (socket && isConnected) {
      socket.emit('stop_typing', { conversationId });
    }

    try {
      // Since we don't have a direct message endpoint, show alert that this is a read-only view
      Alert.alert(
        'Read Only',
        'This conversation is from your driver. To send a message, please use the Contact Driver option.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleContactDriver = () => {
    navigation.navigate('ContactDriver', {
      student: student,
      tripName: tripName
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
            {student && (
              <Text style={styles.headerStudent}>👤 {student.name}</Text>
            )}
            {tripName && (
              <Text style={styles.headerTrip}>🚌 {tripName}</Text>
            )}
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
            isOwn={false}
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
          </View>
        }
      />

      {otherTyping && <TypingIndicator colors={colors} />}

      <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder="Reply to driver..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={(text) => {
            setInputText(text);
            if (text) handleTypingStart();
          }}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={sendMessage}
          disabled={!inputText.trim() || sending}
        >
          <Text style={styles.sendButtonText}>➤</Text>
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
  headerStudent: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  headerTrip: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  contactButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  contactIcon: { fontSize: 20, color: '#fff' },
  messagesList: { padding: 15, paddingBottom: 10 },
  messageRow: { marginBottom: 10, flexDirection: 'row' },
  ownMessageRow: { justifyContent: 'flex-end' },
  otherMessageRow: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '75%', padding: 12, borderRadius: 18 },
  ownBubble: { borderBottomRightRadius: 4 },
  otherBubble: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, lineHeight: 18, marginBottom: 4 },
  messageTime: { fontSize: 10, alignSelf: 'flex-end' },
  readReceipt: { fontSize: 10 },
  typingBubble: { padding: 12, borderRadius: 18, borderBottomLeftRadius: 4 },
  typingDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 40 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 2, opacity: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 10, borderTopWidth: 1 },
  input: { flex: 1, maxHeight: 100, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14 },
  sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  sendButtonText: { color: '#fff', fontSize: 16 },
  emptyMessages: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});