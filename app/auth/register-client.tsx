import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, MapPin, CheckCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import { ARRONDISSEMENTS } from '@/lib/neighborhoods';
import { TermsModal } from '@/components/TermsModal';

export default function RegisterClientScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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

                if (data.address.suburb && !neighborhood) {
                  const allNeighborhoods = ARRONDISSEMENTS.flatMap(arr => arr.neighborhoods);
                  const matchedNeighborhood = allNeighborhoods.find(
                    n => n.toLowerCase() === data.address.suburb?.toLowerCase()
                  );
                  if (matchedNeighborhood) {
                    setNeighborhood(matchedNeighborhood);
                  }
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
          Alert.alert('Permission refusée', 'Nous avons besoin de votre permission pour accéder à votre position.');
          setLocationLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setLatitude(location.coords.latitude);
        setLongitude(location.coords.longitude);

        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode.length > 0) {
          const addr = geocode[0];
          const addressParts = [];

          if (addr.country) addressParts.push(addr.country);
          if (addr.city) addressParts.push(`[${addr.city}]`);
          if (addr.street || addr.district) {
            addressParts.push(addr.street || addr.district);
          }

          const generatedAddress = addressParts.join(' / ');
          if (generatedAddress) {
            setFullAddress(generatedAddress);
          }

          if (addr.district && !neighborhood) {
            const allNeighborhoods = ARRONDISSEMENTS.flatMap(arr => arr.neighborhoods);
            const matchedNeighborhood = allNeighborhoods.find(
              n => n.toLowerCase() === addr.district?.toLowerCase()
            );
            if (matchedNeighborhood) {
              setNeighborhood(matchedNeighborhood);
            }
          }
        }

        Alert.alert('Succès', 'Position GPS capturée avec succès!');
        setLocationLoading(false);
      }
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible de récupérer votre position: ' + error.message);
      setLocationLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }

    if (!lastName.trim()) {
      Alert.alert('Erreur', 'Le prénom est obligatoire');
      return;
    }

    if (!neighborhood) {
      Alert.alert('Erreur', 'Veuillez sélectionner un quartier');
      return;
    }

    if (!fullAddress.trim()) {
      Alert.alert('Erreur', "L'adresse complète est obligatoire");
      return;
    }

    if (!whatsappNumber.trim()) {
      Alert.alert('Erreur', 'Le numéro WhatsApp est obligatoire');
      return;
    }

    if (!latitude || !longitude) {
      Alert.alert('Erreur', 'Veuillez capturer votre position GPS en cliquant sur le bouton GPS');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Erreur', 'Vous devez accepter les CGU');
      return;
    }

    if (!user || !user.id) {
      Alert.alert('Erreur', 'Session utilisateur invalide. Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    try {
      const phoneNumber = user.phone || (user.user_metadata?.phone as string) || whatsappNumber.trim();

      console.log('Registering client with data:', {
        id: user.id,
        user_type: 'client',
        phone: phoneNumber,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        whatsapp_number: whatsappNumber.trim(),
        neighborhood,
        full_address: fullAddress.trim(),
        latitude,
        longitude,
        status: 'active',
      });

      const { data, error } = await supabase.from('user_profiles').insert({
        id: user.id,
        user_type: 'client',
        phone: phoneNumber,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        whatsapp_number: whatsappNumber.trim(),
        neighborhood,
        full_address: fullAddress.trim(),
        latitude,
        longitude,
        status: 'active',
      }).select();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      console.log('Profile created successfully:', data);

      await refreshProfile();
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessModalClose = async () => {
    setShowSuccessModal(false);
    try {
      await refreshProfile();
      await new Promise(resolve => setTimeout(resolve, 500));
      router.replace('/(client)/(tabs)');
    } catch (error) {
      console.error('Error during final navigation:', error);
      Alert.alert('Info', 'Veuillez vous reconnecter pour accéder à votre compte', [
        { text: 'OK', onPress: () => router.replace('/onboarding') }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#000" />
      </TouchableOpacity>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Créer mon compte Client</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom"
              value={firstName}
              onChangeText={(text) => setFirstName(text.toUpperCase())}
              editable={!loading}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom *</Text>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              value={lastName}
              onChangeText={(text) => setLastName(text.toUpperCase())}
              editable={!loading}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro WhatsApp *</Text>
            <TextInput
              style={styles.input}
              placeholder="+226 XX XX XX XX"
              keyboardType="phone-pad"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              editable={!loading}
            />
          </View>

          <View style={styles.gpsSection}>
            <View style={styles.gpsHeader}>
              <Text style={styles.label}>Position GPS *</Text>
              <TouchableOpacity
                style={[styles.gpsButton, locationLoading && styles.gpsButtonDisabled]}
                onPress={getCurrentLocation}
                disabled={locationLoading || loading}
              >
                <MapPin size={20} color="#fff" />
                <Text style={styles.gpsButtonText}>
                  {locationLoading ? 'Chargement...' : 'Utiliser ma position'}
                </Text>
              </TouchableOpacity>
            </View>
            {latitude && longitude && (
              <Text style={styles.gpsCoords}>
                ✓ Position Actuelle Capturée ({longitude.toFixed(6)}, {latitude.toFixed(6)})
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quartier *</Text>
            <TextInput
              style={styles.input}
              placeholder="Commencer à taper pour chercher..."
              value={neighborhoodSearch || neighborhood}
              onChangeText={(text) => {
                setNeighborhoodSearch(text);
                setShowNeighborhoodPicker(text.length > 0);
                if (text === '') {
                  setNeighborhood('');
                }
              }}
              onFocus={() => {
                if (neighborhoodSearch || neighborhood) {
                  setShowNeighborhoodPicker(true);
                }
              }}
              editable={!loading}
            />
            {showNeighborhoodPicker && (
              <ScrollView style={styles.pickerList}>
                {ARRONDISSEMENTS.map((arr) => {
                  const filteredNeighborhoods = arr.neighborhoods.filter((n) =>
                    n.toLowerCase().includes((neighborhoodSearch || neighborhood).toLowerCase())
                  );

                  if (filteredNeighborhoods.length === 0) return null;

                  return (
                    <View key={arr.id}>
                      <View style={styles.arrondissementHeader}>
                        <Text style={styles.arrondissementTitle}>{arr.name}</Text>
                      </View>
                      {filteredNeighborhoods.map((n) => (
                        <TouchableOpacity
                          key={`${arr.id}-${n}`}
                          style={styles.pickerItem}
                          onPress={() => {
                            setNeighborhood(n);
                            setNeighborhoodSearch('');
                            setShowNeighborhoodPicker(false);
                          }}
                        >
                          <Text style={styles.pickerItemText}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresse complète *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Pays / Ville / Lieu populaire proche"
              value={fullAddress}
              onChangeText={setFullAddress}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>J'accepte les CGU</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
              <Text style={styles.readCGU}>Lire les CGU</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Création...' : 'Créer mon compte'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <CheckCircle size={64} color="#5cb85c" />
            </View>
            <Text style={styles.modalTitle}>Bienvenue sur ORDERS App 👋</Text>
            <Text style={styles.modalMessage}>
              Votre compte client a été créé avec succès. Vous pouvez maintenant commander chez vos commerces préférés.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSuccessModalClose}
            >
              <Text style={styles.modalButtonText}>Retour à l'accueil</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        userType="client"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    marginTop: 100,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  gpsSection: {
    gap: 8,
  },
  gpsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsButtonDisabled: {
    opacity: 0.5,
  },
  gpsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  gpsCoords: {
    fontSize: 12,
    color: '#5cb85c',
    marginTop: 4,
  },
  pickerButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  pickerText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  pickerList: {
    maxHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  arrondissementHeader: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  arrondissementTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  pickerItem: {
    padding: 16,
    paddingLeft: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  termsContainer: {
    marginTop: 8,
    gap: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#666',
  },
  readCGU: {
    fontSize: 14,
    color: '#2563eb',
    textDecorationLine: 'underline',
    marginLeft: 36,
  },
  button: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
    flexWrap: 'nowrap',
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
