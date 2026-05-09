import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const ORANGE = '#E05C04';
const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.75;

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

export type AppSidebarRef = { open: () => void };

const AppSidebar = forwardRef<AppSidebarRef>((_, ref) => {
  const { userProfile } = useAuth();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const open = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const close = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      callback?.();
    });
  };

  const handleSignOut = () => {
    close(() => {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          },
        },
      ]);
    });
  };

  const openFacebookPage = () => {
    close(() => {
      Linking.openURL('https://www.facebook.com/jeganslinerinc').catch(() => {
        Alert.alert('Unable to open link', 'Please try again later.');
      });
    });
  };

  useImperativeHandle(ref, () => ({ open }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()}>
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
          pointerEvents="auto"
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => close()} />
        </Animated.View>

        <Animated.View style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}>
          {/* Orange header */}
          <View style={styles.sidebarHeader}>
            <View style={styles.avatarWrapper}>
              <AvatarCircle uri={userProfile?.photo_url} name={userProfile?.full_name} size={62} />
            </View>
            <Text style={styles.sidebarName} numberOfLines={2}>
              {userProfile?.full_name ?? 'User'}
            </Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menu}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => close(() => router.push('/report'))}
            >
              <Ionicons name="alert-circle-outline" size={26} color="#555" style={styles.menuIcon} />
              <Text style={styles.menuText}>Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => close(() => router.push('/lost-found'))}
            >
              <Ionicons name="help-circle-outline" size={26} color="#555" style={styles.menuIcon} />
              <Text style={styles.menuText}>Lost and Found</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => close(() => router.push('/terms-conditions'))}
            >
              <MaterialCommunityIcons name="gesture-tap" size={26} color="#555" style={styles.menuIcon} />
              <Text style={styles.menuText}>Terms & Conditions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={openFacebookPage}>
              <Ionicons name="call-outline" size={26} color="#555" style={styles.menuIcon} />
              <Text style={styles.menuText}>Contact Us</Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.85}>
              <Text style={styles.logoutBtnText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

AppSidebar.displayName = 'AppSidebar';

export default AppSidebar;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#fff',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  sidebarHeader: {
    backgroundColor: ORANGE,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrapper: {
    borderRadius: 35,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  sidebarName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 24,
  },
  menu: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuIcon: {
    width: 32,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
  },
  logoutBtn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
