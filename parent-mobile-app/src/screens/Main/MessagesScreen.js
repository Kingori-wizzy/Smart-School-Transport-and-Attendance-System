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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { COLORS } from '../../constants/config';
import { format } from 'date-fns';

export default function MessagesScreen({ navigation }) {
  const { user, childrenList } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (childrenList.length > 0) {
      setSelectedChild(childrenList[0]);
      fetchMessages(childrenList[0].id);
    }
  }, [childrenList]);

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
  }, [socket, selectedChild]);

  const fetchMessages = async (childId) => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      const response = await api.get(`/messages/child/${childId}`);
      
      if (response.data) {
        setMessages(response.data);
      } else {
        // Mock data
        setMessages([
          {
            id: '1',
            sender: 'school',
            text: 'Welcome to the school communication portal!',
            timestamp: new Date(Date.now() - 3600000),
            read: true,
          },
          {
            id: '2',
            sender: 'parent',
            text: 'Thank you! When will the bus arrive today?',
            timestamp: new Date(Date.now() - 1800000),
            read: true,
          },
          {
            id: '3',
            sender: 'school',
            text: 'The bus is running 10 minutes late due to traffic.',
            timestamp: new Date(Date.now() - 900000),
            read: false,
          },
        ]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message) => {
    if (message.childId === selectedChild?.id) {
      setMessages(prev => [message, ...prev]);
      scrollToBottom();
    }
  };

  const handleTyping = (data) => {
    if (data.childId === selectedChild?.id) {
      setTyping(data.isTyping);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedChild) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: 'parent',
      text: inputText.trim(),
      timestamp: new Date(),
      read: false,
      childId: selectedChild.id,
    };

    setMessages(prev => [newMessage, ...prev]);
    setInputText('');
    scrollToBottom();

    // Emit via socket
    if (socket) {
      socket.emit('send-message', {
        ...newMessage,
        childId: selectedChild.id,
      });
    }

    // Save to backend
    try {
      await api.post('/messages', newMessage);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInputChange = (text) => {
    setInputText(text);
    
    // Emit typing status
    if (socket && selectedChild) {
      socket.emit('typing', {
        childId: selectedChild.id,
        isTyping: text.length > 0,
      });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'HH:mm');
    }
    return format(date, 'MMM dd, HH:mm');
  };

  const renderMessage = ({ item }) => {
    const isParent = item.sender === 'parent';
    
    return (
      <View style={[
        styles.messageContainer,
        isParent ? styles.parentMessage : styles.schoolMessage,
      ]}>
        {!isParent && (
          <View style={styles.schoolAvatar}>
            <Text style={styles.avatarText}>🏫</Text>
          </View>
        )}
        <View style={[
          styles.messageBubble,
          isParent ? styles.parentBubble : styles.schoolBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isParent ? styles.parentText : styles.schoolText,
          ]}>
            {item.text}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={styles.messageTime}>
              {formatMessageTime(item.timestamp)}
            </Text>
            {isParent && (
              <Text style={styles.messageStatus}>
                {item.read ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
        {isParent && (
          <View style={styles.parentAvatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
        )}
      </View>
    );
  };

  const renderChildSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.childSelector}
    >
      {childrenList.map(child => (
        <TouchableOpacity
          key={child.id}
          onPress={() => {
            setSelectedChild(child);
            fetchMessages(child.id);
          }}
          style={[
            styles.childChip,
            selectedChild?.id === child.id && styles.selectedChildChip,
          ]}
        >
          <Text style={[
            styles.childChipText,
            selectedChild?.id === child.id && styles.selectedChildChipText,
          ]}>
            {child.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>Messages</Text>
          {isConnected && (
            <View style={styles.onlineDot} />
          )}
        </View>
      </LinearGradient>

      {/* Child Selector */}
      {renderChildSelector()}

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        inverted
        showsVerticalScrollIndicator={false}
      />

      {/* Typing Indicator */}
      {typing && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>School is typing...</Text>
        </View>
      )}

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !inputText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backIcon: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  childSelector: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  childChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  selectedChildChip: {
    backgroundColor: COLORS.primary,
  },
  childChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedChildChipText: {
    color: '#fff',
  },
  messagesList: {
    padding: 15,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  parentMessage: {
    justifyContent: 'flex-end',
  },
  schoolMessage: {
    justifyContent: 'flex-start',
  },
  schoolAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  parentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarText: {
    fontSize: 18,
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 20,
  },
  schoolBubble: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 4,
  },
  parentBubble: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  schoolText: {
    color: '#333',
  },
  parentText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.4)',
    marginRight: 4,
  },
  messageStatus: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.4)',
  },
  typingIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  typingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
  },
});