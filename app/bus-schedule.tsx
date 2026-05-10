import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabase';
import { SCHEDULES as DEFAULT_SCHEDULES, RouteKey } from '../constants/transport';

const ORANGE = '#E05C04';
const SIDEBAR_WIDTH = Dimensions.get('window').width * 0.75;
const BUS_PROFILE_BUCKET = 'bus-profile';

type FareItem = {
  id?: string;
  name: string;
  city: string;
  fromCebu: string;
  toCebu: string;
  sort_order: number;
};

type ScheduleItem = {
  routeKey: RouteKey;
  label: string;
  monday: string[];
  other: string[];
};

type EditingSchedule = ScheduleItem & {
  mondayText: string;
  otherText: string;
};

const ROUTE_KEYS: RouteKey[] = ['cebu-to-pinamungajan', 'pinamungajan-to-cebu'];

const DEFAULT_TRIP_SCHEDULES: ScheduleItem[] = ROUTE_KEYS.map((routeKey) => ({
  routeKey,
  label: DEFAULT_SCHEDULES[routeKey].label,
  monday: [...DEFAULT_SCHEDULES[routeKey].monday],
  other: [...DEFAULT_SCHEDULES[routeKey].other],
}));

const TIME_PATTERN = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;

function formatScheduleText(times: string[]) {
  return times.join('\n');
}

function normalizeScheduleText(value: string) {
  return value
    .split(/[\n,]+/)
    .map((time) => time.trim().replace(/\s+/g, ' ').toUpperCase())
    .filter(Boolean);
}

function hasInvalidTimes(times: string[]) {
  return times.some((time) => !TIME_PATTERN.test(time));
}

const DEFAULT_FARE_DATA: FareItem[] = [
  { name: 'Cebu Terminal', city: 'Cebu City', fromCebu: 'PHP 0', toCebu: 'PHP 150', sort_order: 1 },
  { name: 'Talisay City', city: 'Talisay City', fromCebu: 'PHP 20', toCebu: 'PHP 140', sort_order: 2 },
  { name: 'Minglanilla', city: 'Municipality of Minglanilla', fromCebu: 'PHP 30', toCebu: 'PHP 130', sort_order: 3 },
  { name: 'Naga', city: 'City of Naga', fromCebu: 'PHP 40', toCebu: 'PHP 120', sort_order: 4 },
  { name: 'Balirong', city: 'City of Naga', fromCebu: 'PHP 50', toCebu: 'PHP 110', sort_order: 5 },
  { name: 'Uling', city: 'City of Naga', fromCebu: 'PHP 60', toCebu: 'PHP 100', sort_order: 6 },
  { name: 'Lutopan', city: 'Toledo City', fromCebu: 'PHP 70', toCebu: 'PHP 90', sort_order: 7 },
  { name: 'Juan Climaco', city: 'Toledo City', fromCebu: 'PHP 80', toCebu: 'PHP 80', sort_order: 8 },
  { name: 'Ilihan', city: 'Toledo City', fromCebu: 'PHP 90', toCebu: 'PHP 70', sort_order: 9 },
  { name: 'Sangi', city: 'Toledo City', fromCebu: 'PHP 100', toCebu: 'PHP 60', sort_order: 10 },
  { name: 'Luray', city: 'Pinamungahan', fromCebu: 'PHP 110', toCebu: 'PHP 50', sort_order: 11 },
  { name: 'Bato', city: 'Pinamungahan', fromCebu: 'PHP 120', toCebu: 'PHP 40', sort_order: 12 },
  { name: 'Tajao', city: 'Pinamungahan', fromCebu: 'PHP 130', toCebu: 'PHP 30', sort_order: 13 },
  { name: 'Cabangon', city: 'Pinamungahan', fromCebu: 'PHP 140', toCebu: 'PHP 20', sort_order: 14 },
  { name: 'Pinamungajan Terminal', city: 'Pinamungahan', fromCebu: 'PHP 150', toCebu: 'PHP 0', sort_order: 15 },
];

const FARE_DATA = [
  { name: 'Cebu Terminal',        city: 'Cebu City',                    fromCebu: '₱0',   toCebu: '₱150' },
  { name: 'Talisay City',         city: 'Talisay City',                 fromCebu: '₱20',  toCebu: '₱140' },
  { name: 'Minglanilla',          city: 'Municipality of Minglanilla',  fromCebu: '₱30',  toCebu: '₱130' },
  { name: 'Naga',                 city: 'City of Naga',                 fromCebu: '₱40',  toCebu: '₱120' },
  { name: 'Balirong',             city: 'City of Naga',                 fromCebu: '₱50',  toCebu: '₱110' },
  { name: 'Uling',                city: 'City of Naga',                 fromCebu: '₱60',  toCebu: '₱100' },
  { name: 'Lutopan',              city: 'Toledo City',                  fromCebu: '₱70',  toCebu: '₱90'  },
  { name: 'Juan Climaco',         city: 'Toledo City',                  fromCebu: '₱80',  toCebu: '₱80'  },
  { name: 'Ilihan',               city: 'Toledo City',                  fromCebu: '₱90',  toCebu: '₱70'  },
  { name: 'Sangi',                city: 'Toledo City',                  fromCebu: '₱100', toCebu: '₱60'  },
  { name: 'Luray',                city: 'Pinamungahan',                 fromCebu: '₱110', toCebu: '₱50'  },
  { name: 'Bato',                 city: 'Pinamungahan',                 fromCebu: '₱120', toCebu: '₱40'  },
  { name: 'Tajao',                city: 'Pinamungahan',                 fromCebu: '₱130', toCebu: '₱30'  },
  { name: 'Cabangon',             city: 'Pinamungahan',                 fromCebu: '₱140', toCebu: '₱20'  },
  { name: 'Pinamungajan Terminal',city: 'Pinamungahan',                 fromCebu: '₱150', toCebu: '₱0'   },
];

export default function BusScheduleScreen() {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.is_admin ?? false;

  // ── Sidebar state ────────────────────────────────────────────────────────────
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const closeSidebar = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: SIDEBAR_WIDTH, duration: 250, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => { setSidebarVisible(false); callback?.(); });
  };

  const handleSignOut = () => {
    closeSidebar(() => {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => { await supabase.auth.signOut(); router.replace('/login'); },
        },
      ]);
    });
  };

  const openFacebookPage = () => {
    closeSidebar(() => {
      Linking.openURL('https://www.facebook.com/jeganslinerinc').catch(() => {
        Alert.alert('Unable to open link', 'Please try again later.');
      });
    });
  };

  // ── Bus profile images carousel ──────────────────────────────────────────────
  const [busImages, setBusImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [fareData, setFareData] = useState<FareItem[]>(
    DEFAULT_FARE_DATA.length
      ? DEFAULT_FARE_DATA
      : FARE_DATA.map((fare, index) => ({ ...fare, sort_order: index + 1 }))
  );
  const [editingFare, setEditingFare] = useState<FareItem | null>(null);
  const [savingFare, setSavingFare] = useState(false);
  const [tripSchedules, setTripSchedules] = useState<ScheduleItem[]>(DEFAULT_TRIP_SCHEDULES);
  const [editingSchedule, setEditingSchedule] = useState<EditingSchedule | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const fetchImages = useCallback(async () => {
    try {
      const { data: files, error } = await supabase.storage
        .from(BUS_PROFILE_BUCKET)
        .list('', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

      if (error || !files) return;

      const urls = files
        .filter((f) => f.name !== '.emptyFolderPlaceholder' && f.name)
        .map((f) => supabase.storage.from(BUS_PROFILE_BUCKET).getPublicUrl(f.name).data.publicUrl);

      setBusImages(urls);
      setCurrentIndex((prev) => Math.min(prev, Math.max(urls.length - 1, 0)));
    } catch (e) {
      console.error('fetchBusImages error:', e);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const fetchFares = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bus_fares')
        .select('id, name, city, from_cebu, to_cebu, sort_order')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      if (!data?.length) return;

      const dbFareMap = new Map(
        data.map((fare) => [
          fare.sort_order,
          {
            id: fare.id,
            name: fare.name,
            city: fare.city,
            fromCebu: fare.from_cebu,
            toCebu: fare.to_cebu,
            sort_order: fare.sort_order,
          },
        ])
      );

      setFareData(DEFAULT_FARE_DATA.map((fare) => dbFareMap.get(fare.sort_order) ?? fare));
    } catch (e) {
      console.error('fetchFares error:', e);
    }
  }, []);

  useEffect(() => {
    fetchFares();
  }, [fetchFares]);

  const fetchTripSchedules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bus_trip_schedules')
        .select('route_key, monday, other');

      if (error) throw error;
      if (!data?.length) return;

      setTripSchedules((prev) => prev.map((schedule) => {
        const dbSchedule = data.find((item) => item.route_key === schedule.routeKey);
        if (!dbSchedule) return schedule;
        return {
          ...schedule,
          monday: Array.isArray(dbSchedule.monday) && dbSchedule.monday.length ? dbSchedule.monday : schedule.monday,
          other: Array.isArray(dbSchedule.other) && dbSchedule.other.length ? dbSchedule.other : schedule.other,
        };
      }));
    } catch (e) {
      console.error('fetchTripSchedules error:', e);
    }
  }, []);

  useEffect(() => {
    fetchTripSchedules();
  }, [fetchTripSchedules]);

  const uploadBusImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.85,
    });

    if (result.canceled || result.assets.length === 0) return;

    setUploadingImages(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      for (const asset of result.assets) {
        const fileNameExt = asset.fileName?.split('.').pop()?.toLowerCase();
        const uriExt = asset.uri.split('.').pop()?.toLowerCase().split('?')[0];
        const mimeExt = asset.mimeType?.split('/')[1]?.toLowerCase();
        const ext = (fileNameExt || mimeExt || uriExt || 'jpg').replace('jpeg', 'jpg');
        const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
        const fileName = `bus_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        const formData = new FormData();
        formData.append('file', { uri: asset.uri, type: mimeType, name: fileName } as any);

        const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUS_PROFILE_BUCKET}/${fileName}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: SUPABASE_ANON_KEY,
            'x-upsert': 'true',
          },
          body: formData,
        });

        if (!response.ok) throw new Error(await response.text());
      }

      await fetchImages();
      Alert.alert('Uploaded', 'Bus profile images were added.');
    } catch (e) {
      console.error('uploadBusImages error:', e);
      Alert.alert('Upload failed', 'Please check that the bus-profile bucket and policies are ready.');
    } finally {
      setUploadingImages(false);
    }
  };

  const saveFare = async () => {
    if (!editingFare) return;
    if (!editingFare.name.trim() || !editingFare.city.trim() || !editingFare.fromCebu.trim() || !editingFare.toCebu.trim()) {
      Alert.alert('Missing details', 'Please complete all fare fields.');
      return;
    }

    setSavingFare(true);
    try {
      const payload = {
        name: editingFare.name.trim(),
        city: editingFare.city.trim(),
        from_cebu: editingFare.fromCebu.trim(),
        to_cebu: editingFare.toCebu.trim(),
        sort_order: editingFare.sort_order,
      };

      const query = editingFare.id
        ? supabase.from('bus_fares').update(payload).eq('id', editingFare.id).select('id').single()
        : supabase.from('bus_fares').upsert(payload, { onConflict: 'sort_order' }).select('id').single();

      const { data, error } = await query;
      if (error) throw error;

      setFareData((prev) => prev.map((fare) =>
        fare.sort_order === editingFare.sort_order
          ? { ...editingFare, id: editingFare.id ?? data.id }
          : fare
      ));
      setEditingFare(null);
    } catch (e) {
      console.error('saveFare error:', e);
      Alert.alert('Save failed', 'Please check that the bus_fares table and policies are ready.');
    } finally {
      setSavingFare(false);
    }
  };

  const openScheduleEditor = (schedule: ScheduleItem) => {
    setEditingSchedule({
      ...schedule,
      mondayText: formatScheduleText(schedule.monday),
      otherText: formatScheduleText(schedule.other),
    });
  };

  const saveTripSchedule = async () => {
    if (!editingSchedule) return;

    const monday = normalizeScheduleText(editingSchedule.mondayText);
    const other = normalizeScheduleText(editingSchedule.otherText);

    if (!monday.length || !other.length) {
      Alert.alert('Missing trips', 'Please add at least one trip time for Monday and Tue-Sun.');
      return;
    }

    if (hasInvalidTimes([...monday, ...other])) {
      Alert.alert('Invalid time format', 'Use times like 7:25 AM or 3:00 PM, one per line.');
      return;
    }

    setSavingSchedule(true);
    try {
      const payload = {
        route_key: editingSchedule.routeKey,
        label: editingSchedule.label,
        monday,
        other,
      };

      const { error } = await supabase
        .from('bus_trip_schedules')
        .upsert(payload, { onConflict: 'route_key' });

      if (error) throw error;

      setTripSchedules((prev) => prev.map((schedule) =>
        schedule.routeKey === editingSchedule.routeKey
          ? { ...schedule, monday, other }
          : schedule
      ));
      setEditingSchedule(null);
      Alert.alert('Schedule updated', `${editingSchedule.label} trips were saved.`);
    } catch (e) {
      console.error('saveTripSchedule error:', e);
      Alert.alert('Save failed', 'Please check that the bus_trip_schedules table and policies are ready.');
    } finally {
      setSavingSchedule(false);
    }
  };

  // ── Sidebar component ─────────────────────────────────────────────────────────
  const Sidebar = () => (
    <Modal visible={sidebarVisible} transparent animationType="none" onRequestClose={() => closeSidebar()}>
      <View style={styles.sidebarOverlay}>
        <Animated.View style={[styles.sidebarBackdrop, { opacity: backdropAnim }]} pointerEvents="auto">
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSidebar()} />
        </Animated.View>
        <Animated.View style={[styles.sidebarPanel, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarAvatarWrapper}>
              {userProfile?.photo_url ? (
                <Image source={{ uri: userProfile.photo_url }} style={{ width: 62, height: 62, borderRadius: 31 }} />
              ) : (
                <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>
                    {userProfile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.sidebarName} numberOfLines={2}>{userProfile?.full_name ?? 'User'}</Text>
          </View>
          <View style={styles.sidebarMenu}>
            <TouchableOpacity
              style={styles.sidebarItem}
              activeOpacity={0.7}
              onPress={() => closeSidebar(() => router.push('/report'))}
            >
              <Ionicons name="alert-circle-outline" size={26} color="#555" style={styles.sidebarIcon} />
              <Text style={styles.sidebarItemText}>Report</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sidebarItem}
              activeOpacity={0.7}
              onPress={() => closeSidebar(() => router.push('/lost-found'))}
            >
              <Ionicons name="help-circle-outline" size={26} color="#555" style={styles.sidebarIcon} />
              <Text style={styles.sidebarItemText}>Lost and Found</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sidebarItem}
              activeOpacity={0.7}
              onPress={() => closeSidebar(() => router.push('/terms-conditions'))}
            >
              <MaterialCommunityIcons name="gesture-tap" size={26} color="#555" style={styles.sidebarIcon} />
              <Text style={styles.sidebarItemText}>Terms & Conditions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sidebarItem} activeOpacity={0.7} onPress={openFacebookPage}>
              <Ionicons name="call-outline" size={26} color="#555" style={styles.sidebarIcon} />
              <Text style={styles.sidebarItemText}>Contact Us</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sidebarFooter}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.85}>
              <Text style={styles.logoutBtnText}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
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

      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.replace('/')}>
          <Ionicons name="home" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/friends')}>
          <Ionicons name="people" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/announcements')}>
          <Ionicons name="alert-circle" size={26} color="#888" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <MaterialCommunityIcons name="bus" size={26} color={ORANGE} />
          <View style={styles.navActiveBar} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={openSidebar}>
          <Ionicons name="menu" size={26} color="#888" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Bus Trip Schedule */}
        <Text style={styles.sectionTitle}>Bus Trip Schedule</Text>

        <TouchableOpacity
          style={styles.routeBtn}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/bus-trips', params: { route: 'cebu-to-pinamungajan' } })}
        >
          <View style={styles.routeBtnCircle}>
            <Ionicons name="location" size={28} color="#fff" />
          </View>
          <Text style={styles.routeBtnText}>CEBU TO PINAMUNGAHAN</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.routeBtn}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: '/bus-trips', params: { route: 'pinamungajan-to-cebu' } })}
        >
          <View style={styles.routeBtnCircle}>
            <Ionicons name="location" size={28} color="#fff" />
          </View>
          <Text style={styles.routeBtnText}>PINAMUNGAHAN TO CEBU</Text>
        </TouchableOpacity>

        {isAdmin && (
          <View style={styles.adminSchedulePanel}>
            <Text style={styles.adminScheduleTitle}>Manage Daily Trip Schedules</Text>
            {tripSchedules.map((schedule) => (
              <View key={schedule.routeKey} style={styles.scheduleManageCard}>
                <View style={styles.scheduleManageInfo}>
                  <Text style={styles.scheduleManageLabel}>{schedule.label}</Text>
                  <Text style={styles.scheduleManageSummary}>
                    Monday: {schedule.monday.length} trips / Tue-Sun: {schedule.other.length} trips
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.scheduleEditBtn}
                  onPress={() => openScheduleEditor(schedule)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={16} color="#fff" />
                  <Text style={styles.scheduleEditText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.featureGrid}>
          <TouchableOpacity style={styles.featureBtn} onPress={() => router.push('/route-map')}>
            <Ionicons name="map" size={24} color={ORANGE} />
            <Text style={styles.featureText}>Route Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.featureBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications" size={24} color={ORANGE} />
            <Text style={styles.featureText}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.featureBtn} onPress={() => router.push('/offline-access')}>
            <Ionicons name="download" size={24} color={ORANGE} />
            <Text style={styles.featureText}>Offline</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Bus Profile */}
        <Text style={styles.sectionTitle}>Bus Profile</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminUploadBtn}
            onPress={uploadBusImages}
            disabled={uploadingImages}
            activeOpacity={0.85}
          >
            {uploadingImages ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                <Text style={styles.adminUploadText}>Upload Bus Images</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.carouselCard}>
          {loadingImages ? (
            <View style={styles.carouselPlaceholder}>
              <ActivityIndicator size="large" color={ORANGE} />
            </View>
          ) : busImages.length === 0 ? (
            <View style={styles.carouselPlaceholder}>
              <MaterialCommunityIcons name="bus-side" size={80} color="#ccc" />
              <Text style={styles.noImageText}>No images available</Text>
            </View>
          ) : (
            <>
              <Image
                source={{ uri: busImages[currentIndex] }}
                style={styles.carouselImage}
                resizeMode="cover"
              />

              {/* Left arrow */}
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.carouselArrow, styles.carouselArrowLeft]}
                  onPress={() => setCurrentIndex((prev) => prev - 1)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={22} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Right arrow */}
              {currentIndex < busImages.length - 1 && (
                <TouchableOpacity
                  style={[styles.carouselArrow, styles.carouselArrowRight]}
                  onPress={() => setCurrentIndex((prev) => prev + 1)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-forward" size={22} color="#fff" />
                </TouchableOpacity>
              )}

              {/* Dots */}
              {busImages.length > 1 && (
                <View style={styles.dotsRow}>
                  {busImages.map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.dot, i === currentIndex && styles.dotActive]}
                      onPress={() => setCurrentIndex(i)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Bus Fare */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Bus Fare</Text>

        {fareData.map((item, i) => (
          <View key={i} style={styles.fareCard}>
            <Ionicons name="location" size={38} color="#cc2200" />
            <View style={styles.fareDestInfo}>
              <Text style={styles.fareDestName}>{item.name}</Text>
              <Text style={styles.fareDestCity}>{item.city}</Text>
              {isAdmin && (
                <TouchableOpacity style={styles.editFareBtn} onPress={() => setEditingFare(item)}>
                  <Ionicons name="create-outline" size={14} color={ORANGE} />
                  <Text style={styles.editFareText}>Edit fare</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.farePriceBox}>
              <View style={styles.farePriceRow}>
                <Text style={styles.farePriceLabel}>Cebu to{'\n'}Pinamungajan</Text>
                <Text style={styles.farePriceAmount}>{item.fromCebu}</Text>
              </View>
              <View style={styles.fareDivider} />
              <View style={styles.farePriceRow}>
                <Text style={styles.farePriceLabel}>Pinamungajan{'\n'}to Cebu</Text>
                <Text style={styles.farePriceAmount}>{item.toCebu}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={!!editingFare} transparent animationType="fade" onRequestClose={() => setEditingFare(null)}>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Edit Bus Fare</Text>
            <TextInput
              style={styles.editInput}
              placeholder="Stop name"
              value={editingFare?.name ?? ''}
              onChangeText={(text) => setEditingFare((prev) => prev ? { ...prev, name: text } : prev)}
            />
            <TextInput
              style={styles.editInput}
              placeholder="City"
              value={editingFare?.city ?? ''}
              onChangeText={(text) => setEditingFare((prev) => prev ? { ...prev, city: text } : prev)}
            />
            <TextInput
              style={styles.editInput}
              placeholder="Cebu to Pinamungajan fare"
              value={editingFare?.fromCebu ?? ''}
              onChangeText={(text) => setEditingFare((prev) => prev ? { ...prev, fromCebu: text } : prev)}
            />
            <TextInput
              style={styles.editInput}
              placeholder="Pinamungajan to Cebu fare"
              value={editingFare?.toCebu ?? ''}
              onChangeText={(text) => setEditingFare((prev) => prev ? { ...prev, toCebu: text } : prev)}
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditingFare(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, savingFare && { opacity: 0.6 }]}
                onPress={saveFare}
                disabled={savingFare}
              >
                {savingFare ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!editingSchedule} transparent animationType="fade" onRequestClose={() => setEditingSchedule(null)}>
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalCard}>
            <Text style={styles.editModalTitle}>Edit Daily Trips</Text>
            <Text style={styles.editModalSubtitle}>{editingSchedule?.label}</Text>
            <Text style={styles.editInputLabel}>Monday trips</Text>
            <TextInput
              style={[styles.editInput, styles.scheduleTextInput]}
              placeholder="7:25 AM"
              value={editingSchedule?.mondayText ?? ''}
              onChangeText={(text) => setEditingSchedule((prev) => prev ? { ...prev, mondayText: text } : prev)}
              multiline
              textAlignVertical="top"
              autoCapitalize="characters"
            />
            <Text style={styles.editInputLabel}>Tuesday to Sunday trips</Text>
            <TextInput
              style={[styles.editInput, styles.scheduleTextInput]}
              placeholder="7:45 AM"
              value={editingSchedule?.otherText ?? ''}
              onChangeText={(text) => setEditingSchedule((prev) => prev ? { ...prev, otherText: text } : prev)}
              multiline
              textAlignVertical="top"
              autoCapitalize="characters"
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.editCancelBtn} onPress={() => setEditingSchedule(null)}>
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editSaveBtn, savingSchedule && { opacity: 0.6 }]}
                onPress={saveTripSchedule}
                disabled={savingSchedule}
              >
                {savingSchedule ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.editSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Sidebar />
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
  headerIconBtnDark: { backgroundColor: '#444' },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: ORANGE,
    letterSpacing: 0.2,
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
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  routeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE,
    borderRadius: 40,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  routeBtnCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBtnText: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    paddingRight: 16,
  },
  featureGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  featureBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    gap: 6,
  },
  featureText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '800',
  },
  adminSchedulePanel: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 10,
  },
  adminScheduleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#222',
  },
  scheduleManageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  scheduleManageInfo: {
    flex: 1,
  },
  scheduleManageLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#222',
  },
  scheduleManageSummary: {
    fontSize: 11,
    color: '#777',
    marginTop: 3,
  },
  scheduleEditBtn: {
    minWidth: 76,
    borderRadius: 8,
    backgroundColor: ORANGE,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  scheduleEditText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  divider: { height: 1, backgroundColor: '#ddd', marginVertical: 24 },
  adminUploadBtn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  adminUploadText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  // ── Carousel ──────────────────────────────────────────────────────────────────
  carouselCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#222',
    minHeight: 340,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  carouselPlaceholder: {
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  noImageText: { color: '#999', fontSize: 14 },
  carouselImage: { width: '100%', height: 360 },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselArrowLeft: { left: 10 },
  carouselArrowRight: { right: 10 },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: { backgroundColor: '#fff', width: 20, borderRadius: 4 },
  // ── Bus Fare ──────────────────────────────────────────────────────────────────
  fareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    paddingLeft: 10,
    paddingVertical: 6,
  },
  fareDestInfo: {
    flex: 1,
    marginLeft: 8,
    paddingRight: 6,
  },
  fareDestName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
  },
  fareDestCity: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  editFareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  editFareText: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: '800',
  },
  farePriceBox: {
    backgroundColor: ORANGE,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    minWidth: 155,
  },
  farePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  farePriceLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    lineHeight: 13,
    flex: 1,
  },
  farePriceAmount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginLeft: 4,
  },
  fareDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  editModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 14,
  },
  editModalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#777',
    marginTop: -8,
    marginBottom: 12,
  },
  editInputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#444',
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111',
    marginBottom: 10,
  },
  scheduleTextInput: {
    minHeight: 118,
    maxHeight: 150,
    lineHeight: 20,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  editCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  editCancelText: {
    color: '#333',
    fontWeight: '700',
  },
  editSaveBtn: {
    minWidth: 76,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: ORANGE,
    alignItems: 'center',
  },
  editSaveText: {
    color: '#fff',
    fontWeight: '800',
  },
  // ── Sidebar ───────────────────────────────────────────────────────────────────
  sidebarOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  sidebarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sidebarPanel: {
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
  sidebarAvatarWrapper: {
    borderRadius: 35,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
  },
  sidebarName: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff', lineHeight: 24 },
  sidebarMenu: { paddingTop: 8 },
  sidebarItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  sidebarIcon: { width: 32 },
  sidebarItemText: { fontSize: 16, color: '#333', marginLeft: 12 },
  sidebarFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, paddingBottom: 36 },
  logoutBtn: { backgroundColor: ORANGE, borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1.2 },
});
