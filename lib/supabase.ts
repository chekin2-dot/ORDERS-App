import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
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
          profile_photo_url: string | null;
          status: 'pending' | 'active' | 'suspended' | 'banned';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_type: 'client' | 'merchant' | 'driver';
          phone: string;
          first_name: string;
          last_name?: string;
          whatsapp_number?: string | null;
          neighborhood?: string | null;
          full_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          profile_photo_url?: string | null;
          status?: 'pending' | 'active' | 'suspended' | 'banned';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_type?: 'client' | 'merchant' | 'driver';
          phone?: string;
          first_name?: string;
          last_name?: string;
          whatsapp_number?: string | null;
          neighborhood?: string | null;
          full_address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          profile_photo_url?: string | null;
          status?: 'pending' | 'active' | 'suspended' | 'banned';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
