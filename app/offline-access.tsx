import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FARE_DATA, ROUTE_STOPS, SCHEDULES, RouteKey } from '../constants/transport';
import { supabase } from '../supabase';

const ORANGE = '#E05C04';
const OFFLINE_KEY = 'jegans.offlineTransportData';

type FareOffline = {
  name: string;
  city: string;
  fromCebu: string;
  toCebu: string;
};

type StopOffline = {
  name: string;
  city: string;
  landmark: string;
};

type ScheduleOffline = Record<RouteKey, {
  label: string;
  origin: string;
  destination: string;
  monday: string[];
  other: string[];
}>;

type OfflineTransportData = {
  cachedAt: string;
  fares: FareOffline[];
  schedules: ScheduleOffline;
  stops: StopOffline[];
};

const ROUTE_KEYS = Object.keys(SCHEDULES) as RouteKey[];

function buildDefaultOfflineData(): OfflineTransportData {
  const schedules = Object.fromEntries(
    ROUTE_KEYS.map((key) => [
      key,
      {
        ...SCHEDULES[key],
        monday: [...SCHEDULES[key].monday],
        other: [...SCHEDULES[key].other],
      },
    ])
  ) as ScheduleOffline;

  return {
    cachedAt: new Date().toISOString(),
    fares: FARE_DATA.map((fare) => ({ ...fare })),
    schedules,
    stops: ROUTE_STOPS.map((stop) => ({ ...stop })),
  };
}

async function fetchLatestOfflineData(): Promise<OfflineTransportData> {
  const base = buildDefaultOfflineData();

  const [{ data: faresData, error: faresError }, { data: schedulesData, error: schedulesError }] = await Promise.all([
    supabase
      .from('bus_fares')
      .select('name, city, from_cebu, to_cebu, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('bus_trip_schedules')
      .select('route_key, monday, other'),
  ]);

  if (faresError) throw faresError;
  if (schedulesError) throw schedulesError;

  const fares = faresData?.length
    ? faresData.map((fare) => ({
        name: fare.name,
        city: fare.city,
        fromCebu: fare.from_cebu,
        toCebu: fare.to_cebu,
      }))
    : base.fares;

  const schedules = { ...base.schedules };
  schedulesData?.forEach((item) => {
    const key = item.route_key as RouteKey;
    if (!schedules[key]) return;
    schedules[key] = {
      ...schedules[key],
      monday: Array.isArray(item.monday) && item.monday.length ? item.monday : schedules[key].monday,
      other: Array.isArray(item.other) && item.other.length ? item.other : schedules[key].other,
    };
  });

  return {
    cachedAt: new Date().toISOString(),
    fares,
    schedules,
    stops: base.stops,
  };
}

export default function OfflineAccessScreen() {
  const [offlineData, setOfflineData] = useState<OfflineTransportData>(() => buildDefaultOfflineData());
  const [hasSavedCopy, setHasSavedCopy] = useState(false);
  const [saving, setSaving] = useState(false);

  const scheduleList = useMemo(
    () => ROUTE_KEYS.map((key) => offlineData.schedules[key]),
    [offlineData.schedules]
  );

  const cacheData = async () => {
    setSaving(true);
    try {
      const payload = await fetchLatestOfflineData();
      await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(payload));
      setOfflineData(payload);
      setHasSavedCopy(true);
      Alert.alert('Saved offline', 'Routes, fares, and schedules are now available offline on this device.');
    } catch (e) {
      console.error('cacheOfflineData error:', e);
      Alert.alert(
        'Could not refresh',
        hasSavedCopy
          ? 'Your previously saved offline data is still available.'
          : 'The bundled route, fare, and schedule data is still available.'
      );
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(OFFLINE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as OfflineTransportData;
        setOfflineData(parsed);
        setHasSavedCopy(true);
      } catch (e) {
        console.error('loadOfflineData error:', e);
      }
    };

    load();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Access</Text>
        <View style={styles.iconSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Ionicons name={hasSavedCopy ? 'checkmark-circle' : 'download-outline'} size={28} color="#fff" />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>{hasSavedCopy ? 'Offline data saved' : 'Offline data ready'}</Text>
            <Text style={styles.statusText}>
              {hasSavedCopy
                ? `Last saved: ${new Date(offlineData.cachedAt).toLocaleString()}`
                : 'Save a copy before traveling through low-signal areas.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={cacheData} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="download" size={22} color="#fff" />
          )}
          <Text style={styles.saveText}>{saving ? 'Saving Offline Data' : 'Save Latest Offline Data'}</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{offlineData.stops.length}</Text>
            <Text style={styles.statLabel}>Route Stops</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{offlineData.fares.length}</Text>
            <Text style={styles.statLabel}>Fare Points</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{scheduleList.length}</Text>
            <Text style={styles.statLabel}>Directions</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Routes & Landmarks</Text>
          <View style={styles.infoCard}>
            <Text style={styles.bodyText}>
              Cebu South Bus Terminal to Pinamungajan Terminal with saved stop order and landmark notes.
            </Text>
          </View>
          {offlineData.stops.map((stop, index) => (
            <View key={`${stop.name}-${index}`} style={styles.stopRow}>
              <View style={[styles.stopBadge, index === 0 && styles.startBadge, index === offlineData.stops.length - 1 && styles.endBadge]}>
                <Text style={styles.stopBadgeText}>{index + 1}</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopCity}>{stop.city}</Text>
                <Text style={styles.stopLandmark}>{stop.landmark}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedules</Text>
          {scheduleList.map((schedule) => (
            <View key={schedule.label} style={styles.infoCard}>
              <Text style={styles.cardTitle}>{schedule.label}</Text>
              <Text style={styles.routeLine}>{schedule.origin} to {schedule.destination}</Text>
              <Text style={styles.bodyText}>Monday: {schedule.monday.join(', ')}</Text>
              <Text style={styles.bodyText}>Tue-Sun: {schedule.other.join(', ')}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fares</Text>
          {offlineData.fares.map((fare) => (
            <View key={fare.name} style={styles.fareRow}>
              <View style={styles.fareInfo}>
                <Text style={styles.fareName}>{fare.name}</Text>
                <Text style={styles.fareCity}>{fare.city}</Text>
              </View>
              <View style={styles.farePrices}>
                <View style={styles.farePriceRow}>
                  <Text style={styles.fareLabel}>Cebu</Text>
                  <Text style={styles.farePrice}>{fare.fromCebu}</Text>
                </View>
                <View style={styles.farePriceRow}>
                  <Text style={styles.fareLabel}>Pinamungahan</Text>
                  <Text style={styles.farePrice}>{fare.toCebu}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e4e6eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ORANGE,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  statusText: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  saveBtnDisabled: {
    opacity: 0.72,
  },
  saveText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNumber: {
    color: ORANGE,
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  cardTitle: {
    color: ORANGE,
    fontWeight: '900',
    marginBottom: 4,
  },
  routeLine: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  bodyText: {
    color: '#374151',
    lineHeight: 21,
    fontSize: 14,
  },
  stopRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  stopBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  startBadge: {
    backgroundColor: ORANGE,
  },
  endBadge: {
    backgroundColor: '#16a34a',
  },
  stopBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  stopCity: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  stopLandmark: {
    color: '#374151',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  fareInfo: {
    flex: 1,
    paddingRight: 10,
  },
  fareName: {
    fontWeight: '900',
    color: '#111827',
  },
  fareCity: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  farePrices: {
    minWidth: 126,
    gap: 5,
  },
  farePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  fareLabel: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '800',
  },
  farePrice: {
    color: ORANGE,
    fontWeight: '900',
    fontSize: 14,
  },
});
