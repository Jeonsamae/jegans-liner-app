import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME } from '../contexts/AuthContext';
import { supabase } from '../supabase';
import NotificationBootstrap from '../components/NotificationBootstrap';

export const unstable_settings = {
  anchor: '(tabs)',
};

async function seedAdminAccount() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return; // Don't interfere with a logged-in user

  try {
    const { data, error } = await supabase.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (error || !data.user) return; // Already exists or another error

    // Insert admin profile
    await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: ADMIN_DISPLAY_NAME,
      email: ADMIN_EMAIL,
      photo_url: null,
      is_admin: true,
    });

    // Sign out if auto-signed in (email confirmation disabled)
    if (data.session) {
      await supabase.auth.signOut();
    }
  } catch {
    // Silently ignore
  }
}

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, userProfile, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && userProfile && inAuthGroup) {
      router.replace(userProfile.is_admin ? '/(tabs)/admin' : '/(tabs)');
    }
  }, [session, userProfile, loading, segments]);

  return <>{children}</>;
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    seedAdminAccount();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <NavigationGuard>
        <NotificationBootstrap />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="create-post" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="admin-create-post" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="admin-home" options={{ headerShown: false }} />
          <Stack.Screen name="admin-lost-found" options={{ headerShown: false }} />
          <Stack.Screen name="admin-reports" options={{ headerShown: false }} />
          <Stack.Screen name="announcements" options={{ headerShown: false }} />
          <Stack.Screen name="lost-found" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="offline-access" options={{ headerShown: false }} />
          <Stack.Screen name="report" options={{ headerShown: false }} />
          <Stack.Screen name="route-map" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="post-detail" options={{ headerShown: false }} />
          <Stack.Screen name="friends" options={{ headerShown: false }} />
          <Stack.Screen name="chats" options={{ headerShown: false }} />
          <Stack.Screen name="chat-room" options={{ headerShown: false }} />
          <Stack.Screen name="bus-schedule" options={{ headerShown: false }} />
          <Stack.Screen name="bus-trips" options={{ headerShown: false }} />
        </Stack>
      </NavigationGuard>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
