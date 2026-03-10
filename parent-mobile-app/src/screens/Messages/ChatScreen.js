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

const MessageBubble = ({ message, isOwn, colors }) => (
  <View style={[styles.messageRow, isOwn ? styles.ownMessageRow : styles.otherMessageRow]}>
    <View
      style={[
        styles.messageBubble,
        { backgroundColor: isOwn ? colors.primary : colors.card },
        isOwn ? styles.ownBubble : styles.otherBubble,
      ]}
    >
      <Text style={[styles.messageText, { color: isOwn ? '#fff' : colors.text }]}>
        {message.text}
      </Text>
      <Text style={[styles.messageTime, { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
        {format(new Date(message.timestamp), 'HH:mm')}
        {message.read && isOwn && <Text style={styles.readReceipt}> ✓✓</Text>}
      </Text>
    </View>
  </View>
);

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
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const flatListRef = useRef();
  
  const { conversationId, name, avatar } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef();

  useEffect(() => {
    loadMessages();
    markAsRead();

    if (socket) {
      socket.emit('join_conversation', conversationId);
      
      socket.on('new_message', handleNewMessage);
      socket.on('typing', handleTyping);
      socket.on('stop_typing', handleStopTyping);
      socket.on('message_read', handleMessageRead);
    }

    return () => {
      if (socket) {
        socket.emit('leave_conversation', conversationId);
        socket.off('new_message');
        socket.off('typing');
        socket.off('stop_typing');
        socket.off('message_read');
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, socket]);

  const loadMessages = async () => {
    try {
      const data = await api.messages.getMessages(conversationId);
      setMessages(data);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await api.messages.markConversationAsRead(conversationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
    setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    
    if (message.senderId !== user?.id) {
      markAsRead();
    }
  };

  const handleTyping = () => {
    setOtherTyping(true);
  };

  const handleStopTyping = () => {
    setOtherTyping(false);
  };

  const handleMessageRead = (data) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === data.messageId ? { ...msg, read: true } : msg
      )
    );
  };

  const handleTypingStart = () => {
    if (!typing) {
      setTyping(true);
      socket?.emit('typing', { conversationId });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      socket?.emit('stop_typing', { conversationId });
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
    socket?.emit('stop_typing', { conversationId });

    try {
      const newMessage = {
        id: `temp-${Date.now()}`,
        text: trimmedText,
        senderId: user?.id,
        timestamp: new Date().toISOString(),
        read: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);

      await api.messages.sendMessage(conversationId, trimmedText);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      // Remove temporary message
      setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
    } finally {
      setSending(false);
    }
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
              {name.charAt(0)}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{name}</Text>
            {isConnected ? (
              <Text style={styles.headerStatus}>Online</Text>
            ) : (
              <Text style={styles.headerStatus}>Offline</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreIcon}>⋮</Text>
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
      />

      {otherTyping && <TypingIndicator colors={colors} />}

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
  headerStatus: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  moreButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  moreIcon: { fontSize: 24, color: '#fff' },
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
});