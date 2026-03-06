import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, X } from 'lucide-react-native';

export default function DriverSettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleCloseAccount = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('⚠️ ATTENTION - Fermeture de compte\n\nVous êtes sur le point de fermer définitivement votre compte.\n\n❌ Cette action est IRRÉVERSIBLE\n❌ Toutes vos données seront supprimées\n❌ Votre historique de livraisons sera perdu\n❌ Vos gains non retirés seront perdus\n❌ Vous ne pourrez pas récupérer votre compte\n\nÊtes-vous absolument certain(e) de vouloir continuer ?')) {
        if (window.confirm('🚨 DERNIÈRE CONFIRMATION\n\nCeci est votre dernière chance de changer d\'avis.\n\nVotre compte et toutes vos données seront DÉFINITIVEMENT SUPPRIMÉS.\n\nVoulez-vous vraiment fermer votre compte ?')) {
          try {
            if (!user) return;

            await supabase.from('user_profiles').update({ status: 'closed' }).eq('id', user.id);
            await supabase.from('drivers').update({ verification_status: 'closed' }).eq('user_id', user.id);

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
        'Vous êtes sur le point de fermer définitivement votre compte.\n\n❌ Cette action est IRRÉVERSIBLE\n❌ Toutes vos données seront supprimées\n❌ Votre historique de livraisons sera perdu\n❌ Vos gains non retirés seront perdus\n❌ Vous ne pourrez pas récupérer votre compte\n\nÊtes-vous absolument certain(e) de vouloir continuer ?',
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
                        await supabase.from('drivers').update({ verification_status: 'closed' }).eq('user_id', user.id);

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
        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Zone dangereuse</Text>
          <Text style={styles.dangerZoneDescription}>
            La suppression de votre compte est irréversible. Toutes vos données, votre historique de livraisons et vos gains non retirés seront définitivement perdus.
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
