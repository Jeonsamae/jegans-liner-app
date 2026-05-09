import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const ORANGE = '#E05C04';

type Friend = {
  id: string;
  full_name: string;
  photo_url: string | null;
  conversationId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  hasUnread?: boolean;
};

type ConversationRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  updated_at: string;
};

type LastMessage = {
  content: string;
  created_at: string;
  sender_id: string;
  shared_post_id?: string | null;
};

function AvatarCircle({
  uri,
  name,
  size = 52,
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

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ChatsScreen() {
  const { session } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendsAndConversations = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`);

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id, updated_at')
        .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
        .order('updated_at', { ascending: false }) as { data: ConversationRow[] | null };

      const friendIds = friendships?.map((f) =>
        f.requester_id === session.user.id ? f.addressee_id : f.requester_id
      ) ?? [];

      const conversationUserIds = conversations?.map((c) =>
        c.user1_id === session.user.id ? c.user2_id : c.user1_id
      ) ?? [];

      const visibleUserIds = Array.from(new Set([...friendIds, ...conversationUserIds]));

      if (visibleUserIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url')
        .in('id', visibleUserIds);

      // Map: friendId -> conversation
      const convMap: Record<string, { id: string; updatedAt: string }> = {};
      conversations?.forEach((c) => {
        const otherId = c.user1_id === session.user.id ? c.user2_id : c.user1_id;
        convMap[otherId] = { id: c.id, updatedAt: c.updated_at };
      });

      // Fetch last message per conversation
      const convIds = Object.values(convMap).map((c) => c.id);
      const lastMessages: Record<string, LastMessage> = {};

      if (convIds.length > 0) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('conversation_id, content, created_at, sender_id, shared_post_id')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false });

        msgs?.forEach((m) => {
          if (!lastMessages[m.conversation_id]) {
            lastMessages[m.conversation_id] = {
              content: m.content,
              created_at: m.created_at,
              sender_id: m.sender_id,
              shared_post_id: m.shared_post_id,
            };
          }
        });
      }

      // Fetch user's last read times to determine unread status
      const readMap: Record<string, string> = {};
      if (convIds.length > 0) {
        const { data: reads } = await supabase
          .from('conversation_reads')
          .select('conversation_id, last_read_at')
          .eq('user_id', session.user.id)
          .in('conversation_id', convIds);
        reads?.forEach((r) => { readMap[r.conversation_id] = r.last_read_at; });
      }

      const enriched: Friend[] = (profiles ?? []).map((p) => {
        const conv = convMap[p.id];
        const lastMsg = conv ? lastMessages[conv.id] : undefined;
        const lastRead = conv ? readMap[conv.id] : undefined;
        // Unread only when the newest message came from the other person after our last read.
        const hasUnread = !!(
          lastMsg &&
          lastMsg.created_at &&
          lastMsg.sender_id !== session.user.id &&
          (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead))
        );
        return {
          id: p.id,
          full_name: p.full_name,
          photo_url: p.photo_url,
          conversationId: conv?.id,
          lastMessage: lastMsg?.shared_post_id ? 'Shared a post' : lastMsg?.content,
          lastMessageTime: lastMsg?.created_at ?? conv?.updatedAt,
          hasUnread,
        };
      });

      // Sort by last activity (conversations first, then alphabetical)
      enriched.sort((a, b) => {
        if (a.lastMessageTime && b.lastMessageTime) {
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        }
        if (a.lastMessageTime) return -1;
        if (b.lastMessageTime) return 1;
        return a.full_name.localeCompare(b.full_name);
      });

      setFriends(enriched);
    } catch (e) {
      console.error('fetchFriendsAndConversations error:', e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchFriendsAndConversations();
  }, [fetchFriendsAndConversations]);

  useFocusEffect(
    useCallback(() => {
      fetchFriendsAndConversations();
    }, [fetchFriendsAndConversations])
  );

  useEffect(() => {
    if (!session?.user) return;

    const refreshInbox = () => {
      fetchFriendsAndConversations();
    };

    const channel = supabase
      .channel(`chats-inbox-${session.user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, refreshInbox)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, refreshInbox)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_reads',
          filter: `user_id=eq.${session.user.id}`,
        },
        refreshInbox
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          refreshInbox();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFriendsAndConversations, session?.user]);

  const openChat = async (friend: Friend) => {
    if (!session?.user) return;

    let conversationId = friend.conversationId;

    if (!conversationId) {
      // Try to create a new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user1_id: session.user.id, user2_id: friend.id })
        .select('id')
        .single();

      if (error) {
        // Might already exist (unique constraint) — try to find it
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .or(
            `and(user1_id.eq.${session.user.id},user2_id.eq.${friend.id}),and(user1_id.eq.${friend.id},user2_id.eq.${session.user.id})`
          )
          .maybeSingle();
        conversationId = existing?.id;
      } else {
        conversationId = data?.id;
      }
    }

    if (conversationId) {
      router.push({
        pathname: '/chat-room',
        params: {
          conversationId,
          friendId: friend.id,
          friendName: friend.full_name,
          friendPhoto: friend.photo_url ?? '',
        },
      });
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity style={styles.friendRow} onPress={() => openChat(item)} activeOpacity={0.75}>
      <AvatarCircle uri={item.photo_url} name={item.full_name} size={52} />
      <View style={styles.friendInfo}>
        <View style={styles.friendTopRow}>
          <Text style={[styles.friendName, item.hasUnread && styles.friendNameUnread]} numberOfLines={1}>
            {item.full_name}
          </Text>
          {item.lastMessageTime && (
            <Text style={[styles.friendTime, item.hasUnread && styles.friendTimeUnread]}>
              {formatTime(item.lastMessageTime)}
            </Text>
          )}
        </View>
        <View style={styles.lastMessageRow}>
          <Text
            style={[styles.lastMessage, item.hasUnread && styles.lastMessageUnread]}
            numberOfLines={1}
          >
            {item.lastMessage ?? 'Tap to start a conversation'}
          </Text>
          {item.hasUnread && <View style={styles.unreadDot} />}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={renderFriend}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No chats yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#050505',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#65676b',
    textAlign: 'center',
    lineHeight: 24,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#050505',
    flex: 1,
    marginRight: 8,
  },
  friendTime: {
    fontSize: 12,
    color: '#65676b',
  },
  lastMessage: {
    fontSize: 14,
    color: '#65676b',
    flex: 1,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f2f5',
    marginLeft: 80,
  },
  friendNameUnread: {
    fontWeight: '800',
    color: '#050505',
  },
  friendTimeUnread: {
    color: ORANGE,
    fontWeight: '600',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ORANGE,
    marginLeft: 6,
    flexShrink: 0,
  },
});
