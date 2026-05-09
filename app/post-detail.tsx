import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import PostShareModal from '../components/PostShareModal';

const ORANGE = '#E05C04';

type ProfileInfo = {
  full_name: string;
  photo_url: string | null;
  is_admin?: boolean;
};

type PostDetail = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: ProfileInfo;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  user_liked: boolean;
};

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: ProfileInfo;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function AvatarCircle({
  uri,
  name,
  size = 50,
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

export default function PostDetailScreen() {
  const { session, userProfile } = useAuth();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!session?.user || !postId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, content, image_url, created_at, profiles(full_name, photo_url, is_admin)')
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setPost(null);
        return;
      }

      const [
        { count: likesCount },
        { count: commentsCount },
        { count: sharesCount },
        { data: userLike },
        { data: commentsData },
      ] =
        await Promise.all([
          supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', postId),
          supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
          supabase.from('shares').select('id', { count: 'exact', head: true }).eq('post_id', postId),
          supabase
            .from('likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', session.user.id)
            .maybeSingle(),
          supabase
            .from('comments')
            .select('id, user_id, content, created_at, profiles(full_name, photo_url, is_admin)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true }),
        ]);

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      setPost({
        ...data,
        profiles: profile as ProfileInfo,
        likes_count: likesCount ?? 0,
        comments_count: commentsCount ?? 0,
        shares_count: sharesCount ?? 0,
        user_liked: !!userLike,
      });
      setComments((commentsData ?? []).map((comment: any) => ({
        ...comment,
        profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
      })));
    } catch (e) {
      console.error('fetch post detail error:', e);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId, session?.user]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    if (!session?.user || !post) return;
    const wasLiked = post.user_liked;

    setPost((prev) =>
      prev
        ? {
            ...prev,
            user_liked: !wasLiked,
            likes_count: wasLiked ? Math.max(prev.likes_count - 1, 0) : prev.likes_count + 1,
          }
        : prev
    );

    if (wasLiked) {
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', session.user.id);
    } else {
      await supabase.from('likes').insert({ post_id: post.id, user_id: session.user.id });
    }
  };

  const handleAddComment = async () => {
    if (!session?.user || !post || !commentText.trim()) return;
    const text = commentText.trim();
    setSubmittingComment(true);

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({ post_id: post.id, user_id: session.user.id, content: text })
      .select('id, user_id, content, created_at, profiles(full_name, photo_url, is_admin)')
      .single();

    if (!error && newComment) {
      setComments((prev) => [
        ...prev,
        {
          ...newComment,
          profiles: Array.isArray(newComment.profiles)
            ? newComment.profiles[0]
            : newComment.profiles,
        },
      ]);
      setPost((prev) =>
        prev ? { ...prev, comments_count: prev.comments_count + 1 } : prev
      );
      setCommentText('');
    }

    setSubmittingComment(false);
  };

  const handleShared = (recipientCount: number) => {
    setPost((prev) =>
      prev ? { ...prev, shares_count: prev.shares_count + recipientCount } : prev
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : !post ? (
        <View style={styles.centered}>
          <Ionicons name="newspaper-outline" size={54} color="#ccc" />
          <Text style={styles.emptyText}>Post unavailable.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <AvatarCircle uri={post.profiles?.photo_url} name={post.profiles?.full_name} />
                <View style={styles.authorBlock}>
                  <View style={styles.authorLine}>
                    <Text style={styles.authorName}>{post.profiles?.full_name ?? 'Unknown'}</Text>
                    {post.profiles?.is_admin && (
                      <View style={styles.adminBadge}>
                        <Text style={styles.adminBadgeText}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.dateText}>{formatDate(post.created_at)}</Text>
                </View>
              </View>

              {!!post.content && <Text style={styles.content}>{post.content}</Text>}
              {!!post.image_url && <Image source={{ uri: post.image_url }} style={styles.postImage} />}

              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.likeCircle} onPress={handleLike}>
                  <Ionicons name="thumbs-up" size={13} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.statsText}>{post.likes_count}</Text>
                <Text style={styles.statsRight}>
                  {post.comments_count} Comments   {post.shares_count} Shares
                </Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
                  <Ionicons
                    name={post.user_liked ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={20}
                    color={post.user_liked ? '#1877f2' : '#65676b'}
                  />
                  <Text style={[styles.actionText, post.user_liked && { color: '#1877f2' }]}>Like</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn}>
                  <Ionicons name="chatbubble-outline" size={20} color="#65676b" />
                  <Text style={styles.actionText}>Comment</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => setShowShareModal(true)}>
                  <Ionicons name="arrow-redo-outline" size={20} color="#65676b" />
                  <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.commentsSection}>
                <View style={styles.divider} />
                {comments.map((comment) => (
                  <View key={comment.id} style={styles.commentRow}>
                    <AvatarCircle uri={comment.profiles?.photo_url} name={comment.profiles?.full_name} size={34} />
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{comment.profiles?.full_name ?? 'Unknown'}</Text>
                      <Text style={styles.commentContent}>{comment.content}</Text>
                    </View>
                  </View>
                ))}

                <View style={styles.commentInputRow}>
                  <AvatarCircle uri={userProfile?.photo_url} name={userProfile?.full_name} size={34} />
                  <View style={styles.commentInputWrap}>
                    <TextInput
                      style={styles.commentInput}
                      placeholder="Write a comment..."
                      placeholderTextColor="#bcc0c4"
                      value={commentText}
                      onChangeText={setCommentText}
                      multiline
                    />
                    <TouchableOpacity onPress={handleAddComment} disabled={submittingComment || !commentText.trim()}>
                      {submittingComment ? (
                        <ActivityIndicator size="small" color={ORANGE} />
                      ) : (
                        <Ionicons name="send" size={20} color={commentText.trim() ? ORANGE : '#bcc0c4'} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <PostShareModal
        visible={showShareModal}
        post={post}
        onClose={() => setShowShareModal(false)}
        onShared={handleShared}
      />
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
    fontWeight: '800',
    color: '#050505',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#65676b',
  },
  postCard: {
    backgroundColor: '#fff',
    marginTop: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  avatarFallback: {
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorBlock: {
    marginLeft: 10,
    flex: 1,
  },
  authorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#050505',
  },
  adminBadge: {
    backgroundColor: '#fff3e8',
    borderColor: ORANGE,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  adminBadgeText: {
    color: ORANGE,
    fontSize: 10,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 12,
    color: '#65676b',
    marginTop: 1,
  },
  content: {
    fontSize: 15,
    color: '#050505',
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 320,
    backgroundColor: '#ddd',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  likeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1877f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsText: {
    fontSize: 14,
    color: '#65676b',
    marginLeft: 5,
  },
  statsRight: {
    flex: 1,
    fontSize: 14,
    color: '#65676b',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#e4e6eb',
    marginHorizontal: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#65676b',
  },
  commentsSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  commentRow: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  commentBubble: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#050505',
    marginBottom: 2,
  },
  commentContent: {
    fontSize: 14,
    color: '#050505',
    lineHeight: 19,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  commentInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#050505',
    maxHeight: 80,
    padding: 0,
  },
});
