import { Redirect } from 'expo-router';

import { useAuth } from '../contexts/AuthContext';

export default function IndexScreen() {
  const { session, userProfile, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!session) {
    return <Redirect href="/landing" />;
  }

  return <Redirect href={userProfile?.is_admin ? '/(tabs)/admin' : '/(tabs)'} />;
}
