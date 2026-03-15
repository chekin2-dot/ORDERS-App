import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, MapPin, Phone, MessageCircle, User, Save, Navigation, AlertTriangle, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { ARRONDISSEMENTS } from '@/lib/neighborhoods';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, user, refreshProfile, signOut } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setPhone(profile.phone || '');
      setWhatsappNumber(profile.whatsapp_number || '');
      setNeighborhood(profile.neighborhood || '');
      setFullAddress(profile.full_address || '');
      setGpsEnabled(profile.gps_enabled ?? true);
      setLatitude(profile.latitude || null);
      setLongitude(profile.longitude || null);
    }
  }, [profile]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);

    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          Alert.alert('Erreur', 'La géolocalisation n\'est pas supportée par votre navigateur.');
          setLocationLoading(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            setLatitude(lat);
            setLongitude(lng);

            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=fr`
              );
              const data = await response.json();

              if (data.address) {
                const addressParts = [];

                if (data.address.country) {
                  addressParts.push(data.address.country);
                }

                if (data.address.city || data.address.town || data.address.village) {
                  const city = data.address.city || data.address.town || data.address.village;
                  addressParts.push(`[${city}]`);
                }

                if (data.address.road || data.address.suburb) {
                  addressParts.push(data.address.road || data.address.suburb);
                }

                const generatedAddress = addressParts.join(' / ');
                if (generatedAddress) {
                  setFullAddress(generatedAddress);
                }
              }

              Alert.alert('Succès', 'Position GPS capturée avec succès!');
              setLocationLoading(false);
            } catch (error: any) {
              Alert.alert('Erreur', 'Impossible de récupérer l\'adresse: ' + error.message);
              setLocationLoading(false);
            }
          },
          (error) => {
            Alert.alert('Erreur', 'Impossible de récupérer votre position: ' + error.message);
            setLocationLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission refusée', 'La permission d\'accès à la localisation est nécessaire');
          setLocationLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);

        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (reverseGeocode.length > 0) {
          const address = reverseGeocode[0];
          const addressParts = [
            address.street,
            address.city,
            address.region,
            address.country,
          ].filter(Boolean);
          setFullAddress(addressParts.join(', '));
        }

        Alert.alert('Succès', 'Position GPS capturée avec succès!');
        setLocationLoading(false);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de récupérer votre position: ' + error.message);
      setLocationLoading(false);
    }
  };

  const openMap = () => {
    if (!latitude || !longitude) {
      Alert.alert('Info', 'Aucune position GPS enregistrée');
      return;
    }

    const url = Platform.select({
      ios: `maps:0,0?q=Ma Position@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(Ma Position)`,
      web: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    if (url) {
      import('react-native').then(({ Linking }) => {
        Linking.openURL(url).catch(err => console.error('Error opening map:', err));
      });
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }

    if (!lastName.trim()) {
      Alert.alert('Erreur', 'Le prénom est obligatoire');
      return;
    }

    if (!whatsappNumber.trim()) {
      Alert.alert('Erreur', 'Le numéro WhatsApp est obligatoire');
      return;
    }

    if (!profile?.id) {
      Alert.alert('Erreur', 'Session utilisateur invalide');
      return;
    }

    setLoading(true);
    try {
      const updates: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        whatsapp_number: whatsappNumber.trim(),
      };

      if (neighborhood) updates.neighborhood = neighborhood;
      if (fullAddress) updates.full_address = fullAddress.trim();
      if (latitude !== null) updates.latitude = latitude;
      if (longitude !== null) updates.longitude = longitude;
      updates.gps_enabled = gpsEnabled;

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      await refreshProfile();
      Alert.alert('Succès', 'Profil mis à jour avec succès', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Update error:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAccount = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('⚠️ ATTENTION - Fermeture de compte\n\nVous êtes sur le point de fermer définitivement votre compte.\n\n❌ Cette action est IRRÉVERSIBLE\n❌ Toutes vos données seront supprimées\n❌ Votre historique de commandes sera perdu\n❌ Vous ne pourrez pas récupérer votre compte\n\nÊtes-vous absolument certain(e) de vouloir continuer ?')) {
        if (window.confirm('🚨 DERNIÈRE CONFIRMATION\n\nCeci est votre dernière chance de changer d\'avis.\n\nVotre compte et toutes vos données seront DÉFINITIVEMENT SUPPRIMÉS.\n\nVoulez-vous vraiment fermer votre compte ?')) {
          try {
            if (!user) return;

            await supabase.from('user_profiles').update({ status: 'closed' }).eq('id', user.id);

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
        'Vous êtes sur le point de fermer définitivement votre compte.\n\n❌ Cette action est IRRÉVERSIBLE\n❌ Toutes vos données seront supprimées\n❌ Votre historique de commandes sera perdu\n❌ Vous ne pourrez pas récupérer votre compte\n\nÊtes-vous absolument certain(e) de vouloir continuer ?',
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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Votre nom"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Votre prénom"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={phone}
                editable={false}
                placeholder="Numéro de téléphone"
              />
            </View>
            <Text style={styles.hint}>Le numéro de téléphone ne peut pas être modifié</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>WhatsApp</Text>
            <View style={styles.inputContainer}>
              <MessageCircle size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                placeholder="Numéro WhatsApp"
                keyboardType="phone-pad"
                editable={!loading}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Localisation GPS</Text>

          <View style={[styles.gpsToggleCard, !gpsEnabled && styles.gpsToggleCardDisabled]}>
            <View style={styles.gpsToggleHeader}>
              <View style={styles.gpsToggleLeft}>
                <View style={[styles.gpsIconContainer, !gpsEnabled && styles.gpsIconContainerDisabled]}>
                  <Navigation size={24} color={gpsEnabled ? '#fff' : '#999'} />
                </View>
                <View style={styles.gpsToggleTextContainer}>
                  <Text style={styles.gpsToggleTitle}>Partage de localisation</Text>
                  <Text style={styles.gpsToggleSubtitle}>
                    {gpsEnabled ? 'GPS activé' : 'GPS désactivé'}
                  </Text>
                </View>
              </View>
              <Switch
                value={gpsEnabled}
                onValueChange={setGpsEnabled}
                trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                thumbColor={gpsEnabled ? '#2563eb' : '#f3f4f6'}
              />
            </View>

            {!gpsEnabled && (
              <View style={styles.warningBanner}>
                <AlertTriangle size={20} color="#dc2626" />
                <View style={styles.warningTextContainer}>
                  <Text style={styles.warningTitle}>Attention - GPS désactivé</Text>
                  <Text style={styles.warningText}>
                    Sans GPS activé, les livreurs ne pourront pas localiser votre adresse et vous ne pourrez pas recevoir vos commandes.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quartier</Text>
            <View style={styles.inputContainer}>
              <MapPin size={20} color="#2563eb" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={neighborhood}
                onChangeText={setNeighborhood}
                placeholder="Votre quartier"
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse complète</Text>
            <TextInput
              style={styles.textArea}
              value={fullAddress}
              onChangeText={setFullAddress}
              placeholder="Votre adresse complète"
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.gpsSection}>
            <TouchableOpacity
              style={[styles.gpsButton, locationLoading && styles.gpsButtonDisabled]}
              onPress={getCurrentLocation}
              disabled={locationLoading || loading}
            >
              <MapPin size={20} color="#fff" />
              <Text style={styles.gpsButtonText}>
                {locationLoading ? 'Capture en cours...' : 'Capturer ma position GPS'}
              </Text>
            </TouchableOpacity>

            {latitude && longitude && (
              <TouchableOpacity style={styles.viewMapButton} onPress={openMap}>
                <MapPin size={16} color="#2563eb" />
                <Text style={styles.viewMapText}>Voir sur la carte</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Save size={20} color="#fff" />
          <Text style={styles.saveButtonText}>
            {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Text>
        </TouchableOpacity>

        <View style={styles.dangerZone}>
          <Text style={styles.dangerZoneTitle}>Zone dangereuse</Text>
          <Text style={styles.dangerZoneDescription}>
            La suppression de votre compte est irréversible. Toutes vos données seront définitivement perdues.
          </Text>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleCloseAccount}
            disabled={loading}
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputDisabled: {
    color: '#999',
  },
  textArea: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  gpsSection: {
    gap: 12,
  },
  gpsButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gpsButtonDisabled: {
    opacity: 0.5,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  viewMapText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gpsToggleCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  gpsToggleCardDisabled: {
    backgroundColor: '#fef2f2',
    borderColor: '#f87171',
  },
  gpsToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gpsToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  gpsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsIconContainerDisabled: {
    backgroundColor: '#e5e7eb',
  },
  gpsToggleTextContainer: {
    flex: 1,
  },
  gpsToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  gpsToggleSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  warningBanner: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
    flexDirection: 'row',
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 18,
  },
  dangerZone: {
    marginTop: 32,
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
