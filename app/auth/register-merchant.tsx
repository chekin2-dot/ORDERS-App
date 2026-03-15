import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Image, ActivityIndicator, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Camera, MapPin, Upload, Store, CheckCircle, AlertCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import { ARRONDISSEMENTS } from '@/lib/neighborhoods';
import { TermsModal } from '@/components/TermsModal';

type Category = {
  id: string;
  name_fr: string;
};

export default function RegisterMerchantScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [shopName, setShopName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState(user?.phone || '');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [identityPhotoUri, setIdentityPhotoUri] = useState<string | null>(null);
  const [shopPhotoUri, setShopPhotoUri] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name_fr')
        .order('name_fr');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setGpsError(null);

    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          setGpsError('La géolocalisation n\'est pas supportée par votre navigateur.');
          setLocationLoading(false);
          return;
        }

        console.log('Requesting geolocation...');

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            console.log('Geolocation success:', position);
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            setLatitude(lat);
            setLongitude(lng);
            setGpsError(null);

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
                  setAddress(generatedAddress);
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

              setLocationLoading(false);
            } catch (error: any) {
              console.error('Address error:', error);
              setGpsError('Position capturée mais impossible de récupérer l\'adresse. Veuillez la saisir manuellement.');
              setLocationLoading(false);
            }
          },
          (error) => {
            console.error('GPS error:', error);
            let errorMessage = 'Impossible de récupérer votre position. Vous pouvez continuer sans GPS.';
            if (error.code === 1) {
              errorMessage = 'Permission refusée. Veuillez cliquer sur "Autoriser" dans la barre d\'adresse de votre navigateur pour permettre l\'accès à votre position.';
            } else if (error.code === 2) {
              errorMessage = 'Position non disponible. Assurez-vous que le GPS/localisation est activé sur votre appareil, ou continuez sans GPS.';
            } else if (error.code === 3) {
              errorMessage = 'Délai d\'attente dépassé. Le GPS prend trop de temps. Réessayez ou continuez sans GPS.';
            }
            setGpsError(errorMessage);
            setLocationLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 60000,
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
            setAddress(generatedAddress);
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

  const handlePhotoSelect = (type: 'identity' | 'shop') => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (type === 'identity') {
              setIdentityPhotoUri(event.target?.result as string);
            } else {
              setShopPhotoUri(event.target?.result as string);
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

  const uploadPhoto = async (uri: string, photoType: string): Promise<string | null> => {
    try {
      let arrayBuffer: ArrayBuffer;
      let fileExt = 'jpg';

      if (uri.startsWith('data:')) {
        const base64Data = uri.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;

        const mimeType = uri.split(';')[0].split(':')[1];
        fileExt = mimeType.split('/')[1] || 'jpg';
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();
        arrayBuffer = await blob.arrayBuffer();
        fileExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      }

      const fileName = `${user!.id}/${photoType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('merchant-photos')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('merchant-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${photoType} photo:`, error);
      return null;
    }
  };

  const handleRegister = async () => {
    console.log('=== handleRegister called ===');
    console.log('User object:', user);
    console.log('User ID:', user?.id);
    console.log('User authenticated:', !!user);
    setError(null);

    if (!user || !user.id) {
      setError('Session utilisateur invalide. Veuillez vous reconnecter.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError('Le nom et prénom sont obligatoires');
      return;
    }

    if (!shopName.trim()) {
      setError('Le nom de la boutique est obligatoire');
      return;
    }

    if (!categoryId) {
      setError('Veuillez sélectionner une catégorie');
      return;
    }

    if (!address.trim() || !neighborhood) {
      setError("L'adresse et le quartier sont obligatoires");
      return;
    }

    if (!identityPhotoUri) {
      setError('La photo d\'identité est obligatoire');
      return;
    }

    if (!shopPhotoUri) {
      setError('La photo de façade de votre boutique est obligatoire');
      return;
    }

    if (!acceptedTerms) {
      setError('Vous devez accepter les CGU Commerçant');
      return;
    }

    setLoading(true);
    console.log('Starting merchant registration...', {
      firstName,
      lastName,
      shopName,
      categoryId,
      address,
      neighborhood,
      hasGPS: !!(latitude && longitude),
      hasIdentityPhoto: !!identityPhotoUri,
      hasShopPhoto: !!shopPhotoUri,
      acceptedTerms,
    });

    try {
      const phoneNumber = user!.phone || (user!.user_metadata?.phone as string) || whatsappNumber.trim();
      console.log('Phone number:', phoneNumber);

      console.log('Uploading identity photo...');
      const identityPhotoUrl = await uploadPhoto(identityPhotoUri, 'identity');
      if (!identityPhotoUrl) {
        throw new Error('Impossible de télécharger la photo d\'identité');
      }
      console.log('Identity photo uploaded:', identityPhotoUrl);

      console.log('Uploading shop photo...');
      const shopPhotoUrl = await uploadPhoto(shopPhotoUri, 'shop');
      if (!shopPhotoUrl) {
        throw new Error('Impossible de télécharger la photo de façade');
      }
      console.log('Shop photo uploaded:', shopPhotoUrl);

      console.log('Creating user profile...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: user!.id,
          user_type: 'merchant',
          phone: phoneNumber,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          whatsapp_number: whatsappNumber.trim() || phoneNumber,
          status: 'pending',
        })
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        throw profileError;
      }
      console.log('User profile created successfully');

      console.log('Creating merchant record...');
      const { error: merchantError } = await supabase.from('merchants').insert({
        user_id: user!.id,
        shop_name: shopName.trim(),
        category_id: categoryId,
        address: address.trim(),
        neighborhood,
        latitude: latitude || null,
        longitude: longitude || null,
        shop_photo_url: shopPhotoUrl,
        identity_photo_url: identityPhotoUrl,
        verification_status: 'pending',
      });

      if (merchantError) {
        console.error('Merchant creation error:', merchantError);
        throw merchantError;
      }
      console.log('Merchant record created successfully');

      console.log('Refreshing profile...');
      await refreshProfile();
      console.log('Profile refreshed successfully');

      setLoading(false);
      setShowSuccessModal(true);
      console.log('Registration complete! Showing success modal.');
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription';

      if (error.code) {
        errorMessage += ` (Code: ${error.code})`;
      }

      if (error.details) {
        errorMessage += ` - Détails: ${error.details}`;
      }

      if (error.hint) {
        errorMessage += ` - ${error.hint}`;
      }

      console.log('Full error object:', JSON.stringify(error, null, 2));
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleSuccessModalClose = async () => {
    setShowSuccessModal(false);
    try {
      await refreshProfile();
      await new Promise(resolve => setTimeout(resolve, 500));
      router.replace('/(merchant)/(tabs)');
    } catch (error) {
      console.error('Error during final navigation:', error);
      Alert.alert('Info', 'Veuillez vous reconnecter pour accéder à votre compte', [
        { text: 'OK', onPress: () => router.replace('/onboarding') }
      ]);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ChevronLeft size={24} color="#000" />
      </TouchableOpacity>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Créer mon compte Commerçant</Text>

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={20} color="#dc2626" />
            <View style={styles.errorTextContainer}>
              <Text style={styles.errorTitle}>Erreur</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Création de votre compte en cours...</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Infos responsable</Text>
          </View>

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

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Infos boutique</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom de la boutique *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Pharmacie du Coin"
              value={shopName}
              onChangeText={(text) => setShopName(text.toUpperCase())}
              editable={!loading}
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Catégorie *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <Text style={selectedCategory ? styles.pickerText : styles.pickerPlaceholder}>
                {selectedCategory?.name_fr || 'Sélectionner une catégorie'}
              </Text>
            </TouchableOpacity>
            {showCategoryPicker && (
              <ScrollView style={styles.pickerList}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.pickerItem}
                    onPress={() => {
                      setCategoryId(cat.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{cat.name_fr}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.gpsSection}>
            <View style={styles.gpsHeader}>
              <View style={styles.gpsLabelContainer}>
                <Text style={styles.label}>Position GPS (recommandé)</Text>
                <Text style={styles.gpsHint}>Aide les clients à vous trouver facilement</Text>
              </View>
              <TouchableOpacity
                style={[styles.gpsButton, locationLoading && styles.gpsButtonDisabled]}
                onPress={getCurrentLocation}
                disabled={locationLoading || loading}
              >
                <MapPin size={20} color="#fff" />
                <Text style={styles.gpsButtonText}>
                  {locationLoading ? 'Chargement...' : 'Capturer position'}
                </Text>
              </TouchableOpacity>
            </View>
            {latitude && longitude && (
              <Text style={styles.gpsCoords}>
                ✓ Position Boutique Capturée ({longitude.toFixed(6)}, {latitude.toFixed(6)})
              </Text>
            )}
            {gpsError && (
              <View style={styles.gpsErrorBanner}>
                <AlertCircle size={16} color="#dc2626" />
                <Text style={styles.gpsErrorText}>{gpsError}</Text>
              </View>
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
            <Text style={styles.label}>Adresse *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Pays / Ville / Lieu populaire proche"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro WhatsApp professionnel</Text>
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
            <Text style={styles.label}>Photo de façade de votre boutique *</Text>
            <Text style={styles.uploadHint}>
              Cette photo sera visible par vos clients
            </Text>
            {shopPhotoUri ? (
              <View>
                <Image source={{ uri: shopPhotoUri }} style={styles.shopPhotoPreview} />
                <TouchableOpacity
                  style={[styles.uploadButton, styles.changePhotoButton]}
                  onPress={() => handlePhotoSelect('shop')}
                  disabled={loading}
                >
                  <Upload size={20} color="#007AFF" />
                  <Text style={styles.changePhotoText}>Changer la photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButtonPrimary}
                onPress={() => handlePhotoSelect('shop')}
                disabled={loading}
              >
                <Store size={24} color="#fff" />
                <Text style={styles.uploadTextPrimary}>Ajouter photo de façade</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.uploadSection}>
            <Text style={styles.label}>Photo d'identité *</Text>
            {identityPhotoUri ? (
              <View>
                <Image source={{ uri: identityPhotoUri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={[styles.uploadButton, styles.changePhotoButton]}
                  onPress={() => handlePhotoSelect('identity')}
                  disabled={loading}
                >
                  <Upload size={20} color="#007AFF" />
                  <Text style={styles.changePhotoText}>Changer la photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handlePhotoSelect('identity')}
                disabled={loading}
              >
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
              <Text style={styles.checkboxLabel}>J'accepte les CGU Commerçant</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTermsModal(true)}>
              <Text style={styles.readCGU}>Lire les CGU Commerçant</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => {
              console.log('Submit button clicked!');
              try {
                handleRegister().catch(err => {
                  console.error('Unhandled error in handleRegister:', err);
                  setError(err.message || 'Une erreur inattendue est survenue');
                  setLoading(false);
                });
              } catch (err: any) {
                console.error('Synchronous error in handleRegister:', err);
                setError(err.message || 'Une erreur inattendue est survenue');
                setLoading(false);
              }
            }}
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
              Votre compte commerçant a été soumis pour validation. Notre équipe examinera votre demande dans les 48 heures. Vous serez notifié une fois votre profil validé et vous pourrez alors accéder à toutes les fonctionnalités.
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
        userType="merchant"
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
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
    alignItems: 'flex-start',
    gap: 12,
  },
  gpsLabelContainer: {
    flex: 1,
    gap: 4,
  },
  gpsHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
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
  uploadSection: {
    gap: 8,
  },
  uploadHint: {
    fontSize: 13,
    color: '#999',
    marginTop: -4,
    marginBottom: 4,
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
  uploadButtonPrimary: {
    backgroundColor: '#2563eb',
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
  uploadTextPrimary: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  shopPhotoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 12,
    backgroundColor: '#e0e0e0',
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
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  errorTextContainer: {
    flex: 1,
    gap: 4,
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    lineHeight: 20,
  },
  loadingBanner: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  loadingText: {
    color: '#0369a1',
    fontSize: 14,
    fontWeight: '600',
  },
  gpsErrorBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  gpsErrorText: {
    color: '#dc2626',
    fontSize: 13,
    flex: 1,
  },
});
