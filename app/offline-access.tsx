import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
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
import { FARE_DATA, OFFLINE_TRANSPORT_DATA, ROUTE_STOPS, SCHEDULES } from '../constants/transport';

const ORANGE = '#E05C04';
const OFFLINE_KEY = 'jegans.offlineTransportData';

export default function OfflineAccessScreen() {
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const cacheData = async () => {
    const payload = { ...OFFLINE_TRANSPORT_DATA, cachedAt: new Date().toISOString() };
    await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(payload));
    setCachedAt(payload.cachedAt);
    Alert.alert('Saved offline', 'Routes, fares, and schedules are available offline on this device.');
  };

  useEffect(() => {
    const load = async () => {
      const raw = await AsyncStorage.getItem(OFFLINE_KEY);
      if (raw) setCachedAt(JSON.parse(raw).cachedAt);
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
        <TouchableOpacity style={styles.saveBtn} onPress={cacheData}>
          <Ionicons name="download" size={22} color="#fff" />
          <Text style={styles.saveText}>Save Latest Offline Data</Text>
        </TouchableOpacity>
        <Text style={styles.cacheText}>
          {cachedAt ? `Last saved: ${new Date(cachedAt).toLocaleString()}` : 'Offline data is bundled and ready to save.'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Routes</Text>
          <Text style={styles.bodyText}>{ROUTE_STOPS.length} stops from Cebu South Bus Terminal to Pinamungajan Terminal.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedules</Text>
          {Object.values(SCHEDULES).map((schedule) => (
            <View key={schedule.label} style={styles.infoCard}>
              <Text style={styles.cardTitle}>{schedule.label}</Text>
              <Text style={styles.bodyText}>Monday: {schedule.monday.join(', ')}</Text>
              <Text style={styles.bodyText}>Tue-Sun: {schedule.other.join(', ')}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fares</Text>
          {FARE_DATA.map((fare) => (
            <View key={fare.name} style={styles.fareRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fareName}>{fare.name}</Text>
                <Text style={styles.fareCity}>{fare.city}</Text>
              </View>
              <Text style={styles.farePrice}>{fare.fromCebu}</Text>
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
  saveBtn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  cacheText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 18,
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
    marginBottom: 8,
  },
  bodyText: {
    color: '#374151',
    lineHeight: 21,
    fontSize: 14,
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
  fareName: {
    fontWeight: '800',
    color: '#111827',
  },
  fareCity: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  farePrice: {
    color: ORANGE,
    fontWeight: '900',
    fontSize: 16,
  },
});
