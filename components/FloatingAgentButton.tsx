import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { apiFetch, secureApiKeyStore } from '@/utils/api';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MarkdownText } from './ui/markdown-text';
import { useRouter } from 'expo-router';

export default function FloatingAgentButton() {
  const scheme = useColorScheme() || 'light';
  
  // Theme styling colors
  const colors = {
    ...(Colors[scheme] || Colors.light),
    backgroundElement: scheme === 'dark' ? '#22252A' : '#F0F2F5',
    backgroundSelected: scheme === 'dark' ? '#2E3238' : '#E4E6EB',
    textSecondary: scheme === 'dark' ? '#9BA1A6' : '#65676B',
    inputBackground: scheme === 'dark' ? '#1A1C1E' : '#F0F2F5',
    borderColor: scheme === 'dark' ? '#2D3139' : '#E4E6EB',
    chatBackground: scheme === 'dark' ? '#151718' : '#FFFFFF',
    userBubble: '#0a7ea4',
  };

  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Sessions list states
  const [showSessionsList, setShowSessionsList] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Quick Action suggestion chips
  const actionChips = [
    { label: 'Show my wallets 💳', query: 'Show me all my wallets and their balances.' },
    { label: 'Recent transactions 📝', query: 'Show my recent transactions.' },
    { label: 'Spent on Coffee ☕', query: 'I spent 150 INR on Coffee from Cash Wallet today under Food category.' },
    { label: 'Salary Income 💰', query: 'Add income of 50000 INR from Bank Wallet under Salary category.' },
    { label: 'Food expense check 🍔', query: 'How much did I spend on Food?' },
  ];

  const checkApiKey = async () => {
    const key = await secureApiKeyStore.getApiKey();
    setIsApiKeySet(!!key);
  };

  // Fetch or resolve active session when opening modal
  useEffect(() => {
    if (modalVisible && isAuthenticated) {
      checkApiKey();
      setShowSessionsList(true);
      loadSessionsList();
    }
  }, [modalVisible, isAuthenticated]);

  // Scroll to bottom when messages array changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const loadSessionsList = async () => {
    try {
      setSessionsLoading(true);
      const fetchedSessions = await apiFetch('/agent/sessions');
      if (Array.isArray(fetchedSessions)) {
        setSessions(fetchedSessions);
      }
    } catch (error) {
      console.error('Failed to load sessions list:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleSelectSession = async (id: string) => {
    try {
      setLoading(true);
      setSessionId(id);
      setShowSessionsList(false);
      const fetchedMessages = await apiFetch(`/agent/sessions/${id}/messages`);
      if (Array.isArray(fetchedMessages)) {
        setMessages(fetchedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages for selected session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    const performDelete = async () => {
      try {
        await apiFetch(`/agent/sessions/${id}`, { method: 'DELETE' });
        setSessions((prev) => prev.filter((s) => s.id !== id));
        
        // If we deleted the active session, clear chat state
        if (sessionId === id) {
          setSessionId(null);
          setMessages([]);
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    };

    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This will permanently erase all messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete },
      ]
    );
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    try {
      await apiFetch(`/agent/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title: trimmed }),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: trimmed } : s))
      );
      setEditingSessionId(null);
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const handleStartNewConversation = () => {
    setSessionId(null);
    setMessages([]);
    setShowSessionsList(false);
  };

  const handleLinkPress = async (url: string) => {
    if (url.startsWith('action://')) {
      const cleanAction = url.replace('action://', '');
      const [actionName] = cleanAction.split('?');
      
      if (actionName === 'confirm') {
        await handleSendMessage('Yes, Proceed.');
      } else if (actionName === 'cancel') {
        await handleSendMessage('Cancel');
      }
    } else {
      try {
        const WebBrowser = require('expo-web-browser');
        await WebBrowser.openBrowserAsync(url);
      } catch (err) {
        console.error('Failed to open web link:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    // Add message locally to chat UI list instantly
    const userMsg = { id: `temp-user-${Date.now()}`, role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setSending(true);

    try {
      // Dispatches chat payload
      const response = await apiFetch('/agent/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionId || undefined,
          createNewSession: sessionId ? undefined : true, // Tell backend to create new session
        }),
      });

      if (response && response.reply) {
        if (response.sessionId) {
          setSessionId(response.sessionId);
        }

        // Add assistant reply locally
        const assistantMsg = {
          id: `temp-assistant-${Date.now()}`,
          role: 'model',
          content: response.reply,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        DeviceEventEmitter.emit('refreshDashboard');
      }
    } catch (error: any) {
      const errorMsg = {
        id: `temp-error-${Date.now()}`,
        role: 'model',
        content: `⚠️ Failed to get reply from agent. Error: ${error.message || error}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };



  const formatTimestamp = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return '';
    }
  };

  if (!isAuthenticated || user?.isAiEnabled === false) return null;

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.floatingButton,
          {
            backgroundColor: colors.userBubble,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="chatbubbles" size={24} color="#FFF" />
      </Pressable>

      {/* Full-Screen Chat Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.chatBackground }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderColor }]}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.assistantTitleRow}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  {showSessionsList ? 'All Conversations' : 'SpendSense AI'}
                </Text>
                {!showSessionsList && <View style={styles.statusDot} />}
              </View>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {showSessionsList ? 'Switch between your chat histories' : 'Your Personal Finance Assistant'}
              </Text>
            </View>
            
            <View style={styles.headerButtonsRow}>
              {/* Toggle Sessions List Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                onPress={() => {
                  if (showSessionsList) {
                    setShowSessionsList(false);
                  } else {
                    setShowSessionsList(true);
                    loadSessionsList();
                  }
                }}
              >
                <Ionicons name={showSessionsList ? "chatbubble-ellipses" : "chatbubbles-outline"} size={22} color={colors.text} />
              </Pressable>
              
              {/* Close Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.headerButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Body Content */}
          {showSessionsList ? (
            /* Sessions List View */
            <ScrollView style={styles.sessionListScroll} contentContainerStyle={styles.sessionListContent}>
              {/* New Conversation Action */}
              <Pressable
                style={({ pressed }) => [
                  styles.newSessionButton,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.borderColor,
                    opacity: !isApiKeySet ? 0.4 : (pressed ? 0.8 : 1)
                  }
                ]}
                disabled={!isApiKeySet}
                onPress={handleStartNewConversation}
              >
                <Ionicons name="add-circle-outline" size={20} color={isApiKeySet ? colors.userBubble : colors.textSecondary} />
                <Text style={[styles.newSessionButtonText, { color: isApiKeySet ? colors.userBubble : colors.textSecondary }]}>
                  {isApiKeySet ? 'Start New Conversation' : 'Gemini API Key Required'}
                </Text>
              </Pressable>

              {sessionsLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={colors.userBubble} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading histories...</Text>
                </View>
              ) : sessions.length === 0 ? (
                <View style={styles.emptySessionsContainer}>
                  <Ionicons name="chatbox-ellipses-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptySessionsTitle, { color: colors.text }]}>No Chat Histories</Text>
                  <Text style={[styles.emptySessionsSubtitle, { color: colors.textSecondary }]}>
                    Start a new conversation and your chat records will be saved here.
                  </Text>
                </View>
              ) : (
                sessions.map((sessionItem) => {
                  const isActive = sessionId === sessionItem.id;
                  const isEditing = editingSessionId === sessionItem.id;
                  
                  return (
                    <View
                      key={sessionItem.id}
                      style={[
                        styles.sessionCard,
                        {
                          backgroundColor: isActive ? colors.backgroundSelected : colors.backgroundElement,
                          borderColor: colors.borderColor,
                        }
                      ]}
                    >
                      {isEditing ? (
                        /* Inline Rename Mode */
                        <View style={styles.sessionCardEditContainer}>
                          <TextInput
                            style={[
                              styles.sessionCardInput,
                              {
                                backgroundColor: colors.inputBackground,
                                color: colors.text,
                                borderColor: colors.borderColor,
                              }
                            ]}
                            value={editingTitle}
                            onChangeText={setEditingTitle}
                            autoFocus
                            maxLength={50}
                          />
                          <View style={styles.editButtonsRow}>
                            <Pressable
                              style={({ pressed }) => [styles.editActionButton, { opacity: pressed ? 0.6 : 1 }]}
                              onPress={() => handleRenameSession(sessionItem.id, editingTitle)}
                            >
                              <Ionicons name="checkmark" size={18} color="#2ECC71" />
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [styles.editActionButton, { opacity: pressed ? 0.6 : 1 }]}
                              onPress={() => setEditingSessionId(null)}
                            >
                              <Ionicons name="close" size={18} color="#E74C3C" />
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        /* Standard View Mode */
                        <>
                          <Pressable
                            style={styles.sessionCardPressable}
                            onPress={() => handleSelectSession(sessionItem.id)}
                          >
                            <View style={styles.sessionCardIcon}>
                              <Ionicons
                                name={isActive ? "chatbubble" : "chatbubble-outline"}
                                size={20}
                                color={isActive ? colors.userBubble : colors.textSecondary}
                              />
                            </View>
                            <View style={styles.sessionCardDetails}>
                              <Text
                                style={[
                                  styles.sessionCardTitle,
                                  { color: colors.text, fontWeight: isActive ? 'bold' : 'normal' }
                                ]}
                                numberOfLines={1}
                              >
                                {sessionItem.title || 'Conversation'}
                              </Text>
                              <Text style={[styles.sessionCardTime, { color: colors.textSecondary }]}>
                                {formatTimestamp(sessionItem.updatedAt)}
                              </Text>
                            </View>
                          </Pressable>

                          <View style={styles.sessionActionButtonsRow}>
                            <Pressable
                              style={styles.sessionCardAction}
                              onPress={() => {
                                setEditingSessionId(sessionItem.id);
                                setEditingTitle(sessionItem.title || '');
                              }}
                            >
                              <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                            </Pressable>
                            <Pressable
                              style={styles.sessionCardAction}
                              onPress={() => handleDeleteSession(sessionItem.id)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#E74C3C" />
                            </Pressable>
                          </View>
                        </>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
          ) : (
            /* Chat Messages View */
            <>
              <ScrollView
                ref={scrollViewRef}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                keyboardShouldPersistTaps="handled"
              >
                {loading ? (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.userBubble} />
                    <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                      Connecting to SpendSense AI...
                    </Text>
                  </View>
                ) : messages.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={[styles.avatarCircle, { backgroundColor: colors.backgroundElement }]}>
                      <Ionicons name="chatbubbles-outline" size={40} color={colors.userBubble} />
                    </View>
                    <Text style={[styles.welcomeTitle, { color: colors.text }]}>
                      Meet your Finance Agent
                    </Text>
                    <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                      Ask me to add transactions, list your wallets, tag expenses, or check balances using natural language!
                    </Text>
                  </View>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageRow,
                          isUser ? styles.messageRowUser : styles.messageRowAgent,
                        ]}
                      >
                        {!isUser && (
                          <View style={[styles.agentAvatar, { backgroundColor: colors.backgroundElement }]}>
                            <Ionicons name="sparkles" size={14} color={colors.userBubble} />
                          </View>
                        )}
                        <View
                          style={[
                            styles.bubble,
                            isUser
                              ? [styles.bubbleUser, { backgroundColor: colors.userBubble }]
                              : [styles.bubbleAgent, { backgroundColor: colors.backgroundElement }],
                          ]}
                        >
                          {isUser ? (
                            <Text style={styles.bubbleUserText}>{msg.content}</Text>
                          ) : (
                            <MarkdownText content={msg.content} colors={colors} onLinkPress={handleLinkPress} />
                          )}
                        </View>
                      </View>
                    );
                  })
                )}

                {/* Agent Typing State */}
                {sending && (
                  <View style={[styles.messageRow, styles.messageRowAgent]}>
                    <View style={[styles.agentAvatar, { backgroundColor: colors.backgroundElement }]}>
                      <Ionicons name="sparkles" size={14} color={colors.userBubble} />
                    </View>
                    <View style={[styles.bubble, styles.bubbleAgent, { backgroundColor: colors.backgroundElement }]}>
                      <View style={styles.typingContainer}>
                        <ActivityIndicator size="small" color={colors.userBubble} style={styles.typingSpinner} />
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          Processing...
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Quick Action Suggestion Chips */}
              {!loading && isApiKeySet && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsScrollContent}
                  >
                    {actionChips.map((chip, idx) => (
                      <Pressable
                        key={idx}
                        style={({ pressed }) => [
                          styles.chip,
                          {
                            backgroundColor: colors.backgroundElement,
                            borderColor: colors.borderColor,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                        onPress={() => handleSendMessage(chip.query)}
                      >
                        <Text style={[styles.chipText, { color: colors.text }]}>{chip.label}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Input Bar */}
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
              >
                <View style={[styles.inputContainer, { borderTopColor: colors.borderColor, backgroundColor: colors.chatBackground }]}>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.inputBackground,
                        color: colors.text,
                        opacity: isApiKeySet ? 1 : 0.6,
                      },
                    ]}
                    placeholder={isApiKeySet ? "Ask SpendSense AI..." : "Please configure your Gemini API Key in Settings first."}
                    placeholderTextColor={colors.textSecondary}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    maxLength={500}
                    editable={isApiKeySet && !sending}
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.sendButton,
                      {
                        backgroundColor: (message.trim() && isApiKeySet) ? colors.userBubble : colors.backgroundElement,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                    disabled={!message.trim() || sending || !isApiKeySet}
                    onPress={() => handleSendMessage(message)}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={20}
                      color={(message.trim() && isApiKeySet) ? '#FFF' : colors.textSecondary}
                    />
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 999,
  },
  modalContainer: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flex: 1,
  },
  assistantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC71',
    marginLeft: 6,
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    maxWidth: '85%',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageRowAgent: {
    alignSelf: 'flex-start',
  },
  agentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '100%',
  },
  bubbleUser: {
    borderBottomRightRadius: 2,
  },
  bubbleAgent: {
    borderBottomLeftRadius: 2,
  },
  bubbleUserText: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 19,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingSpinner: {
    marginRight: 8,
  },
  suggestionsContainer: {
    height: 44,
    marginVertical: 4,
  },
  suggestionsScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 13,
    lineHeight: 18,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* Sessions Styles */
  sessionListScroll: {
    flex: 1,
  },
  sessionListContent: {
    padding: 16,
    gap: 12,
  },
  newSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 8,
  },
  newSessionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySessionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
  emptySessionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySessionsSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sessionCardPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  sessionCardIcon: {
    marginRight: 12,
  },
  sessionCardDetails: {
    flex: 1,
  },
  sessionCardTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  sessionCardTime: {
    fontSize: 11,
  },
  sessionCardEditContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  sessionCardInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
  },
  editButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sessionActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 4,
  },
  sessionCardAction: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
