import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { DEFAULT_NOTIFICATION_PREFS, NOTIFICATION_PREFS_KEY, NotificationPreferences } from '../constants/notifications';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

async function getPrefs(): Promise<NotificationPreferences> {
  const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
  return raw ? { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) } : DEFAULT_NOTIFICATION_PREFS;
}

async function getNotifications() {
  if (IS_EXPO_GO) return null;

  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  return Notifications;
}

function getAlertType(content: string) {
  const text = content.toLowerCase();
  if (text.includes('emergency') || text.includes('urgent')) return 'emergencies';
  if (text.includes('delay') || text.includes('delayed')) return 'delays';
  if (text.includes('schedule') || text.includes('change')) return 'scheduleChanges';
  if (text.includes('departure') || text.includes('depart')) return 'departureReminders';
  return null;
}

export default function NotificationBootstrap() {
  const { session } = useAuth();

  useEffect(() => {
    getNotifications().then((Notifications) => {
      Notifications?.requestPermissionsAsync();
    });
  }, []);

  useEffect(() => {
    if (!session?.user || IS_EXPO_GO) return;
    let isMounted = true;

    const channel = supabase
      .channel(`admin-update-alerts-${session.user.id}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const Notifications = await getNotifications();
        if (!Notifications || !isMounted) return;

        const post = payload.new as { user_id?: string; content?: string };
        if (!post.user_id || !post.content) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', post.user_id)
          .single();

        if (!profile?.is_admin) return;

        const alertType = getAlertType(post.content);
        if (!alertType) return;

        const prefs = await getPrefs();
        if (!prefs[alertType]) return;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Jegans Liner Update',
            body: post.content,
            data: { route: '/announcements', alertType },
          },
          trigger: null,
        });
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [session?.user]);

  return null;
}
