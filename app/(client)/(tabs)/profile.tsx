import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { User, MapPin, Settings, LogOut, MessageCircle, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import AppFooter from '@/components/AppFooter';

export default function ProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();


  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous vous déconnecter ?')) {
        console.log('[Profile] Starting sign out');
        await signOut();
        console.log('[Profile] Sign out complete');
        setTimeout(() => {
          router.replace('/onboarding');
        }, 100);
      }
    } else {
      Alert.alert(
        'Déconnexion',
        'Voulez-vous vous déconnecter ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Déconnexion',
            style: 'destructive',
            onPress: async () => {
              console.log('[Profile] Starting sign out');
              await signOut();
              console.log('[Profile] Sign out complete');
              setTimeout(() => {
                router.replace('/onboarding');
              }, 100);
            }
          }
        ]
      );
    }
  };

  const handleSettings = () => {
    router.push('/(client)/settings');
  };

  const openMap = () => {
    if (!profile?.latitude || !profile?.longitude) return;

    const url = Platform.select({
      ios: `maps:0,0?q=Ma Position@${profile.latitude},${profile.longitude}`,
      android: `geo:0,0?q=${profile.latitude},${profile.longitude}(Ma Position)`,
      web: `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(err => console.error('Error opening map:', err));
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Mon Profil Client</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <User size={40} color="#666" />
          </View>
          <Text style={styles.name}>
            {profile?.first_name} {profile?.last_name}
          </Text>
          <Text style={styles.phone}>{profile?.phone}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations</Text>

          {profile?.whatsapp_number && (
            <View style={styles.infoRow}>
              <MessageCircle size={20} color="#666" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>WhatsApp</Text>
                <Text style={styles.infoValue}>{profile.whatsapp_number}</Text>
              </View>
            </View>
          )}

          {profile?.neighborhood && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={openMap}
              disabled={!profile?.latitude || !profile?.longitude}
            >
              <MapPin size={20} color="#2563eb" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Quartier</Text>
                <Text style={styles.infoValue}>{profile.neighborhood}</Text>
              </View>
            </TouchableOpacity>
          )}

          {profile?.full_address && (
            <TouchableOpacity
              style={styles.infoRow}
              onPress={openMap}
              disabled={!profile?.latitude || !profile?.longitude}
            >
              <MapPin size={20} color="#2563eb" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Adresse</Text>
                <Text style={styles.infoValue}>{profile.full_address}</Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.infoRow}
            onPress={openMap}
            disabled={!profile?.latitude || !profile?.longitude}
          >
            <MapPin size={20} color={profile?.latitude && profile?.longitude ? "#2563eb" : "#999"} />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Adresse de livraison</Text>
              <Text style={[
                styles.infoValue,
                (!profile?.latitude || !profile?.longitude) && styles.infoValueInactive
              ]}>
                {profile?.address || 'Non spécifiée'}
              </Text>
              <Text style={[
                styles.gpsCoordinates,
                profile?.latitude && profile?.longitude && styles.gpsCoordinatesActive
              ]}>
                {profile?.latitude && profile?.longitude
                  ? `GPS: ${profile.longitude.toFixed(6)}, ${profile.latitude.toFixed(6)}`
                  : `Coordonnées GPS non disponibles (${profile?.longitude ? profile.longitude.toFixed(6) : '0.000000'}, ${profile?.latitude ? profile.latitude.toFixed(6) : '0.000000'})`
                }
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <Settings size={20} color="#666" />
            <Text style={styles.menuItemText}>Paramètres</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <LogOut size={20} color="#fff" />
            <Text style={styles.logoutButtonText}>
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>
        <AppFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  infoValueInactive: {
    color: '#999',
  },
  gpsCoordinates: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  gpsCoordinatesActive: {
    color: '#2563eb',
    fontWeight: '500',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  menuItemDanger: {
    color: '#d32f2f',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#ff9800',
    borderRadius: 12,
    marginTop: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
