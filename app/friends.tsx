import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const ORANGE = '#E05C04';

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

type UserRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  email?: string;
  is_admin?: boolean;
  friendship_status: FriendshipStatus;
  friendship_id: string | null;
};

export default function FriendsScreen() {
  const { session, userProfile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const fetchUsers = useCallback(async () => {
    if (!session?.user) return;
    try {
      const [{ data: profiles }, { data: friendships }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, photo_url, email, is_admin')
          .neq('id', session.user.id)
          .order('full_name'),
        supabase
          .from('friendships')
          .select('id, requester_id, addressee_id, status')
          .or(`requester_id.eq.${session.user.id},addressee_id.eq.${session.user.id}`),
      ]);

      if (!profiles) { setUsers([]); return; }

      // Build lookup: other user id → friendship info
      const fMap: Record<string, { id: string; status: string; iAmRequester: boolean }> = {};
      friendships?.forEach((f) => {
        const other = f.requester_id === session.user.id ? f.addressee_id : f.requester_id;
        fMap[other] = { id: f.id, status: f.status, iAmRequester: f.requester_id === session.user.id };
      });

      const visibleProfiles = profiles.filter((p) => !p.is_admin);

      const enriched: UserRow[] = visibleProfiles.map((p) => {
        const f = fMap[p.id];
        let friendship_status: FriendshipStatus = 'none';
        let friendship_id: string | null = null;
        if (f) {
          friendship_id = f.id;
          if (f.status === 'accepted') {
            friendship_status = 'accepted';
          } else if (f.status === 'pending') {
            friendship_status = f.iAmRequester ? 'pending_sent' : 'pending_received';
          }
        }
        return { ...p, friendship_status, friendship_id };
      });

      setUsers(enriched);
    } catch (e) {
      console.error('fetchUsers error:', e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const setUserStatus = (
    userId: string,
    friendship_status: FriendshipStatus,
    friendship_id: string | null
  ) => {
    setUsers((prev) =>
      prev.map((u) => u.id === userId ? { ...u, friendship_status, friendship_id } : u)
    );
  };

  const handleAddFriend = async (userId: string) => {
    if (!session?.user) return;
    setBusy((p) => ({ ...p, [userId]: true }));
    const { data, error } = await supabase
      .from('friendships')
      .insert({ requester_id: session.user.id, addressee_id: userId, status: 'pending' })
      .select('id')
      .single();
    if (!error && data) setUserStatus(userId, 'pending_sent', data.id);
    setBusy((p) => ({ ...p, [userId]: false }));
  };

  const handleCancel = async (userId: string, friendshipId: string) => {
    setBusy((p) => ({ ...p, [userId]: true }));
    await supabase.from('friendships').delete().eq('id', friendshipId);
    setUserStatus(userId, 'none', null);
    setBusy((p) => ({ ...p, [userId]: false }));
  };

  const handleAccept = async (userId: string, friendshipId: string) => {
    setBusy((p) => ({ ...p, [userId]: true }));
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    setUserStatus(userId, 'accepted', friendshipId);
    setBusy((p) => ({ ...p, [userId]: false }));
  };

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAdminChat = (userId: string) => {
    router.push({ pathname: '/chat-room', params: { userId } } as any);
  };

  const handleAdminProfile = (userId: string) => {
    router.push({ pathname: '/profile', params: { userId } } as any);
  };

  const renderUser = ({ item }: { item: UserRow }) => {
    const isLoading = busy[item.id];

    return (
      <View style={styles.userCard}>
        {/* Avatar */}
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>
              {item.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}

        {/* Name + Button */}
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{item.full_name}</Text>
          {userProfile?.is_admin && !!item.email && (
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
          )}

          {userProfile?.is_admin ? (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.addBtn, styles.adminActionBtn]}
                onPress={() => handleAdminProfile(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="person-outline" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Go to Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtn, styles.adminActionBtn]}
                onPress={() => handleAdminChat(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#333" />
                <Text style={styles.cancelBtnText}>Chat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>

          {item.friendship_status === 'none' && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => handleAddFriend(item.id)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.addBtnText}>Add Friend</Text>}
            </TouchableOpacity>
          )}

          {item.friendship_status === 'pending_sent' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => handleCancel(item.id, item.friendship_id!)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading
                ? <ActivityIndicator color="#555" size="small" />
                : <Text style={styles.cancelBtnText}>Cancel</Text>}
            </TouchableOpacity>
          )}

          {item.friendship_status === 'pending_received' && (
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.addBtn, { flex: 1 }]}
                onPress={() => handleAccept(item.id, item.friendship_id!)}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.addBtnText}>Accept</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1 }]}
                onPress={() => handleCancel(item.id, item.friendship_id!)}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.friendship_status === 'accepted' && (
            <TouchableOpacity
              style={styles.friendsBtn}
              onPress={() => handleCancel(item.id, item.friendship_id!)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading
                ? <ActivityIndicator color="#555" size="small" />
                : <Text style={styles.friendsBtnText}>✓ Friends</Text>}
            </TouchableOpacity>
          )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>{userProfile?.is_admin ? 'All Users' : 'Friends'}</Text>
      </View>
      <View style={styles.titleDivider} />

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchIconCircle}>
          <Ionicons name="search" size={20} color="#333" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder={userProfile?.is_admin ? 'Search users' : 'Search'}
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {search ? 'No users match your search.' : 'No other users yet.'}
              </Text>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111',
  },
  titleDivider: {
    height: 1,
    backgroundColor: '#e4e6eb',
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 10,
  },
  searchIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f0f2f5',
    borderRadius: 22,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#111',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  avatarFallback: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#555',
  },
  userInfo: {
    flex: 1,
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  userEmail: {
    fontSize: 13,
    color: '#777',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adminActionBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  addBtn: {
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
  friendsBtn: {
    backgroundColor: '#e4e6eb',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  friendsBtnText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyBox: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#65676b',
    textAlign: 'center',
  },
});
