import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_PREFS_KEY,
  NotificationPreferences,
} from '../constants/notifications';
import { RouteKey, SCHEDULES } from '../constants/transport';

const ORANGE = '#E05C04';
const IS_EXPO_GO = Constants.appOwnership === 'expo';

async function getNotifications() {
  if (IS_EXPO_GO) return null;
  return await import('expo-notifications');
}

function parseToMinutes(timeStr: string) {
  const [timePart, period] = timeStr.split(' ');
  const [hStr, mStr] = timePart.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

function getNextDeparture(routeKey: RouteKey) {
  const schedule = SCHEDULES[routeKey];
  const now = new Date();
  const todayDow = now.getDay();
  const trips = todayDow === 1 ? schedule.monday : schedule.other;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  for (const trip of trips) {
    const tripMins = parseToMinutes(trip);
    if (tripMins > nowMins) {
      const d = new Date(now);
      d.setHours(Math.floor(tripMins / 60), tripMins % 60, 0, 0);
      return { date: d, time: trip, label: schedule.label };
    }
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowTrips = tomorrow.getDay() === 1 ? schedule.monday : schedule.other;
  const firstTrip = tomorrowTrips[0];
  const firstMins = parseToMinutes(firstTrip);
  tomorrow.setHours(Math.floor(firstMins / 60), firstMins % 60, 0, 0);
  return { date: tomorrow, time: firstTrip, label: schedule.label };
}

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);

  useEffect(() => {
    const loadPrefs = async () => {
      const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) });
    };
    loadPrefs();
  }, []);

  const updatePref = async (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
  };

  const scheduleReminder = async (routeKey: RouteKey) => {
    const Notifications = await getNotifications();
    if (!Notifications) {
      Alert.alert(
        'Development build required',
        'Expo Go does not support Android notifications in this SDK. Use a development build to test reminders.'
      );
      return;
    }

    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Notifications disabled', 'Please allow notifications to use departure reminders.');
      return;
    }

    const departure = getNextDeparture(routeKey);
    const triggerDate = new Date(departure.date.getTime() - 15 * 60 * 1000);
    const triggerDateValue = triggerDate.getTime() > Date.now() ? triggerDate : new Date(Date.now() + 5000);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Departure Reminder',
        body: `${departure.label} leaves at ${departure.time}.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDateValue,
      },
    });

    Alert.alert('Reminder set', `You will be reminded before the next ${departure.label} trip.`);
  };

  const rows: { key: keyof NotificationPreferences; title: string; subtitle: string }[] = [
    { key: 'delays', title: 'Delay Alerts', subtitle: 'Notify me when an admin posts delay updates.' },
    { key: 'departureReminders', title: 'Departure Reminders', subtitle: 'Notify me before upcoming trips.' },
    { key: 'emergencies', title: 'Emergency Alerts', subtitle: 'Notify me about urgent service advisories.' },
    { key: 'scheduleChanges', title: 'Schedule Changes', subtitle: 'Notify me when schedules are updated.' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.iconSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {rows.map((row) => (
          <View key={row.key} style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>{row.title}</Text>
              <Text style={styles.settingSubtitle}>{row.subtitle}</Text>
            </View>
            <Switch
              value={prefs[row.key]}
              onValueChange={(value) => updatePref(row.key, value)}
              thumbColor={prefs[row.key] ? ORANGE : '#f4f3f4'}
              trackColor={{ false: '#d1d5db', true: '#fed7aa' }}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Set Departure Reminder</Text>
        <TouchableOpacity style={styles.reminderBtn} onPress={() => scheduleReminder('cebu-to-pinamungajan')}>
          <Ionicons name="notifications" size={22} color="#fff" />
          <Text style={styles.reminderText}>Cebu to Pinamungahan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reminderBtn} onPress={() => scheduleReminder('pinamungajan-to-cebu')}>
          <Ionicons name="notifications" size={22} color="#fff" />
          <Text style={styles.reminderText}>Pinamungahan to Cebu</Text>
        </TouchableOpacity>
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 16,
    marginBottom: 10,
  },
  reminderBtn: {
    backgroundColor: ORANGE,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  reminderText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
