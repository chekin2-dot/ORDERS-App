import { View, Image, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function SplashScreen() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || loading) {
      console.log('[Splash] Still loading or not mounted...');
      return;
    }

    console.log('[Splash] Auth loaded - Session:', !!session, 'Profile:', !!profile, 'User Type:', profile?.user_type, 'Is Admin:', profile?.is_admin);

    const timeout = setTimeout(() => {
      if (!session) {
        console.log('[Splash] No session, redirecting to onboarding');
        router.replace('/onboarding');
        return;
      }

      if (!profile) {
        console.log('[Splash] Session exists but no profile, redirecting to onboarding');
        router.replace('/onboarding');
        return;
      }

      // Check if user is an admin first
      if (profile.is_admin) {
        console.log('[Splash] Admin user detected, redirecting to admin dashboard');
        router.replace('/(admin)/(tabs)');
        return;
      }

      console.log('[Splash] Authenticated user, redirecting to:', profile.user_type);
      switch (profile.user_type) {
        case 'client':
          router.replace('/(client)/(tabs)');
          break;
        case 'merchant':
          router.replace('/(merchant)/(tabs)');
          break;
        case 'driver':
          router.replace('/(driver)/(tabs)');
          break;
        default:
          console.log('[Splash] Unknown user type, redirecting to onboarding');
          router.replace('/onboarding');
          break;
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [session, profile, loading, isMounted, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>ORDERS App</Text>
      <Text style={styles.baseline}>Vos commerces & livraisons en un clic</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  baseline: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
