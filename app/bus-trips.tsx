import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const ORANGE = '#E05C04';

// ─── Schedule Data ────────────────────────────────────────────────────────────

const SCHEDULES = {
  'cebu-to-pinamungajan': {
    label: 'CEBU TO PINAMUNGAHAN',
    monday: [
      '7:25 AM', '7:45 AM', '8:05 AM', '8:25 AM', '8:45 AM', '9:05 AM',
      '2:45 PM', '3:30 PM', '4:15 PM', '5:00 PM', '5:45 PM', '6:30 PM',
    ],
    other: [
      '7:45 AM', '8:30 AM', '9:15 AM', '10:00 AM', '10:45 AM', '11:30 AM',
      '2:45 PM', '3:30 PM', '4:15 PM', '5:00 PM', '5:45 PM', '6:30 PM',
    ],
  },
  'pinamungajan-to-cebu': {
    label: 'PINAMUNGAHAN TO CEBU',
    monday: [
      '3:40 AM', '4:00 AM', '4:20 AM', '4:40 AM', '5:00 AM', '5:20 AM',
      '11:25 AM', '12:00 PM', '12:45 PM', '1:30 PM', '2:15 PM', '3:00 PM',
    ],
    other: [
      '4:00 AM', '4:45 AM', '5:30 AM', '6:15 AM', '7:00 AM', '7:45 AM',
      '11:15 AM', '12:00 PM', '12:45 PM', '1:30 PM', '2:15 PM', '3:00 PM',
    ],
  },
} as const;

type RouteKey = keyof typeof SCHEDULES;
type DayTab = 'monday' | 'other';

// ─── Time Helpers ─────────────────────────────────────────────────────────────

/** Parse "7:25 AM" → minutes since midnight */
function parseToMinutes(timeStr: string): number {
  const [timePart, period] = timeStr.split(' ');
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/** How many days until the next occurrence of the given day-of-week from today */
function daysUntilNext(targetDow: number, todayDow: number): number {
  const diff = (targetDow - todayDow + 7) % 7;
  return diff === 0 ? 0 : diff;
}

/**
 * For a given trip time in the selected tab, calculate the next real datetime it occurs.
 * - Monday tab: next Monday (or today if today IS Monday)
 * - Other tab: next Tue-Sun (or today if today is Tue-Sun)
 */
function nextOccurrenceMs(tripMinutes: number, tab: DayTab, now: Date): number {
  const todayDow = now.getDay(); // 0=Sun,1=Mon,2=Tue...
  const nowMinutes = now.getHours() * 60 + now.getMinutes() * 1 + now.getSeconds() / 60;

  if (tab === 'monday') {
    const daysToMon = daysUntilNext(1, todayDow);
    if (daysToMon === 0 && tripMinutes > nowMinutes) {
      // This Monday, still upcoming
      const d = new Date(now);
      d.setHours(Math.floor(tripMinutes / 60), tripMinutes % 60, 0, 0);
      return d.getTime();
    }
    // Next Monday (or if today is Monday but trip passed, next week)
    const daysAhead = daysToMon === 0 ? 7 : daysToMon;
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    d.setHours(Math.floor(tripMinutes / 60), tripMinutes % 60, 0, 0);
    return d.getTime();
  } else {
    // Tue-Sun schedule
    const isTueSun = todayDow !== 1; // not Monday
    if (isTueSun && tripMinutes > nowMinutes) {
      // Today, still upcoming
      const d = new Date(now);
      d.setHours(Math.floor(tripMinutes / 60), tripMinutes % 60, 0, 0);
      return d.getTime();
    }
    // Next Tue-Sun day
    const nextTueSun = todayDow === 0
      ? 2  // Sunday → Tuesday
      : todayDow === 1
      ? 2  // Monday → Tuesday
      : 1; // Any Tue-Sat → tomorrow
    const d = new Date(now);
    d.setDate(d.getDate() + nextTueSun);
    d.setHours(Math.floor(tripMinutes / 60), tripMinutes % 60, 0, 0);
    return d.getTime();
  }
}

/** Format millisecond diff to a relative string */
function formatRelative(diffMs: number): string {
  if (diffMs <= 0) return 'Departed';
  const totalSecs = Math.floor(diffMs / 1000);
  const totalMins = Math.floor(totalSecs / 60);
  const totalHours = Math.floor(totalMins / 60);
  const days = Math.floor(totalHours / 24);

  if (days >= 2) return `in ${days} days`;
  if (days === 1) return 'in a day';
  if (totalHours >= 1) {
    const mins = totalMins % 60;
    return mins > 0 ? `in ${totalHours}h ${mins}m` : `in ${totalHours} hours`;
  }
  if (totalMins >= 1) return `in ${totalMins} min`;
  return 'Departing now';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BusTripsScreen() {
  const { route } = useLocalSearchParams<{ route: string }>();
  const routeKey = (route as RouteKey) ?? 'cebu-to-pinamungajan';
  const schedule = SCHEDULES[routeKey] ?? SCHEDULES['cebu-to-pinamungajan'];

  const todayDow = new Date().getDay();
  const [activeTab, setActiveTab] = useState<DayTab>(todayDow === 1 ? 'monday' : 'other');

  const [now, setNow] = useState(new Date());
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 });

  // Tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Compute countdown to the absolute next upcoming trip (regardless of tab)
  const computeCountdown = useCallback(() => {
    const currentDow = now.getDay();
    const isTueSun = currentDow !== 1;
    const todaySchedule = currentDow === 1 ? schedule.monday : schedule.other;
    const nowMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    // Find soonest upcoming trip today
    let nextMs: number | null = null;

    for (const t of todaySchedule) {
      const tMins = parseToMinutes(t);
      if (tMins > nowMins) {
        const d = new Date(now);
        d.setHours(Math.floor(tMins / 60), tMins % 60, 0, 0);
        nextMs = d.getTime();
        break;
      }
    }

    if (nextMs === null) {
      // All today's trips passed — find first trip of next applicable day
      const nextTab: DayTab = isTueSun ? 'monday' : 'other';
      const nextSched = nextTab === 'monday' ? schedule.monday : schedule.other;
      const firstTrip = nextSched[0];
      const tMins = parseToMinutes(firstTrip);
      const daysAhead = isTueSun
        ? daysUntilNext(1, currentDow) || 7  // next Monday
        : 1; // next day (Tuesday)
      const d = new Date(now);
      d.setDate(d.getDate() + daysAhead);
      d.setHours(Math.floor(tMins / 60), tMins % 60, 0, 0);
      nextMs = d.getTime();
    }

    const diffSecs = Math.max(0, Math.floor((nextMs - now.getTime()) / 1000));
    setCountdown({
      h: Math.floor(diffSecs / 3600),
      m: Math.floor((diffSecs % 3600) / 60),
      s: diffSecs % 60,
    });
  }, [now, schedule]);

  useEffect(() => {
    computeCountdown();
  }, [computeCountdown]);

  const trips = activeTab === 'monday' ? schedule.monday : schedule.other;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Route Header Button */}
      <View style={styles.routeHeader}>
        <View style={styles.routeHeaderBtn}>
          <Text style={styles.routeHeaderText}>{schedule.label}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Next Trip Countdown */}
        <Text style={styles.nextTripLabel}>Next Trip:</Text>
        <View style={styles.timerRow}>
          <View style={styles.timerBox}>
            <Text style={styles.timerNum}>{String(countdown.h).padStart(2, '0')}</Text>
          </View>
          <Text style={styles.timerColon}>:</Text>
          <View style={styles.timerBox}>
            <Text style={styles.timerNum}>{String(countdown.m).padStart(2, '0')}</Text>
          </View>
          <Text style={styles.timerColon}>:</Text>
          <View style={styles.timerBox}>
            <Text style={styles.timerNum}>{String(countdown.s).padStart(2, '0')}</Text>
          </View>
        </View>
        <View style={styles.timerLabelsRow}>
          <Text style={styles.timerLabel}>Hours</Text>
          <View style={{ width: 24 }} />
          <Text style={styles.timerLabel}>Minutes</Text>
          <View style={{ width: 24 }} />
          <Text style={styles.timerLabel}>Seconds</Text>
        </View>

        {/* Day Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'monday' && styles.tabActive]}
            onPress={() => setActiveTab('monday')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'monday' && styles.tabTextActive]}>
              Monday
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'other' && styles.tabActive]}
            onPress={() => setActiveTab('other')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === 'other' && styles.tabTextActive]}>
              Tue – Sun
            </Text>
          </TouchableOpacity>
        </View>

        {/* Schedule List */}
        <Text style={styles.scheduleHeading}>Daily Trip Schedule</Text>

        {trips.map((time, index) => {
          const tMins = parseToMinutes(time);
          const occMs = nextOccurrenceMs(tMins, activeTab, now);
          const diffMs = occMs - now.getTime();
          const relative = formatRelative(diffMs);
          const isDeparted = diffMs <= 0;

          return (
            <View key={`${time}-${index}`} style={[styles.tripRow, isDeparted && styles.tripRowDeparted]}>
              <MaterialCommunityIcons
                name="bus"
                size={36}
                color={isDeparted ? '#bbb' : '#333'}
                style={styles.tripBusIcon}
              />
              <View style={styles.tripInfo}>
                <Text style={[styles.tripTime, isDeparted && styles.tripTimeDeparted]}>
                  {time.toLowerCase()}
                </Text>
                <Text style={[styles.tripRelative, isDeparted && styles.tripRelativeDeparted]}>
                  {relative}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Route Map */}
        <Text style={styles.mapHeading}>{schedule.label.split(' ').slice(0, 3).join(' ')}</Text>
        <Text style={styles.mapSubHeading}>Current Bus Location:</Text>
        <View style={styles.mapContainer}>
          <WebView
            source={{
              html: `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 100%; height: 100%; overflow: hidden; }
      iframe { width: 100%; height: 100%; border: 0; display: block; }
    </style>
  </head>
  <body>
    <iframe
      src="${routeKey === 'cebu-to-pinamungajan'
        ? 'https://maps.google.com/maps?saddr=South+Bus+Terminal,Cebu+City,Philippines&daddr=Pinamungahan,Cebu,Philippines&output=embed'
        : 'https://maps.google.com/maps?saddr=Pinamungahan,Cebu,Philippines&daddr=South+Bus+Terminal,Cebu+City,Philippines&output=embed'}"
      allowfullscreen
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade">
    </iframe>
  </body>
</html>`,
            }}
            style={styles.mapWebView}
            javaScriptEnabled
            originWhitelist={['*']}
          />
        </View>
      </ScrollView>

      {/* Back Button */}
      <TouchableOpacity style={styles.backBar} onPress={() => router.back()} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color={ORANGE} />
        <Text style={styles.backBarText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 0,
  },
  routeHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#fff',
  },
  routeHeaderBtn: {
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  routeHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  nextTripLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: '#222',
    marginTop: 18,
    marginBottom: 12,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timerBox: {
    width: 82,
    height: 82,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  timerNum: {
    fontSize: 36,
    fontWeight: '700',
    color: '#222',
    letterSpacing: 1,
  },
  timerColon: {
    fontSize: 32,
    fontWeight: '700',
    color: '#aaa',
    marginBottom: 8,
  },
  timerLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 20,
    gap: 6,
  },
  timerLabel: {
    width: 82,
    textAlign: 'center',
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: ORANGE,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabActive: {
    backgroundColor: ORANGE,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: ORANGE,
  },
  tabTextActive: {
    color: '#fff',
  },
  scheduleHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
    marginBottom: 12,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: ORANGE,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  tripRowDeparted: {
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  tripBusIcon: {
    marginRight: 14,
  },
  tripInfo: {
    flex: 1,
  },
  tripTime: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  tripTimeDeparted: {
    color: '#aaa',
  },
  tripRelative: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  tripRelativeDeparted: {
    color: '#bbb',
  },
  backBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 6,
    backgroundColor: '#fff',
  },
  backBarText: {
    fontSize: 15,
    fontWeight: '600',
    color: ORANGE,
  },
  mapHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
    marginTop: 24,
    marginBottom: 2,
  },
  mapSubHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#444',
    marginBottom: 10,
  },
  mapContainer: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  mapWebView: {
    flex: 1,
  },
});
