import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ROUTE_STOPS } from '../constants/transport';

const ORANGE = '#E05C04';

export default function RouteMapScreen() {
  const [reverse, setReverse] = useState(false);
  const stops = useMemo(() => reverse ? [...ROUTE_STOPS].reverse() : ROUTE_STOPS, [reverse]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Route Map</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setReverse((prev) => !prev)}>
          <Ionicons name="swap-vertical" size={22} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.routeSummary}>
          <Text style={styles.routeTitle}>
            {reverse ? 'Pinamungahan to Cebu' : 'Cebu to Pinamungahan'}
          </Text>
          <Text style={styles.routeSubtitle}>Stops, landmarks, and route order</Text>
        </View>

        <View style={styles.mapPanel}>
          {stops.map((stop, index) => (
            <View key={`${stop.name}-${index}`} style={styles.stopRow}>
              <View style={styles.timeline}>
                <View style={[styles.stopDot, index === 0 && styles.stopDotStart, index === stops.length - 1 && styles.stopDotEnd]}>
                  <Text style={styles.stopNumber}>{index + 1}</Text>
                </View>
                {index < stops.length - 1 && <View style={styles.stopLine} />}
              </View>
              <View style={styles.stopCard}>
                <Text style={styles.stopName}>{stop.name}</Text>
                <Text style={styles.stopCity}>{stop.city}</Text>
                <View style={styles.landmarkRow}>
                  <Ionicons name="location-outline" size={16} color={ORANGE} />
                  <Text style={styles.landmarkText}>{stop.landmark}</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: ORANGE,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  routeSummary: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
  },
  routeTitle: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
  },
  routeSubtitle: {
    color: 'rgba(255,255,255,0.86)',
    marginTop: 4,
    fontSize: 14,
  },
  mapPanel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stopRow: {
    flexDirection: 'row',
  },
  timeline: {
    alignItems: 'center',
    marginRight: 12,
  },
  stopDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotStart: {
    backgroundColor: ORANGE,
  },
  stopDotEnd: {
    backgroundColor: '#16a34a',
  },
  stopNumber: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
  },
  stopLine: {
    width: 3,
    flex: 1,
    minHeight: 70,
    backgroundColor: '#e5e7eb',
  },
  stopCard: {
    flex: 1,
    paddingBottom: 18,
  },
  stopName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  stopCity: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  landmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },
  landmarkText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
  },
});
