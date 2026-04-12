import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Modal,
  AppState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';

const ChatBubble = ({ message, isOwn }) => {
  const getMessageTime = () => {
    if (!message.timestamp) return '';
    const date = new Date(message.timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'HH:mm');
    }
    return format(date, 'MMM dd, HH:mm');
  };

  return (
    <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
      {!isOwn && (
        <View style={styles.senderAvatar}>
          <Text style={styles.senderInitials}>
            {message.senderName?.charAt(0) || 'D'}
          </Text>
        </View>
      )}
      <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        {!isOwn && <Text style={styles.senderName}>{message.senderName}</Text>}
        <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
          {message.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {getMessageTime()}
          </Text>
          {isOwn && (
            <Text style={styles.messageStatus}>
              {message.read ? ' ✓✓' : message.delivered ? ' ✓' : ' ⏳'}
            </Text>
          )}
          {message.smsSent && (
            <View style={styles.smsBadge}>
              <Ionicons name="chatbubble" size={10} color="#4CAF50" />
              <Text style={styles.smsBadgeText}>SMS</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

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

  const getConversationIcon = (type) => {
    switch(type) {
      case 'driver':
        return 'bus-outline';
      case 'teacher':
        return 'school-outline';
      case 'admin':
        return 'shield-outline';
      default:
        return 'person-outline';
    }
  };

  const getConversationColor = (type) => {
    switch(type) {
      case 'driver':
        return '#FF9800';
      case 'teacher':
        return '#4CAF50';
      case 'admin':
        return '#2196F3';
      default:
        return COLORS.primary;
    }
  };

  return (
    <TouchableOpacity style={styles.conversationItem} onPress={onPress}>
      <View style={[styles.conversationAvatar, { backgroundColor: getConversationColor(conversation.type) }]}>
        <Ionicons name={getConversationIcon(conversation.type)} size={24} color="#fff" />
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
    <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
    <Text style={styles.emptyTitle}>No Messages</Text>
    <Text style={styles.emptyText}>
      Messages from drivers and school staff will appear here.
    </Text>
  </View>
);

const EmptyMessages = () => (
  <View style={styles.emptyMessagesContainer}>
    <Ionicons name="chatbubble-ellipses-outline" size={50} color="#ccc" />
    <Text style={styles.emptyMessagesTitle}>No messages yet</Text>
    <Text style={styles.emptyMessagesText}>
      Start the conversation by sending a message below.
    </Text>
  </View>
);

export default function MessagesScreen({ route, navigation }) {
  const { user } = useAuth();
  const { socket, isConnected, sendTyping, joinConversation, leaveConversation, markMessagesRead } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  const flatListRef = useRef();
  const typingTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    startPolling();
    
    return () => {
      subscription.remove();
      stopPolling();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (selectedConversation) {
        leaveConversation(selectedConversation.id);
      }
    };
  }, []);

  // Join conversation room when selected
  useEffect(() => {
    if (selectedConversation && socket && isConnected) {
      joinConversation(selectedConversation.id);
      
      return () => {
        leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation, socket, isConnected]);

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      const onNewMessage = (data) => {
        console.log('📨 Socket new-message received:', data);
        handleNewMessage(data);
      };
      
      const onTyping = (data) => {
        handleTyping(data);
      };
      
      const onMessageDelivered = (data) => {
        handleMessageDelivered(data);
      };
      
      const onMessageRead = (data) => {
        handleMessageRead(data);
      };
      
      const onMessageFailed = (data) => {
        handleMessageFailed(data);
      };
      
      socket.on('new-message', onNewMessage);
      socket.on('typing', onTyping);
      socket.on('message-delivered', onMessageDelivered);
      socket.on('message-read', onMessageRead);
      socket.on('message-failed', onMessageFailed);
      
      // Also listen for notifications
      socket.on('new-notification', (data) => {
        console.log('🔔 Socket new-notification received:', data);
      });

      return () => {
        socket.off('new-message', onNewMessage);
        socket.off('typing', onTyping);
        socket.off('message-delivered', onMessageDelivered);
        socket.off('message-read', onMessageRead);
        socket.off('message-failed', onMessageFailed);
        socket.off('new-notification');
      };
    }
  }, [socket, selectedConversation]);

  const startPolling = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    pollingIntervalRef.current = setInterval(() => {
      if (selectedConversation && !isConnected) {
        loadMessages(selectedConversation.id, true);
      }
    }, 30000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleAppStateChange = (nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      loadConversations();
      if (selectedConversation) {
        loadMessages(selectedConversation.id);
        markConversationAsRead(selectedConversation.id);
      }
    }
    setAppState(nextAppState);
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      console.log('Loading conversations for parent...');
      
      const response = await api.parentConversations.getConversations();
      console.log('Conversations response:', response);
      
      if (response.success) {
        const data = response.data || [];
        console.log(`Found ${data.length} conversations`);
        setConversations(data);
      } else {
        console.log('No conversations found');
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId, silent = false) => {
    try {
      console.log(`Loading messages for conversation: ${conversationId}`);
      const response = await api.parentConversations.getMessages(conversationId);
      
      if (response.success) {
        const data = response.data || [];
        console.log(`Found ${data.length} messages`);
        setMessages(data);
        if (!silent) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (!silent) {
        Alert.alert('Error', 'Failed to load messages');
      }
    }
  };

  const markConversationAsRead = async (conversationId) => {
    try {
      await api.parentConversations.markAsRead(conversationId);
      if (socket && isConnected) {
        markMessagesRead(conversationId);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleNewMessage = (data) => {
    console.log('New message received:', data);
    
    // Update messages if in current conversation
    if (data.conversationId === selectedConversation?.id) {
      setMessages(prev => [...prev, data]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      
      // Mark as read immediately
      if (data.senderId !== user?.id) {
        markConversationAsRead(data.conversationId);
      }
    }
    
    // Update conversation list
    setConversations(prev => {
      const existingIndex = prev.findIndex(conv => conv.id === data.conversationId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage: {
            text: data.text,
            timestamp: data.timestamp,
            smsSent: data.smsSent || false
          },
          unread: updated[existingIndex].id === selectedConversation?.id ? 0 : (updated[existingIndex].unread || 0) + 1,
          updatedAt: data.timestamp
        };
        return updated;
      } else {
        // New conversation
        return [{
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
        }, ...prev];
      }
    });
  };

  const handleTyping = (data) => {
    if (data.conversationId === selectedConversation?.id) {
      setTyping(data.isTyping);
      if (data.isTyping && data.userName) {
        setTypingUser(data.userName);
      }
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (data.isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    }
  };

  const handleMessageDelivered = (data) => {
    if (data.conversationId === selectedConversation?.id) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId ? { ...msg, delivered: true } : msg
        )
      );
    }
  };

  const handleMessageRead = (data) => {
    if (data.conversationId === selectedConversation?.id) {
      setMessages(prev =>
        prev.map(msg =>
          msg.senderId === user?.id ? { ...msg, read: true } : msg
        )
      );
    }
  };

  const handleMessageFailed = (data) => {
    if (data.conversationId === selectedConversation?.id) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === data.messageId ? { ...msg, failed: true, sending: false } : msg
        )
      );
      Alert.alert('Message Failed', 'Your message could not be sent. Please try again.');
    }
  };

  const selectConversation = async (conversation) => {
    console.log('Selected conversation:', conversation);
    setSelectedConversation(conversation);
    await loadMessages(conversation.id);
    
    if (conversation.unread > 0) {
      await markConversationAsRead(conversation.id);
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id ? { ...conv, unread: 0 } : conv
        )
      );
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedConversation || sending) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const newMessage = {
      id: tempId,
      conversationId: selectedConversation.id,
      senderId: user?.id,
      senderName: `${user?.firstName} ${user?.lastName}`,
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
      read: false,
      delivered: false,
      sending: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setSending(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await api.parentConversations.sendMessage(selectedConversation.id, newMessage.text);
      
      if (response.success) {
        const sentMessage = response.data;
        
        setMessages(prev =>
          prev.map(msg => msg.id === tempId ? { ...sentMessage, sending: false } : msg)
        );

        if (socket && isConnected) {
          socket.emit('send-message', sentMessage);
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
      Alert.alert('Error', 'Failed to send message. Please check your connection.');
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);
    
    if (socket && selectedConversation && isConnected && text.length > 0) {
      sendTyping(selectedConversation.id, text.length > 0);
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
      await markConversationAsRead(selectedConversation.id);
    }
    setRefreshing(false);
  };

  const goBack = () => {
    if (selectedConversation) {
      if (socket && isConnected) {
        leaveConversation(selectedConversation.id);
      }
      setSelectedConversation(null);
      setMessages([]);
      setTyping(false);
      setTypingUser('');
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {selectedConversation ? selectedConversation.name : 'Messages'}
          </Text>
          {selectedConversation && selectedConversation.type === 'driver' && (
            <View style={styles.driverBadge}>
              <Ionicons name="bus" size={12} color="#fff" />
              <Text style={styles.driverBadgeText}>Driver</Text>
            </View>
          )}
        </View>
        {selectedConversation && (
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => setShowDetailsModal(true)}
          >
            <Ionicons name="information-circle" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {!selectedConversation && <View style={{ width: 40 }} />}
      </LinearGradient>

      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>
            Offline mode. Messages may be delayed.
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
            contentContainerStyle={[
              styles.messagesList,
              messages.length === 0 && styles.emptyMessagesList
            ]}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
            ListEmptyComponent={<EmptyMessages />}
          />

          {typing && (
            <View style={styles.typingIndicator}>
              <View style={styles.typingDots}>
                <View style={[styles.typingDot, styles.typingDot1]} />
                <View style={[styles.typingDot, styles.typingDot2]} />
                <View style={[styles.typingDot, styles.typingDot3]} />
              </View>
              <Text style={styles.typingText}>
                {typingUser || 'Driver'} is typing...
              </Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={handleInputChange}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              editable={!sending}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.sendGradient}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Conversation Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Conversation Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.detailRow}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={styles.detailValue}>{selectedConversation?.name}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="briefcase" size={20} color={COLORS.primary} />
                <Text style={styles.detailLabel}>Role:</Text>
                <Text style={styles.detailValue}>
                  {selectedConversation?.type === 'driver' ? 'Driver' : 
                   selectedConversation?.type === 'teacher' ? 'Teacher' : 'School Staff'}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Ionicons name="chatbubbles" size={20} color={COLORS.primary} />
                <Text style={styles.detailLabel}>Total Messages:</Text>
                <Text style={styles.detailValue}>{messages.length}</Text>
              </View>
              
              {selectedConversation?.lastMessage && (
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={20} color={COLORS.primary} />
                  <Text style={styles.detailLabel}>Last Active:</Text>
                  <Text style={styles.detailValue}>
                    {format(new Date(selectedConversation.lastMessage.timestamp), 'MMM dd, HH:mm')}
                  </Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: { 
    paddingTop: 50, 
    paddingBottom: 15, 
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
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
    gap: 4,
  },
  driverBadgeText: {
    fontSize: 10,
    color: '#fff',
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBanner: { 
    backgroundColor: '#f44336', 
    padding: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  offlineText: { 
    color: '#fff', 
    fontSize: 12, 
    marginLeft: 8 
  },
  listContent: { 
    paddingVertical: 8 
  },
  conversationItem: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    marginVertical: 1, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  conversationAvatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  conversationContent: { 
    flex: 1 
  },
  conversationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  conversationName: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#333', 
    flex: 1 
  },
  conversationTime: { 
    fontSize: 11, 
    color: '#999' 
  },
  conversationFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  conversationLastMessage: { 
    fontSize: 13, 
    color: '#666', 
    flex: 1 
  },
  unreadMessage: { 
    fontWeight: '600', 
    color: '#333' 
  },
  unreadBadge: { 
    backgroundColor: COLORS.primary, 
    borderRadius: 12, 
    minWidth: 20, 
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8, 
    paddingHorizontal: 6 
  },
  unreadBadgeText: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: 'bold' 
  },
  messagesList: { 
    padding: 15, 
    paddingBottom: 20 
  },
  emptyMessagesList: {
    flex: 1,
    justifyContent: 'center',
  },
  messageContainer: { 
    flexDirection: 'row', 
    marginBottom: 15, 
    alignItems: 'flex-end' 
  },
  ownMessage: { 
    justifyContent: 'flex-end' 
  },
  otherMessage: { 
    justifyContent: 'flex-start' 
  },
  senderAvatar: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#FF9800', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 8 
  },
  senderInitials: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  messageBubble: { 
    maxWidth: '75%', 
    padding: 10, 
    borderRadius: 16 
  },
  ownBubble: { 
    backgroundColor: COLORS.primary, 
    borderBottomRightRadius: 4 
  },
  otherBubble: { 
    backgroundColor: '#fff', 
    borderBottomLeftRadius: 4, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 1, 
    elevation: 1 
  },
  senderName: { 
    fontSize: 11, 
    color: '#666', 
    marginBottom: 2 
  },
  messageText: { 
    fontSize: 14, 
    lineHeight: 18 
  },
  ownMessageText: { 
    color: '#fff' 
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
    gap: 4,
  },
  messageTime: { 
    fontSize: 9, 
    color: '#999' 
  },
  ownMessageTime: { 
    color: 'rgba(255,255,255,0.7)' 
  },
  messageStatus: { 
    fontSize: 9 
  },
  smsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    gap: 2,
  },
  smsBadgeText: {
    fontSize: 8,
    color: '#4CAF50',
  },
  typingIndicator: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 8,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
  },
  typingDot1: {
    opacity: 0.4,
  },
  typingDot2: {
    opacity: 0.7,
  },
  typingDot3: {
    opacity: 1,
  },
  typingText: { 
    fontSize: 12, 
    color: '#999', 
    fontStyle: 'italic' 
  },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 10, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0', 
    alignItems: 'flex-end' 
  },
  input: { 
    flex: 1, 
    backgroundColor: '#f5f5f5', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 8, 
    maxHeight: 100, 
    fontSize: 14, 
    marginRight: 10 
  },
  sendButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    overflow: 'hidden' 
  },
  sendButtonDisabled: { 
    opacity: 0.5 
  },
  sendGradient: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 60, 
    paddingHorizontal: 30 
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 8 
  },
  emptyText: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    lineHeight: 20 
  },
  emptyMessagesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyMessagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyMessagesText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
    marginLeft: 12,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  modalCloseButton: {
    padding: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});