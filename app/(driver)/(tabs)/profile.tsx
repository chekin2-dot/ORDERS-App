import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Truck, MapPin, LogOut, Phone, Clock, Camera, User, X, Wallet, CreditCard as Edit2, Check, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import WorkingHoursEditor from '@/components/WorkingHoursEditor';
import { useFocusEffect } from '@react-navigation/native';
import AppFooter from '@/components/AppFooter';

interface DriverInfo {
  id: string;
  vehicle_type: string;
  delivery_zones: string[];
  is_available: boolean;
  verification_status: string;
  identity_photo_url: string | null;
  vehicle_photo_url: string | null;
  working_hours: any;
  orange_money_number: string | null;
  orange_money_name: string | null;
}

interface DriverStats {
  total_deliveries: number;
  total_earnings: number;
  express_deliveries: number;
  total_bonuses: number;
}

export default function DriverProfileScreen() {
  const { profile, user, signOut, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [driverStats, setDriverStats] = useState<DriverStats>({
    total_deliveries: 0,
    total_earnings: 0,
    express_deliveries: 0,
    total_bonuses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState('');
  const [orangeMoneyName, setOrangeMoneyName] = useState('');

  useEffect(() => {
    if (!authLoading && user?.id) {
      loadDriverInfo();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  useFocusEffect(
    useCallback(() => {
      if (driverInfo?.id) {
        loadDriverStats(driverInfo.id);
      }
    }, [driverInfo?.id])
  );

  const loadDriverInfo = async () => {
    if (!user?.id) {
      console.log('No user ID found in profile');
      setLoading(false);
      return;
    }

    console.log('Loading driver info for user:', user.id);

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading driver info:', error);
        setLoading(false);
        return;
      }

      console.log('Driver info data:', data);

      if (data) {
        setDriverInfo({
          id: data.id,
          vehicle_type: data.vehicle_type,
          delivery_zones: data.delivery_zones || [],
          is_available: data.is_available || false,
          verification_status: data.verification_status || 'pending',
          identity_photo_url: data.identity_photo_url,
          vehicle_photo_url: data.vehicle_photo_url,
          working_hours: data.working_hours || {},
          orange_money_number: data.orange_money_number || null,
          orange_money_name: data.orange_money_name || null,
        });
        setOrangeMoneyNumber(data.orange_money_number || '');
        setOrangeMoneyName(data.orange_money_name || '');

        loadDriverStats(data.id);
      } else {
        console.log('No driver info found');
      }
    } catch (error) {
      console.error('Error loading driver info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDriverStats = async (driverId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('is_express')
        .eq('driver_id', driverId)
        .in('status', ['accepted', 'preparing', 'ready', 'in_delivery', 'delivered']);

      if (error) throw error;

      const deliveries = data?.length || 0;
      const expressCount = data?.filter(order => order.is_express).length || 0;
      const regularCount = deliveries - expressCount;

      const earnings = (regularCount * 1000) + (expressCount * 1500);
      const bonuses = expressCount * 500;

      setDriverStats({
        total_deliveries: deliveries,
        total_earnings: earnings,
        express_deliveries: expressCount,
        total_bonuses: bonuses,
      });
    } catch (error) {
      console.error('Error loading driver stats:', error);
    }
  };


  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous vous déconnecter ?')) {
        console.log('[DriverProfile] Starting sign out');
        await signOut();
        console.log('[DriverProfile] Sign out complete');
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
              console.log('[DriverProfile] Starting sign out');
              await signOut();
              console.log('[DriverProfile] Sign out complete');
              setTimeout(() => {
                router.replace('/onboarding');
              }, 100);
            }
          }
        ]
      );
    }
  };

  const pickProfileImage = async () => {
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à vos photos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!user?.id) return;

    setUploadingProfile(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = blob.type.split('/')[1] || 'jpg';
      const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`;
      const contentType = blob.type || 'image/jpeg';

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('merchant-photos')
        .upload(fileName, blob, {
          contentType: contentType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('merchant-photos')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      Alert.alert('Succès', 'Photo de profil mise à jour');
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Erreur', error.message || 'Impossible de télécharger la photo');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleSaveWorkingHours = async (hours: any) => {
    if (!driverInfo) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ working_hours: hours })
        .eq('id', driverInfo.id);

      if (error) throw error;

      setDriverInfo({ ...driverInfo, working_hours: hours });
    } catch (error) {
      console.error('Error saving working hours:', error);
      throw error;
    }
  };

  const handleSavePaymentDetails = async () => {
    if (!driverInfo) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({
          orange_money_number: orangeMoneyNumber || null,
          orange_money_name: orangeMoneyName || null,
        })
        .eq('id', driverInfo.id);

      if (error) throw error;

      setDriverInfo({
        ...driverInfo,
        orange_money_number: orangeMoneyNumber || null,
        orange_money_name: orangeMoneyName || null,
      });
      setEditingPayment(false);

      if (Platform.OS === 'web') {
        window.alert('Informations de paiement mises à jour');
      } else {
        Alert.alert('Succès', 'Informations de paiement mises à jour');
      }
    } catch (error) {
      console.error('Error saving payment details:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: Impossible de sauvegarder les informations de paiement');
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder les informations de paiement');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Mon Profil Livreur</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={pickProfileImage}
            disabled={uploadingProfile}
          >
            {profile?.profile_photo_url ? (
              <Image
                source={{ uri: profile.profile_photo_url }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatar}>
                <User size={40} color="#666" />
              </View>
            )}
            {uploadingProfile ? (
              <View style={styles.profileImageOverlay}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : (
              <View style={styles.profileImageOverlay}>
                <Camera size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.name}>
            {profile?.first_name} {profile?.last_name} 👋
          </Text>
          <Text style={styles.phone}>{profile?.phone}</Text>
          {driverInfo && (
            <View style={[styles.statusBadge, {
              backgroundColor: driverInfo.verification_status === 'verified' ? '#4caf50' :
                              driverInfo.verification_status === 'rejected' ? '#f44336' : '#ff9800'
            }]}>
              <Text style={styles.statusText}>
                {driverInfo.verification_status === 'verified' ? 'Livreur vérifié' :
                 driverInfo.verification_status === 'rejected' ? 'Rejeté' : 'En attente de validation'}
              </Text>
            </View>
          )}
        </View>

        {driverInfo && (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{driverStats.total_deliveries}</Text>
                <Text style={styles.statLabel}>Livraisons</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{driverStats.total_earnings.toLocaleString()}</Text>
                <Text style={styles.statLabel}>F CFA Gagnés</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{driverStats.express_deliveries}</Text>
                <Text style={styles.statLabel}>Express</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations livreur</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Truck size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Véhicule</Text>
                    <Text style={styles.infoValue}>{driverInfo.vehicle_type}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <MapPin size={20} color="#2563eb" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Zones de livraison</Text>
                    {driverInfo.delivery_zones.length > 0 ? (
                      <Text style={styles.infoValue}>{driverInfo.delivery_zones.join(', ')}</Text>
                    ) : (
                      <Text style={styles.infoSubValue}>Aucune zone définie</Text>
                    )}
                    {profile?.neighborhood && (
                      <Text style={styles.infoSubValue}>Quartier de base: {profile.neighborhood}</Text>
                    )}
                    {profile?.latitude && profile?.longitude && (
                      <Text style={styles.infoSubValue}>
                        GPS: {parseFloat(profile.longitude).toFixed(6)}, {parseFloat(profile.latitude).toFixed(6)}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Phone size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Téléphone</Text>
                    <Text style={styles.infoValue}>{profile?.phone}</Text>
                    {profile?.whatsapp_number && (
                      <Text style={styles.infoSubValue}>WhatsApp: {profile.whatsapp_number}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Clock size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Statut</Text>
                    <Text style={[styles.infoValue, { color: driverInfo.is_available ? '#4caf50' : '#f44336' }]}>
                      {driverInfo.is_available ? 'Disponible' : 'Hors ligne'}
                    </Text>
                  </View>
                </View>

                <WorkingHoursEditor
                  workingHours={driverInfo.working_hours}
                  onSave={handleSaveWorkingHours}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Informations de paiement</Text>
                {!editingPayment && (
                  <TouchableOpacity onPress={() => setEditingPayment(true)}>
                    <Edit2 size={20} color="#2563eb" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <Image
                    source={require('@/assets/images/orange_money.png')}
                    style={styles.orangeMoneyLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.paymentTitle}>Orange Money</Text>
                </View>
                {editingPayment ? (
                  <View style={styles.paymentEditContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nom du titulaire</Text>
                      <TextInput
                        style={styles.input}
                        value={orangeMoneyName}
                        onChangeText={(text) => setOrangeMoneyName(text.toUpperCase())}
                        placeholder="Ex: JEAN DUPONT"
                        placeholderTextColor="#999"
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Numéro Orange Money</Text>
                      <TextInput
                        style={styles.input}
                        value={orangeMoneyNumber}
                        onChangeText={setOrangeMoneyNumber}
                        placeholder="Ex: 07 XX XX XX XX"
                        placeholderTextColor="#999"
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View style={styles.paymentActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setOrangeMoneyNumber(driverInfo.orange_money_number || '');
                          setOrangeMoneyName(driverInfo.orange_money_name || '');
                          setEditingPayment(false);
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSavePaymentDetails}
                      >
                        <Check size={16} color="#fff" />
                        <Text style={styles.saveButtonText}>Enregistrer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.paymentInfoContainer}>
                    {driverInfo.orange_money_number ? (
                      <>
                        <View style={styles.paymentInfoRow}>
                          <Text style={styles.paymentLabel}>Titulaire</Text>
                          <Text style={styles.paymentValue}>{driverInfo.orange_money_name || 'Non renseigné'}</Text>
                        </View>
                        <View style={styles.paymentInfoRow}>
                          <Text style={styles.paymentLabel}>Numéro</Text>
                          <Text style={styles.paymentValue}>{driverInfo.orange_money_number}</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={styles.noPaymentText}>
                        Aucun compte Orange Money configuré. Ajoutez vos informations pour recevoir vos paiements.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {driverStats.total_bonuses > 0 && (
              <View style={styles.bonusCard}>
                <Text style={styles.bonusTitle}>Bonus Express</Text>
                <Text style={styles.bonusAmount}>{driverStats.total_bonuses.toLocaleString()} F CFA</Text>
                <Text style={styles.bonusSubtext}>
                  Gagnés sur {driverStats.express_deliveries} livraison(s) express
                </Text>
              </View>
            )}
          </>
        )}

        {loading ? (
          <View style={styles.section}>
            <Text style={styles.comingSoon}>Chargement...</Text>
          </View>
        ) : !driverInfo && (
          <View style={styles.section}>
            <Text style={styles.comingSoon}>
              Vos informations de livreur apparaîtront ici une fois votre compte validé.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(driver)/settings')}
          >
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
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
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
  comingSoon: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  infoContainer: {
    gap: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  infoSubValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bonusCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fbbf24',
    alignItems: 'center',
  },
  bonusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  bonusAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  bonusSubtext: {
    fontSize: 12,
    color: '#92400e',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  orangeMoneyLogo: {
    width: 32,
    height: 32,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  paymentEditContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  paymentInfoContainer: {
    gap: 12,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  noPaymentText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    lineHeight: 20,
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
