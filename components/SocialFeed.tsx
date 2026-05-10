import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import PostShareModal from './PostShareModal';

const ORANGE = '#E05C04';

type AuthorFilter = 'all' | 'admin' | 'users';

type ProfileInfo = {
  full_name: string;
  photo_url: string | null;
  is_admin?: boolean;
};

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: ProfileInfo;
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: ProfileInfo;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  user_liked: boolean;
  comments?: Comment[];
  showComments?: boolean;
};

type SocialFeedProps = {
  authorFilter?: AuthorFilter;
  showCreatePostBar?: boolean;
  createPostRoute?: '/create-post' | '/admin-create-post';
  emptyMessage?: string;
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

export default function SocialFeed({
  authorFilter = 'all',
  showCreatePostBar = false,
  createPostRoute = '/create-post',
  emptyMessage = 'No posts yet.',
}: SocialFeedProps) {
  const { session, userProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
  const [sharingPost, setSharingPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!session?.user) return;
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('id, user_id, content, image_url, created_at, profiles(full_name, photo_url, is_admin)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const filteredPosts = (postsData ?? []).filter((p) => {
        const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        if (authorFilter === 'admin') return !!prof?.is_admin;
        if (authorFilter === 'users') return !prof?.is_admin;
        return true;
      });

      if (!filteredPosts.length) {
        setPosts([]);
        return;
      }

      const { data: userLikes } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', session.user.id);

      const likedPostIds = new Set(userLikes?.map((l) => l.post_id) ?? []);
      const postIds = filteredPosts.map((p) => p.id);

      const [{ data: likeCounts }, { data: commentCounts }, { data: shareCounts }] =
        await Promise.all([
          supabase.from('likes').select('post_id').in('post_id', postIds),
          supabase.from('comments').select('post_id').in('post_id', postIds),
          supabase.from('shares').select('post_id').in('post_id', postIds),
        ]);

      const likeMap: Record<string, number> = {};
      const commentMap: Record<string, number> = {};
      const shareMap: Record<string, number> = {};
      likeCounts?.forEach((l) => { likeMap[l.post_id] = (likeMap[l.post_id] ?? 0) + 1; });
      commentCounts?.forEach((c) => { commentMap[c.post_id] = (commentMap[c.post_id] ?? 0) + 1; });
      shareCounts?.forEach((s) => { shareMap[s.post_id] = (shareMap[s.post_id] ?? 0) + 1; });

      const enriched: Post[] = filteredPosts.map((p) => {
        const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
        return {
          ...p,
          profiles: prof as ProfileInfo,
          likes_count: likeMap[p.id] ?? 0,
          comments_count: commentMap[p.id] ?? 0,
          shares_count: shareMap[p.id] ?? 0,
          user_liked: likedPostIds.has(p.id),
          showComments: false,
        };
      });

      setPosts(enriched);
    } catch (e) {
      console.error('fetchPosts error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authorFilter, session]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts])
  );

  useEffect(() => {
    if (!session?.user) return;

    const refreshFeed = () => {
      fetchPosts();
    };

    const channel = supabase
      .channel(`social-feed-${authorFilter}-${session.user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, refreshFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, refreshFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, refreshFeed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shares' }, refreshFeed)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          refreshFeed();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authorFilter, fetchPosts, session?.user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: string, userLiked: boolean) => {
    if (!session?.user) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, user_liked: !userLiked, likes_count: userLiked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      )
    );
    if (userLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', session.user.id);
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: session.user.id });
    }
  };

  const handleToggleComments = async (postId: string, showComments: boolean) => {
    if (!showComments) {
      const { data } = await supabase
        .from('comments')
        .select('id, user_id, content, created_at, profiles(full_name, photo_url, is_admin)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      const comments: Comment[] = (data ?? []).map((c: any) => ({
        ...c,
        profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
      }));

      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, showComments: true, comments } : p))
      );
    } else {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, showComments: false } : p))
      );
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!session?.user) return;
    const text = commentText[postId]?.trim();
    if (!text) return;
    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({ post_id: postId, user_id: session.user.id, content: text })
      .select('id, user_id, content, created_at, profiles(full_name, photo_url, is_admin)')
      .single();

    if (!error && newComment) {
      const comment: Comment = {
        ...newComment,
        profiles: Array.isArray(newComment.profiles) ? newComment.profiles[0] : newComment.profiles,
      };
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...(p.comments ?? []), comment], comments_count: p.comments_count + 1 }
            : p
        )
      );
      setCommentText((prev) => ({ ...prev, [postId]: '' }));
    }
    setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
  };

  const handleShared = (postId: string, recipientCount: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, shares_count: p.shares_count + recipientCount } : p
      )
    );
  };

  const openEditPost = (post: Post) => {
    setEditingPost(post);
    setEditingContent(post.content);
  };

  const saveEditedPost = async () => {
    if (!session?.user || !editingPost) return;
    const content = editingContent.trim();

    if (!content && !editingPost.image_url) {
      Alert.alert('Empty post', 'Please write something before saving.');
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', editingPost.id)
      .eq('user_id', session.user.id);

    setSavingEdit(false);

    if (error) {
      console.error('editPost error:', error);
      Alert.alert('Update failed', 'Please try editing your post again.');
      return;
    }

    setPosts((prev) =>
      prev.map((post) => (post.id === editingPost.id ? { ...post, content } : post))
    );
    setEditingPost(null);
    setEditingContent('');
  };

  const deletePost = async (post: Post) => {
    if (!session?.user) return;

    const deleteOwnedPost = async () => {
      const cleanup = [
        supabase.from('likes').delete().eq('post_id', post.id),
        supabase.from('comments').delete().eq('post_id', post.id),
        supabase.from('shares').delete().eq('post_id', post.id),
      ];

      const cleanupResults = await Promise.all(cleanup);
      const cleanupError = cleanupResults.find((result) => result.error)?.error;
      if (cleanupError) {
        console.error('deletePost cleanup error:', cleanupError);
        Alert.alert('Delete failed', 'Please try deleting your post again.');
        return;
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', session.user.id);

      if (error) {
        console.error('deletePost error:', error);
        Alert.alert('Delete failed', 'Please try deleting your post again.');
        return;
      }

      setPosts((prev) => prev.filter((item) => item.id !== post.id));
    };

    Alert.alert('Delete post?', 'This will remove your post from the feed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: deleteOwnedPost },
    ]);
  };

  const renderPost = ({ item: post }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <AvatarCircle uri={post.profiles?.photo_url} name={post.profiles?.full_name} size={50} />
        <View style={styles.postAuthorBlock}>
          <View style={styles.authorLine}>
            <Text style={styles.postAuthorName}>{post.profiles?.full_name ?? 'Unknown'}</Text>
            {post.profiles?.is_admin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            )}
          </View>
          <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
        </View>
        {post.user_id === session?.user.id && (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={styles.ownerActionBtn} onPress={() => openEditPost(post)}>
              <Ionicons name="create-outline" size={19} color="#65676b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ownerActionBtn} onPress={() => deletePost(post)}>
              <Ionicons name="trash-outline" size={19} color="#b91c1c" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!!post.content && <Text style={styles.postContent}>{post.content}</Text>}

      {!!post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={styles.statsRow}>
        <TouchableOpacity onPress={() => handleLike(post.id, post.user_liked)} style={styles.likeCircle}>
          <Ionicons name="thumbs-up" size={13} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.statsCount}>{post.likes_count}</Text>
        <View style={styles.statsRight}>
          <TouchableOpacity onPress={() => handleToggleComments(post.id, post.showComments ?? false)}>
            <Text style={styles.statsLink}>{post.comments_count} Comments</Text>
          </TouchableOpacity>
          <Text style={styles.statsLink}>  {post.shares_count} Shares</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post.id, post.user_liked)}>
          <Ionicons
            name={post.user_liked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={20}
            color={post.user_liked ? '#1877f2' : '#65676b'}
          />
          <Text style={[styles.actionText, post.user_liked && { color: '#1877f2' }]}>Like</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleToggleComments(post.id, post.showComments ?? false)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#65676b" />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setSharingPost(post)}>
          <Ionicons name="arrow-redo-outline" size={20} color="#65676b" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {post.showComments && (
        <View style={styles.commentsSection}>
          <View style={styles.divider} />
          {post.comments?.map((comment) => (
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
                value={commentText[post.id] ?? ''}
                onChangeText={(text) => setCommentText((prev) => ({ ...prev, [post.id]: text }))}
                multiline
              />
              <TouchableOpacity onPress={() => handleAddComment(post.id)} disabled={submittingComment[post.id]}>
                {submittingComment[post.id] ? (
                  <ActivityIndicator size="small" color={ORANGE} />
                ) : (
                  <Ionicons name="send" size={20} color={commentText[post.id]?.trim() ? ORANGE : '#bcc0c4'} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const CreatePostBar = () => (
    <TouchableOpacity
      style={styles.createPostBar}
      onPress={() => router.push(createPostRoute)}
      activeOpacity={0.85}
    >
      <AvatarCircle uri={userProfile?.photo_url} name={userProfile?.full_name} size={44} />
      <View style={styles.createPostInputBox}>
        <Text style={styles.createPostPlaceholder}>What is on your mind?</Text>
        <View style={styles.photoIconBox}>
          <Ionicons name="image" size={18} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[ORANGE]}
            tintColor={ORANGE}
          />
        }
        ListHeaderComponent={showCreatePostBar ? <CreatePostBar /> : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
        ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={52} color="#ccc" />
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          </View>
        }
      />
      <PostShareModal
        visible={!!sharingPost}
        post={sharingPost}
        onClose={() => setSharingPost(null)}
        onShared={(recipientCount) => {
          if (sharingPost) handleShared(sharingPost.id, recipientCount);
        }}
      />
      <Modal visible={!!editingPost} transparent animationType="fade" onRequestClose={() => setEditingPost(null)}>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Edit Post</Text>
            <TextInput
              style={styles.editPostInput}
              value={editingContent}
              onChangeText={setEditingContent}
              placeholder="What is on your mind?"
              placeholderTextColor="#8a8d91"
              multiline
              textAlignVertical="top"
            />
            <View style={styles.editModalActions}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => {
                  setEditingPost(null);
                  setEditingContent('');
                }}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, savingEdit && { opacity: 0.65 }]}
                onPress={saveEditedPost}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  createPostBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
    marginBottom: 8,
  },
  createPostInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#ccd0d5',
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#fff',
  },
  createPostPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#65676b',
  },
  photoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedContent: {
    paddingBottom: 20,
  },
  postSeparator: {
    height: 8,
    backgroundColor: '#f0f2f5',
  },
  postCard: {
    backgroundColor: '#fff',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
  },
  postAuthorBlock: {
    flex: 1,
    marginLeft: 10,
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
  },
  authorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postAuthorName: {
    fontSize: 15,
    fontWeight: '700',
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
  postDate: {
    fontSize: 12,
    color: '#65676b',
    marginTop: 1,
  },
  postContent: {
    fontSize: 15,
    color: '#050505',
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 280,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  likeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1877f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCount: {
    fontSize: 14,
    color: '#65676b',
    marginLeft: 5,
  },
  statsRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statsLink: {
    fontSize: 14,
    color: '#65676b',
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
    paddingBottom: 10,
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
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#65676b',
    textAlign: 'center',
    lineHeight: 24,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  editModalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  editPostInput: {
    minHeight: 130,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#050505',
    lineHeight: 21,
  },
  editModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  editCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  editCancelText: {
    color: '#333',
    fontWeight: '800',
  },
  editSaveBtn: {
    minWidth: 78,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: ORANGE,
    alignItems: 'center',
  },
  editSaveText: {
    color: '#fff',
    fontWeight: '900',
  },
});
