import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

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
  const { session } = useAuth();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

      const [{ count: likesCount }, { count: commentsCount }, { count: sharesCount }] =
        await Promise.all([
          supabase.from('likes').select('id', { count: 'exact', head: true }).eq('post_id', postId),
          supabase.from('comments').select('id', { count: 'exact', head: true }).eq('post_id', postId),
          supabase.from('shares').select('id', { count: 'exact', head: true }).eq('post_id', postId),
        ]);

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      setPost({
        ...data,
        profiles: profile as ProfileInfo,
        likes_count: likesCount ?? 0,
        comments_count: commentsCount ?? 0,
        shares_count: sharesCount ?? 0,
      });
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
        <ScrollView showsVerticalScrollIndicator={false}>
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
              <View style={styles.likeCircle}>
                <Ionicons name="thumbs-up" size={13} color="#fff" />
              </View>
              <Text style={styles.statsText}>{post.likes_count}</Text>
              <Text style={styles.statsRight}>
                {post.comments_count} Comments   {post.shares_count} Shares
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
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
});
