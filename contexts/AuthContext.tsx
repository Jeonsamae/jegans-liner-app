import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export const ADMIN_EMAIL = 'admin@jegansliner.com';
export const ADMIN_PASSWORD = 'Admin@12345';
export const ADMIN_DISPLAY_NAME = 'Jegans Liner';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  photo_url: string | null;
  is_admin: boolean;
  address: string | null;
  workplace: string | null;
  age: number | null;
  birthday: string | null;
}

interface AuthContextType {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  userProfile: null,
  loading: true,
  refreshProfile: async () => {},
});

function buildFallback(userId: string, email: string): UserProfile {
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return {
    id: userId,
    full_name: isAdmin ? ADMIN_DISPLAY_NAME : email.split('@')[0],
    email,
    photo_url: null,
    is_admin: isAdmin,
    address: null,
    workplace: null,
    age: null,
    birthday: null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAndSetProfile(userId: string, email: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data?.is_admin && data.full_name !== ADMIN_DISPLAY_NAME) {
        await supabase
          .from('profiles')
          .update({ full_name: ADMIN_DISPLAY_NAME })
          .eq('id', userId);

        setUserProfile({ ...data, full_name: ADMIN_DISPLAY_NAME });
        return;
      }

      setUserProfile(data ?? buildFallback(userId, email));
    } catch {
      setUserProfile(buildFallback(userId, email));
    } finally {
      setLoading(false);
    }
  }

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchAndSetProfile(session.user.id, session.user.email ?? '');
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchAndSetProfile(session.user.id, session.user.email ?? '');
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
