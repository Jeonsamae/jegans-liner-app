import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const ORANGE = '#E05C04';

type ShareFriend = {
  id: string;
  full_name: string;
  photo_url: string | null;
};

type SharePost = {
  id: string;
  content: string;
  image_url: string | null;
};

type PostShareModalProps = {
  visible: boolean;
  post: SharePost | null;
  onClose: () => void;
  onShared?: (recipientCount: number) => void;
};

function AvatarCircle({
  uri,
  name,
  size = 44,
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
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: '#555' }}>
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}

export default function PostShareModal({
  visible,
  post,
  onClose,
  onShared,
}: PostShareModalProps) {
  const { session, userProfile } = useAuth();
  const [friends, setFriends] = useState<ShareFriend[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!session?.user || !visible) return;
    setLoading(true);

    try {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`);

      const friendIds = friendships?.map((f) =>
        f.requester_id === session.user.id ? f.addressee_id : f.requester_id
      ) ?? [];

      if (!friendIds.length) {
        setFriends([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url')
        .in('id', friendIds)
        .order('full_name');

      setFriends(profiles ?? []);
    } catch (e) {
      console.error('fetch share friends error:', e);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user, visible]);

  useEffect(() => {
    if (visible) {
      setSelectedIds([]);
      fetchFriends();
    }
  }, [fetchFriends, visible]);

  const toggleFriend = (friendId: string) => {
    setSelectedIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const getOrCreateConversation = async (friendId: string) => {
    if (!session?.user) return null;

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(user1_id.eq.${session.user.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${session.user.id})`
      )
      .maybeSingle();

    if (existing?.id) return existing.id;

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ user1_id: session.user.id, user2_id: friendId })
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  };

  const handleShare = async () => {
    if (!session?.user || !post || selectedIds.length === 0) return;
    setSharing(true);

    try {
      const senderName = userProfile?.full_name ?? 'Someone';

      for (const friendId of selectedIds) {
        const conversationId = await getOrCreateConversation(friendId);
        if (!conversationId) continue;

        const { error: messageError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: session.user.id,
          content: `${senderName} shared a post`,
          shared_post_id: post.id,
        });

        if (messageError) throw messageError;

        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }

      await supabase.from('shares').insert(
        selectedIds.map(() => ({ post_id: post.id, user_id: session.user.id }))
      );

      onShared?.(selectedIds.length);
      Alert.alert('Shared!', 'Post was sent to the selected chat.');
      onClose();
    } catch (e) {
      console.error('share post error:', e);
      Alert.alert(
        'Unable to share',
        'Please make sure the messages table has the shared_post_id column, then try again.'
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Share to friends</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          {!!post && (
            <View style={styles.preview}>
              {post.image_url ? <Image source={{ uri: post.image_url }} style={styles.previewImage} /> : null}
              <Text style={styles.previewText} numberOfLines={2}>
                {post.content || 'Shared post'}
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={ORANGE} />
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const selected = selectedIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={styles.friendRow}
                    onPress={() => toggleFriend(item.id)}
                    activeOpacity={0.8}
                  >
                    <AvatarCircle uri={item.photo_url} name={item.full_name} />
                    <Text style={styles.friendName} numberOfLines={1}>{item.full_name}</Text>
                    <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
                      {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Ionicons name="people-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No accepted friends yet.</Text>
                </View>
              }
            />
          )}

          <TouchableOpacity
            style={[styles.shareBtn, (!selectedIds.length || sharing) && styles.shareBtnDisabled]}
            onPress={handleShare}
            disabled={!selectedIds.length || sharing}
            activeOpacity={0.85}
          >
            {sharing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={styles.shareBtnText}>
                  Send{selectedIds.length ? ` (${selectedIds.length})` : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 14,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f7f8fa',
    gap: 10,
  },
  previewImage: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  previewText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 19,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 34,
    gap: 10,
  },
  emptyText: {
    fontSize: 15,
    color: '#65676b',
    textAlign: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    gap: 12,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  avatarFallback: {
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#ccd0d5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  shareBtn: {
    marginHorizontal: 18,
    marginTop: 10,
    height: 48,
    borderRadius: 8,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  shareBtnDisabled: {
    backgroundColor: '#ccc',
  },
  shareBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
