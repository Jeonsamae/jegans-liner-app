import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const ORANGE = '#E05C04';

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  edited_at?: string | null;
  shared_post_id?: string | null;
};

function AvatarCircle({
  uri,
  name,
  size = 30,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ddd' }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#ccc',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: '#555' }}>
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function ChatRoomScreen() {
  const { session } = useAuth();
  const { conversationId, userId, friendId, friendName, friendPhoto } = useLocalSearchParams<{
    conversationId?: string;
    userId?: string;
    friendId?: string;
    friendName?: string;
    friendPhoto?: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId ?? null);
  const [chatUser, setChatUser] = useState({
    id: (friendId ?? userId) || '',
    name: friendName || 'User',
    photo: friendPhoto || '',
  });
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Edit state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Mark conversation as read
  const markAsRead = useCallback(async () => {
    if (!session?.user || !activeConversationId) return;
    await supabase.from('conversation_reads').upsert({
      conversation_id: activeConversationId,
      user_id: session.user.id,
      last_read_at: new Date().toISOString(),
    });
  }, [session, activeConversationId]);

  const prepareConversation = useCallback(async () => {
    if (!session?.user) return;
    if (conversationId) {
      setActiveConversationId(conversationId);
      return;
    }

    const otherUserId = friendId ?? userId;
    if (!otherUserId) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, photo_url')
      .eq('id', otherUserId)
      .single();

    if (profile) {
      setChatUser({
        id: profile.id,
        name: profile.full_name,
        photo: profile.photo_url ?? '',
      });
    }

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(user1_id.eq.${session.user.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${session.user.id})`
      )
      .maybeSingle();

    if (existing?.id) {
      setActiveConversationId(existing.id);
      return;
    }

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ user1_id: session.user.id, user2_id: otherUserId })
      .select('id')
      .single();

    if (error) {
      console.error('prepareConversation error:', error);
      Alert.alert('Unable to open chat', 'Please try again.');
      setLoading(false);
      return;
    }

    setActiveConversationId(created.id);
  }, [conversationId, friendId, session, userId]);

  useEffect(() => {
    prepareConversation();
  }, [prepareConversation]);

  const fetchMessages = useCallback(async () => {
    if (!activeConversationId) return;
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at, edited_at, shared_post_id')
      .eq('conversation_id', activeConversationId)
      .order('created_at', { ascending: true });

    setMessages(data ?? []);
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    markAsRead();
  }, [activeConversationId, markAsRead]);

  useEffect(() => {
    if (!activeConversationId) return;
    fetchMessages();

    const channel = supabase
      .channel(`chat-room:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          // Mark as read whenever a new message arrives while we're in this chat
          markAsRead();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const { id } = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages, activeConversationId, markAsRead]);

  const sendMessage = async () => {
    if (!session?.user || !activeConversationId || !messageText.trim()) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    const { data: newMsg } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversationId,
        sender_id: session.user.id,
        content: text,
      })
      .select('id, sender_id, content, created_at, edited_at')
      .single();

    if (newMsg) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeConversationId);

    setSending(false);
  };

  const handleLongPress = (msg: Message) => {
    const isOwn = msg.sender_id === session?.user?.id;
    if (!isOwn) return;

    Alert.alert('Message', '', [
      {
        text: 'Edit',
        onPress: () => {
          setEditingMessage(msg);
          setEditText(msg.content);
          setShowEditModal(true);
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Message', 'This message will be permanently deleted.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteMessage(msg.id),
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase
      .from('messages')
      .delete()
      .eq('id', msgId)
      .eq('sender_id', session?.user?.id ?? '');
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const saveEdit = async () => {
    if (!editingMessage || !editText.trim()) return;
    setSavingEdit(true);

    const { data: updated } = await supabase
      .from('messages')
      .update({
        content: editText.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq('id', editingMessage.id)
      .eq('sender_id', session?.user?.id ?? '')
      .select('id, sender_id, content, created_at, edited_at')
      .single();

    if (updated) {
      setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    }

    setSavingEdit(false);
    setShowEditModal(false);
    setEditingMessage(null);
    setEditText('');
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwn = item.sender_id === session?.user?.id;
    const prevMsg = messages[index - 1];
    const showTime =
      !prevMsg ||
      new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime() >
        5 * 60 * 1000;

    return (
      <View>
        {showTime && <Text style={styles.timeLabel}>{formatTime(item.created_at)}</Text>}
        <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
          {!isOwn && <AvatarCircle uri={chatUser.photo || null} name={chatUser.name} size={28} />}
          <TouchableOpacity
            style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}
            onLongPress={() => handleLongPress(item)}
            delayLongPress={400}
            activeOpacity={0.85}
          >
            {item.shared_post_id ? (
              <TouchableOpacity
                style={styles.sharedPostCard}
                onPress={() =>
                  router.push({
                    pathname: '/post-detail',
                    params: { postId: item.shared_post_id },
                  } as any)
                }
                activeOpacity={0.85}
              >
                <View style={styles.sharedPostIcon}>
                  <Ionicons name="newspaper-outline" size={20} color={ORANGE} />
                </View>
                <View style={styles.sharedPostTextWrap}>
                  <Text
                    style={[
                      styles.sharedPostTitle,
                      isOwn ? styles.sharedPostTitleOwn : styles.sharedPostTitleOther,
                    ]}
                  >
                    Shared post
                  </Text>
                  <Text
                    style={[
                      styles.sharedPostSubtitle,
                      isOwn ? styles.sharedPostSubtitleOwn : styles.sharedPostSubtitleOther,
                    ]}
                  >
                    Tap to view the post
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <Text
                style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}
              >
                {item.content}
              </Text>
            )}
            {item.edited_at && (
              <Text style={[styles.editedTag, isOwn ? styles.editedTagOwn : styles.editedTagOther]}>
                edited
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <AvatarCircle uri={chatUser.photo || null} name={chatUser.name} size={38} />
        <Text style={styles.headerName} numberOfLines={1}>
          {chatUser.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ORANGE} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-outline" size={52} color="#ccc" />
                <Text style={styles.emptyText}>No messages yet.{'\n'}Say hello!</Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#bcc0c4"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !messageText.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!messageText.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Edit Message Modal */}
      <Modal visible={showEditModal} transparent animationType="fade" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.editOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editModalTitle}>Edit Message</Text>
            <TextInput
              style={styles.editInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              maxLength={1000}
              placeholderTextColor="#bcc0c4"
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => {
                  setShowEditModal(false);
                  setEditingMessage(null);
                  setEditText('');
                }}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, (!editText.trim() || savingEdit) && { opacity: 0.5 }]}
                onPress={saveEdit}
                disabled={!editText.trim() || savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.editSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
    backgroundColor: '#fff',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#050505',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#65676b',
    textAlign: 'center',
    lineHeight: 24,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },
  timeLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: '#65676b',
    marginVertical: 10,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
    gap: 6,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleOwn: {
    backgroundColor: ORANGE,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#e4e6eb',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextOwn: {
    color: '#fff',
  },
  bubbleTextOther: {
    color: '#050505',
  },
  editedTag: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  editedTagOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  editedTagOther: {
    color: '#888',
  },
  sharedPostCard: {
    minWidth: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sharedPostIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#fff3e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sharedPostTextWrap: {
    flex: 1,
  },
  sharedPostTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  sharedPostTitleOwn: {
    color: '#fff',
  },
  sharedPostTitleOther: {
    color: '#050505',
  },
  sharedPostSubtitle: {
    fontSize: 12,
  },
  sharedPostSubtitleOwn: {
    color: 'rgba(255,255,255,0.85)',
  },
  sharedPostSubtitleOther: {
    color: '#65676b',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#050505',
    maxHeight: 100,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#ccc',
  },
  // Edit Modal
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  editModal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#050505',
    marginBottom: 14,
  },
  editInput: {
    backgroundColor: '#f0f2f5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#050505',
    minHeight: 60,
    maxHeight: 140,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  editCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editCancelText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  editSaveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: ORANGE,
    minWidth: 70,
    alignItems: 'center',
  },
  editSaveText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
});
