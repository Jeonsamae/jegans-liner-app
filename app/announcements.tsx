import React, { useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SocialFeed from '../components/SocialFeed';
import AppSidebar, { AppSidebarRef } from '../components/AppSidebar';
import { useAuth } from '../contexts/AuthContext';

const ORANGE = '#E05C04';

export default function AnnouncementsScreen() {
  const { userProfile } = useAuth();
  const sidebarRef = useRef<AppSidebarRef>(null);
  const isAdmin = userProfile?.is_admin ?? false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/profile')}>
          <Ionicons name="person" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jegans Liner</Text>
        <TouchableOpacity
          style={[styles.headerIconBtn, styles.headerIconBtnDark]}
          onPress={() => router.push('/chats')}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/')}>
          <Ionicons name="home" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/friends')}>
          <Ionicons name="people" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <Ionicons name="alert-circle" size={26} color={ORANGE} />
          <View style={styles.navActiveBar} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/bus-schedule')}>
          <MaterialCommunityIcons name="bus" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => sidebarRef.current?.open()}>
          <Ionicons name="menu" size={26} color="#888" />
        </TouchableOpacity>
      </View>

      <SocialFeed
        authorFilter="admin"
        showCreatePostBar={isAdmin}
        createPostRoute="/admin-create-post"
        emptyMessage={'No admin announcements yet.\nCheck back for updates.'}
      />

      <AppSidebar ref={sidebarRef} />
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
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e4e6eb',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnDark: {
    backgroundColor: '#444',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ORANGE,
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
});
