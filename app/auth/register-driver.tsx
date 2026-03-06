import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Image, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Camera, Upload, CheckCircle } from 'lucide-react-native';
import { ARRONDISSEMENTS } from '@/lib/neighborhoods';
import { TermsModal } from '@/components/TermsModal';

const VEHICLE_TYPES = [
  'Moto',
  'Voiture',
  'Vélo',
  'Scooter',
];

export default function RegisterDriverScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [deliveryZones, setDeliveryZones] = useState<string[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState(user?.phone || '');
  const [identityPhotoUri, setIdentityPhotoUri] = useState<string | null>(null);
  const [idCardFrontUri, setIdCardFrontUri] = useState<string | null>(null);
  const [idCardBackUri, setIdCardBackUri] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');

  const toggleZone = (zone: string) => {
    if (deliveryZones.includes(zone)) {
      setDeliveryZones(deliveryZones.filter(z => z !== zone));
    } else {
      setDeliveryZones([...deliveryZones, zone]);
    }
  };

  const allNeighborhoods = ARRONDISSEMENTS.flatMap(arr => arr.neighborhoods);

  const filteredArrondissements = ARRONDISSEMENTS.map(arr => ({
    ...arr,
    neighborhoods: arr.neighborhoods.filter(zone =>
      zone.toLowerCase().includes(zoneSearchQuery.toLowerCase())
    )
  })).filter(arr => arr.neighborhoods.length > 0);

  const handlePhotoSelect = (photoType: 'identity' | 'id_front' | 'id_back') => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            if (photoType === 'identity') {
              setIdentityPhotoUri(result);
            } else if (photoType === 'id_front') {
              setIdCardFrontUri(result);
            } else if (photoType === 'id_back') {
              setIdCardBackUri(result);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert(
        'Choisir une photo',
        'Sélectionnez une source',
        [
          {
            text: 'Annuler',
            style: 'cancel',
          },
          {
            text: 'Galerie',
            onPress: () => {
              Alert.alert('Info', 'La sélection depuis la galerie sera disponible prochainement');
            },
          },
          {
            text: 'Caméra',
            onPress: () => {
              Alert.alert('Info', 'La capture par caméra sera disponible prochainement');
            },
          },
        ]
      );
    }
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erreur', 'Le nom et prénom sont obligatoires');
      return;
    }

    if (!vehicleType) {
      Alert.alert('Erreur', 'Veuillez sélectionner un type de véhicule');
      return;
    }

    if (deliveryZones.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une zone de livraison');
      return;
    }

    if (!identityPhotoUri) {
      Alert.alert('Erreur', 'La photo d\'identité est obligatoire');
      return;
    }

    if (!idCardFrontUri || !idCardBackUri) {
      Alert.alert('Erreur', 'Les photos de la carte d\'identité (recto et verso) sont obligatoires');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Erreur', 'Vous devez accepter les CGU Livreur');
      return;
    }

    setLoading(true);
    try {
      const phoneNumber = user!.phone || (user!.user_metadata?.phone as string) || whatsappNumber.trim();

      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: user!.id,
        user_type: 'driver',
        phone: phoneNumber,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        whatsapp_number: whatsappNumber.trim() || phoneNumber,
        status: 'pending',
      });

      if (profileError) throw profileError;

      const { error: driverError } = await supabase.from('drivers').insert({
        user_id: user!.id,
        vehicle_type: vehicleType,
        delivery_zones: deliveryZones,
        verification_status: 'pending',
        identity_photo_url: identityPhotoUri || '',
        id_card_front_url: idCardFrontUri || '',
        id_card_back_url: idCardBackUri || '',
      });

      if (driverError) throw driverError;

      await refreshProfile();

      setLoading(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Erreur', error.message);
      setLoading(false);
    }
  };

  const handleSuccessModalClose = async () => {
    setShowSuccessModal(false);
    try {
      await refreshProfile();
      await new Promise(resolve => setTimeout(resolve, 500));
      router.replace('/(driver)/(tabs)');
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
        <Text style={styles.title}>Créer mon compte Livreur</Text>

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
            <Text style={styles.label}>Type de véhicule *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowVehiclePicker(!showVehiclePicker)}
            >
              <Text style={vehicleType ? styles.pickerText : styles.pickerPlaceholder}>
                {vehicleType || 'Sélectionner un type de véhicule'}
              </Text>
            </TouchableOpacity>
            {showVehiclePicker && (
              <View style={styles.pickerList}>
                {VEHICLE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.pickerItem}
                    onPress={() => {
                      setVehicleType(type);
                      setShowVehiclePicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Zones de livraison * ({deliveryZones.length} sélectionnées)</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowZonePicker(!showZonePicker)}
            >
              <Text style={styles.pickerText}>
                {deliveryZones.length > 0
                  ? deliveryZones.join(', ')
                  : 'Sélectionner les zones'}
              </Text>
            </TouchableOpacity>
            {showZonePicker && (
              <View style={styles.pickerList}>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher une zone..."
                    value={zoneSearchQuery}
                    onChangeText={setZoneSearchQuery}
                    autoCapitalize="none"
                  />
                </View>
                <ScrollView style={styles.zoneScrollView}>
                  {filteredArrondissements.map((arr) => (
                    <View key={arr.id}>
                      <View style={styles.arrondissementHeader}>
                        <Text style={styles.arrondissementTitle}>{arr.name}</Text>
                      </View>
                      {arr.neighborhoods.map((zone) => (
                        <TouchableOpacity
                          key={`${arr.id}-${zone}`}
                          style={styles.pickerItem}
                          onPress={() => toggleZone(zone)}
                        >
                          <Text style={styles.pickerItemText}>{zone}</Text>
                          {deliveryZones.includes(zone) && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="+226 XX XX XX XX"
              keyboardType="phone-pad"
              value={whatsappNumber}
              onChangeText={setWhatsappNumber}
              editable={!loading}
            />
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.label}>Photo d'identité (visage) *</Text>
            <Text style={styles.helper}>
              Visage entier, photo claire. Ces informations sont uniquement
              utilisées pour vérifier votre identité.
            </Text>
            {identityPhotoUri ? (
              <View>
                <Image source={{ uri: identityPhotoUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={[styles.uploadButton, styles.changePhotoButton]}
                  onPress={() => handlePhotoSelect('identity')}
                >
                  <Upload size={20} color="#007AFF" />
                  <Text style={styles.changePhotoText}>Changer la photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={() => handlePhotoSelect('identity')}>
                <Camera size={24} color="#666" />
                <Text style={styles.uploadText}>Sélectionner une photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.label}>Carte d'identité (recto) *</Text>
            <Text style={styles.helper}>
              Photo du recto de votre carte d'identité
            </Text>
            {idCardFrontUri ? (
              <View>
                <Image source={{ uri: idCardFrontUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={[styles.uploadButton, styles.changePhotoButton]}
                  onPress={() => handlePhotoSelect('id_front')}
                >
                  <Upload size={20} color="#007AFF" />
                  <Text style={styles.changePhotoText}>Changer la photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={() => handlePhotoSelect('id_front')}>
                <Camera size={24} color="#666" />
                <Text style={styles.uploadText}>Sélectionner une photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.label}>Carte d'identité (verso) *</Text>
            <Text style={styles.helper}>
              Photo du verso de votre carte d'identité
            </Text>
            {idCardBackUri ? (
              <View>
                <Image source={{ uri: idCardBackUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={[styles.uploadButton, styles.changePhotoButton]}
                  onPress={() => handlePhotoSelect('id_back')}
                >
                  <Upload size={20} color="#007AFF" />
                  <Text style={styles.changePhotoText}>Changer la photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={() => handlePhotoSelect('id_back')}>
                <Camera size={24} color="#666" />
                <Text style={styles.uploadText}>Sélectionner une photo</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>J'accepte les CGU Livreur</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
              <Text style={styles.readCGU}>Lire les CGU Livreur</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Soumission...' : 'Soumettre pour validation'}
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
              Votre compte livreur a été soumis pour validation. Notre équipe examinera votre demande dans les 48 heures. Vous serez notifié une fois votre profil validé et vous pourrez alors accéder à toutes les fonctionnalités.
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
        userType="driver"
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
  helper: {
    fontSize: 12,
    color: '#666',
    marginTop: -4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  zoneScrollView: {
    maxHeight: 250,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  uploadSection: {
    gap: 8,
  },
  uploadButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  uploadText: {
    fontSize: 16,
    color: '#666',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  changePhotoButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
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
