import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, X, RefreshCw } from 'lucide-react-native';
import { useState, useEffect } from 'react';

export default function MerchantSettingsScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [ordersCount, setOrdersCount] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    loadOrdersCount();
  }, [profile?.merchant_id]);

  async function loadOrdersCount() {
    if (!profile?.merchant_id) return;

    try {
      setOrdersLoading(true);
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('merchant_id', profile.merchant_id);

      setOrdersCount(count || 0);
    } catch (error) {
      console.error('Error loading orders count:', error);
    } finally {
      setOrdersLoading(false);
    }
  }

  const handleCloseAccount = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('⚠️ ATTENTION - Fermeture de compte\n\nVous êtes sur le point de fermer définitivement votre compte.\n\n❌ Cette action est IRRÉVERSIBLE\n❌ Toutes vos données seront supprimées\n❌ Votre catalogue de produits sera perdu\n❌ Votre historique de commandes sera perdu\n❌ Vos gains non retirés seront perdus\n❌ Vous ne pourrez pas récupérer votre compte\n\nÊtes-vous absolument certain(e) de vouloir continuer ?')) {
        if (window.confirm('🚨 DERNIÈRE CONFIRMATION\n\nCeci est votre dernière chance de changer d\'avis.\n\nVotre compte et toutes vos données seront DÉFINITIVEMENT SUPPRIMÉS.\n\nVoulez-vous vraiment fermer votre compte ?')) {
          try {
            if (!user) return;

            await supabase.from('user_profiles').update({ status: 'closed' }).eq('id', user.id);
            await supabase.from('merchants').update({ verification_status: 'closed' }).eq('user_id', user.id);

            window.alert('Compte fermé: Votre compte a été fermé avec succès.');
            await signOut();
            router.replace('/');
          } catch (error) {
            console.error('Error closing account:', error);
            window.alert('Erreur: Une erreur est survenue lors de la fermeture du compte.');
          }
        }
      }
    } else {
      Alert.alert(
        '⚠️ ATTENTION - Fermeture de compte',
        'Vous êtes sur le point de fermer définitivement votre compte.\n\n❌ Cette action est IRRÉVERSIBLE\n❌ Toutes vos données seront supprimées\n❌ Votre catalogue de produits sera perdu\n❌ Votre historique de commandes sera perdu\n❌ Vos gains non retirés seront perdus\n❌ Vous ne pourrez pas récupérer votre compte\n\nÊtes-vous absolument certain(e) de vouloir continuer ?',
        [
          { text: 'Non, annuler', style: 'cancel' },
          {
            text: 'Oui, continuer',
            style: 'default',
            onPress: () => {
              Alert.alert(
                '🚨 DERNIÈRE CONFIRMATION',
                'Ceci est votre dernière chance de changer d\'avis.\n\nVotre compte et toutes vos données seront DÉFINITIVEMENT SUPPRIMÉS.\n\nVoulez-vous vraiment fermer votre compte ?',
                [
                  { text: 'Non, je garde mon compte', style: 'cancel' },
                  {
                    text: 'Oui, supprimer définitivement',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        if (!user) return;

                        await supabase.from('user_profiles').update({ status: 'closed' }).eq('id', user.id);
                        await supabase.from('merchants').update({ verification_status: 'closed' }).eq('user_id', user.id);

                        Alert.alert('Compte fermé', 'Votre compte a été fermé avec succès.', [
                          {
                            text: 'OK',
                            onPress: async () => {
                              await signOut();
                              router.replace('/');
                            },
                          },
                        ]);
                      } catch (error) {
                        console.error('Error closing account:', error);
                        Alert.alert('Erreur', 'Une erreur est survenue lors de la fermeture du compte.');
                      }
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Paramètres</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Debug Info */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>🔍 Debug Info:</Text>
            <Text style={styles.debugText}>User ID: {profile?.id || 'NOT SET'}</Text>
            <Text style={styles.debugText}>Merchant ID: {profile?.merchant_id || 'NOT SET'}</Text>
            <Text style={styles.debugText}>Orders Count: {ordersCount}</Text>
            <Text style={styles.debugText}>Orders Loading: {ordersLoading ? 'Yes' : 'No'}</Text>
            <TouchableOpacity
              style={styles.debugRefreshButton}
              onPress={() => {
                console.log('=== MANUAL REFRESH ===');
                loadOrdersCount();
              }}
              disabled={ordersLoading}
            >
              {ordersLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <RefreshCw size={16} color="#fff" />
              )}
              <Text style={styles.debugRefreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Zone dangereuse</Text>
          <Text style={styles.dangerZoneDescription}>
            La suppression de votre compte est irréversible. Toutes vos données, votre catalogue de produits, votre historique de commandes et vos gains non retirés seront définitivement perdus.
          </Text>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleCloseAccount}
          >
            <X size={22} color="#fff" />
            <Text style={styles.deleteAccountText}>
              Supprimer mon compte
            </Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
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
  debugContainer: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#bae6fd',
    marginBottom: 20,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 13,
    color: '#075985',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  debugRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  debugRefreshText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  dangerZone: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fee2e2',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
  },
  dangerZoneDescription: {
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
    marginBottom: 16,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
    backgroundColor: '#dc2626',
    borderRadius: 8,
  },
  deleteAccountText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
