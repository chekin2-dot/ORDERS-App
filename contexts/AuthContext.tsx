import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type UserType = 'client' | 'merchant' | 'driver' | 'admin' | null;

type UserProfile = {
  id: string;
  user_type: 'client' | 'merchant' | 'driver';
  phone: string;
  first_name: string;
  last_name: string;
  whatsapp_number: string | null;
  neighborhood: string | null;
  full_address: string | null;
  latitude: number | null;
  longitude: number | null;
  gps_enabled: boolean;
  profile_photo_url: string | null;
  status: 'pending' | 'active' | 'suspended' | 'banned';
  merchant_id?: string;
  driver_id?: string;
  is_admin?: boolean;
  admin_role?: 'super_admin' | 'admin' | 'moderator';
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  selectedUserType: UserType;
  loading: boolean;
  setSelectedUserType: (type: UserType) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[AuthContext] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        throw error;
      }

      if (data) {
        console.log('[AuthContext] Profile found:', data.user_type);
        let enhancedProfile = { ...data };

        // Check if user is an admin
        const { data: adminData, error: adminError } = await supabase
          .from('admin_users')
          .select('role, is_active')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (adminError) {
          console.error('[AuthContext] Error checking admin status:', adminError);
        }

        if (adminData) {
          console.log('[AuthContext] User is admin with role:', adminData.role);
          enhancedProfile.is_admin = true;
          enhancedProfile.admin_role = adminData.role;
        }

        if (data.user_type === 'merchant') {
          const { data: merchantData, error: merchantError } = await supabase
            .from('merchants')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (merchantError) {
            console.error('[AuthContext] Error fetching merchant data:', merchantError);
          }

          if (merchantData) {
            enhancedProfile.merchant_id = merchantData.id;
          }
        } else if (data.user_type === 'driver') {
          const { data: driverData, error: driverError } = await supabase
            .from('drivers')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (driverError) {
            console.error('[AuthContext] Error fetching driver data:', driverError);
          }

          if (driverData) {
            enhancedProfile.driver_id = driverData.id;
          }
        }

        console.log('[AuthContext] Setting profile with enhanced data');
        setProfile(enhancedProfile);
      } else {
        console.log('[AuthContext] No profile found for user');
        setProfile(null);
      }
    } catch (error) {
      console.error('[AuthContext] Exception in fetchProfile:', error);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    (async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[AuthContext] Error getting session:', error);
          if (error.message.includes('refresh_token_not_found') || error.message.includes('Refresh Token Not Found')) {
            console.log('[AuthContext] Invalid refresh token detected, clearing storage');
            if (typeof window !== 'undefined') {
              for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sb-')) {
                  localStorage.removeItem(key);
                }
              }
              for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('sb-')) {
                  sessionStorage.removeItem(key);
                }
              }
            }
          }
          setSession(null);
          setUser(null);
          setProfile(null);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Exception getting session:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
      }

      setLoading(false);

      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange((event, newSession) => {
        console.log('[AuthContext] Auth state changed:', event, 'Session:', !!newSession);

        (async () => {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            await fetchProfile(newSession.user.id);
          } else {
            setProfile(null);
            setSelectedUserType(null);
          }

          if (event === 'SIGNED_OUT') {
            console.log('[AuthContext] User signed out, clearing state');
            setLoading(false);
          }
        })();
      });

      subscription = sub;
    })();

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('[AuthContext] signOut called');

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('[AuthContext] Exception during sign out:', error);
    }

    if (typeof window !== 'undefined') {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        }
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('sb-')) {
            sessionStorage.removeItem(key);
          }
        }
        console.log('[AuthContext] Cleared all Supabase storage');
      } catch (error) {
        console.error('[AuthContext] Error clearing storage:', error);
      }
    }

    setProfile(null);
    setSelectedUserType(null);
    setSession(null);
    setUser(null);
    console.log('[AuthContext] Sign out complete');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        selectedUserType,
        loading,
        setSelectedUserType,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
