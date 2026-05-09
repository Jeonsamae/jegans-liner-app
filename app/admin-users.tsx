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
import { supabase } from '../supabase';

const ORANGE = '#E05C04';

type UserRow = {
  id: string;
  full_name: string;
  photo_url: string | null;
  email: string;
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url, email')
        .eq('is_admin', false)
        .order('full_name');
      setUsers(data ?? []);
    } catch (e) {
      console.error('fetchUsers error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleMessage = (userId: string) => {
    router.push({ pathname: '/chat-room', params: { userId } } as any);
  };

  const handleProfile = (userId: string) => {
    router.push({ pathname: '/profile', params: { userId } } as any);
  };

  const renderUser = ({ item }: { item: UserRow }) => (
    <View style={styles.userCard}>
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>
            {item.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
      )}
      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>{item.full_name}</Text>
        <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.messageBtn} onPress={() => handleMessage(item.id)}>
            <Ionicons name="chatbubble-outline" size={14} color="#fff" />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => handleProfile(item.id)}>
            <Ionicons name="person-outline" size={14} color="#333" />
            <Text style={styles.profileBtnText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Admin Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin')}>
          <Ionicons name="home" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/admin-create-post')}>
          <Ionicons name="megaphone" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="people" size={26} color={ORANGE} />
          <View style={styles.navActiveBar} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.title}>All Users</Text>
        {!loading && (
          <Text style={styles.subtitle}>{users.length} member{users.length !== 1 ? 's' : ''}</Text>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchIconCircle}>
          <Ionicons name="search" size={20} color="#333" />
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
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
                {search ? 'No users match your search.' : 'No users found.'}
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
  topNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  navItemActive: {},
  navActiveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: ORANGE,
    borderRadius: 2,
  },
  titleRow: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  avatarFallback: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#555',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  userEmail: {
    fontSize: 13,
    color: '#888',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  messageBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e4e6eb',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  profileBtnText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
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
