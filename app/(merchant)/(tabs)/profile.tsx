import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Store, MapPin, LogOut, Phone, Clock, Camera, Upload, X, User, Wallet, Edit2, Check, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import WorkingHoursEditor from '@/components/WorkingHoursEditor';
import AppFooter from '@/components/AppFooter';

interface MerchantInfo {
  id: string;
  shop_name: string;
  address: string;
  neighborhood: string;
  description: string;
  verification_status: string;
  is_open: boolean;
  category_name?: string;
  category_icon?: string;
  latitude: string;
  longitude: string;
  shop_photo_url: string | null;
  opening_hours: any;
  orange_money_number: string | null;
  orange_money_name: string | null;
}

interface MerchantPhoto {
  id: string;
  merchant_id: string;
  photo_url: string;
  display_order: number;
  created_at: string;
}

export default function MerchantProfileScreen() {
  const { profile, user, signOut, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo | null>(null);
  const [merchantPhotos, setMerchantPhotos] = useState<MerchantPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState('');
  const [orangeMoneyName, setOrangeMoneyName] = useState('');

  useEffect(() => {
    if (!authLoading && user?.id) {
      loadMerchantInfo();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  const loadMerchantInfo = async () => {
    if (!user?.id) {
      console.log('No user ID found in profile');
      setLoading(false);
      return;
    }

    console.log('Loading merchant info for user:', user.id);

    try {
      const { data, error } = await supabase
        .from('merchants')
        .select(`
          id,
          shop_name,
          address,
          neighborhood,
          description,
          verification_status,
          is_open,
          category_id,
          latitude,
          longitude,
          shop_photo_url,
          opening_hours
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading merchant info:', error);
        setLoading(false);
        return;
      }

      console.log('Merchant info data:', data);

      if (data) {
        let categoryName = undefined;
        let categoryIcon = undefined;

        if (data.category_id) {
          const { data: categoryData } = await supabase
            .from('categories')
            .select('name_fr, icon')
            .eq('id', data.category_id)
            .maybeSingle();

          categoryName = categoryData?.name_fr;
          categoryIcon = categoryData?.icon;
        }

        setMerchantInfo({
          id: data.id,
          shop_name: data.shop_name,
          address: data.address,
          neighborhood: data.neighborhood,
          description: data.description,
          verification_status: data.verification_status,
          is_open: data.is_open,
          category_name: categoryName,
          category_icon: categoryIcon,
          latitude: data.latitude,
          longitude: data.longitude,
          shop_photo_url: data.shop_photo_url,
          opening_hours: data.opening_hours || {},
          orange_money_number: data.orange_money_number || null,
          orange_money_name: data.orange_money_name || null,
        });
        setOrangeMoneyNumber(data.orange_money_number || '');
        setOrangeMoneyName(data.orange_money_name || '');

        await loadMerchantPhotos(data.id);
      } else {
        console.log('No merchant info found');
      }
    } catch (error) {
      console.error('Error loading merchant info:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMerchantPhotos = async (merchantId: string) => {
    try {
      const { data, error } = await supabase
        .from('merchant_photos')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('display_order');

      if (error) throw error;
      setMerchantPhotos(data || []);
    } catch (error) {
      console.error('Error loading merchant photos:', error);
    }
  };


  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Voulez-vous vous déconnecter ?')) {
        console.log('[MerchantProfile] Starting sign out');
        await signOut();
        console.log('[MerchantProfile] Sign out complete');
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
              console.log('[MerchantProfile] Starting sign out');
              await signOut();
              console.log('[MerchantProfile] Sign out complete');
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
      console.log('Starting profile upload for URI:', uri);

      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = blob.type.split('/')[1] || 'jpg';
      const fileName = `${user.id}/profile_${Date.now()}.${fileExt}`;
      const contentType = blob.type || 'image/jpeg';

      console.log('Profile file info:', { fileName, contentType, size: blob.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('merchant-photos')
        .upload(fileName, blob, {
          contentType: contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Profile upload error:', uploadError);
        throw uploadError;
      }

      console.log('Profile upload successful:', uploadData);

      const { data: publicUrlData } = supabase.storage
        .from('merchant-photos')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;
      console.log('Profile public URL:', publicUrl);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ profile_photo_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      console.log('Profile updated successfully');
      await refreshProfile();
      Alert.alert('Succès', 'Photo de profil mise à jour');
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Erreur', error.message || 'Impossible de télécharger la photo');
    } finally {
      setUploadingProfile(false);
    }
  };

  const pickShopImage = async () => {
    if (!merchantInfo) {
      Alert.alert('Erreur', 'Informations boutique non disponibles');
      return;
    }

    if (merchantPhotos.length >= 5) {
      Alert.alert('Limite atteinte', 'Vous pouvez ajouter un maximum de 5 photos');
      return;
    }

    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadShopImage(result.assets[0].uri);
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
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadShopImage(result.assets[0].uri);
      }
    }
  };

  const uploadShopImage = async (uri: string) => {
    if (!merchantInfo || !user?.id) return;

    setUploading(true);
    try {
      console.log('Starting upload for URI:', uri);

      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = blob.type.split('/')[1] || 'jpg';
      const fileName = `${user.id}/shop_${Date.now()}.${fileExt}`;
      const contentType = blob.type || 'image/jpeg';

      console.log('File info:', { fileName, contentType, size: blob.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('merchant-photos')
        .upload(fileName, blob, {
          contentType: contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      const { data: publicUrlData } = supabase.storage
        .from('merchant-photos')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;
      console.log('Public URL:', publicUrl);

      const { error: insertError } = await supabase
        .from('merchant_photos')
        .insert({
          merchant_id: merchantInfo.id,
          photo_url: publicUrl,
          display_order: merchantPhotos.length,
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Photo record created successfully');
      await loadMerchantPhotos(merchantInfo.id);
      Alert.alert('Succès', 'Photo ajoutée');
    } catch (error: any) {
      console.error('Error uploading shop image:', error);
      Alert.alert('Erreur', error.message || 'Impossible de télécharger la photo');
    } finally {
      setUploading(false);
    }
  };

  const deleteShopPhoto = async (photoId: string, photoUrl: string) => {
    if (!merchantInfo) {
      console.error('[DELETE PHOTO] No merchant info available');
      return;
    }

    console.log('[DELETE PHOTO] Starting deletion');
    console.log('[DELETE PHOTO] Photo ID:', photoId);
    console.log('[DELETE PHOTO] Photo URL:', photoUrl);
    console.log('[DELETE PHOTO] User ID:', user?.id);

    try {
      const fileName = photoUrl.split('/').pop();
      console.log('[DELETE PHOTO] Extracted filename:', fileName);

      if (fileName) {
        const filePath = `${user?.id}/${fileName}`;
        console.log('[DELETE PHOTO] Constructed file path:', filePath);

        const { data: storageData, error: storageError } = await supabase.storage
          .from('merchant-photos')
          .remove([filePath]);

        if (storageError) {
          console.error('[DELETE PHOTO] Storage deletion error:', storageError);
          throw new Error(`Erreur de stockage: ${storageError.message}`);
        }
        console.log('[DELETE PHOTO] Storage deletion result:', storageData);
      }

      console.log('[DELETE PHOTO] Deleting database record');
      const { error } = await supabase
        .from('merchant_photos')
        .delete()
        .eq('id', photoId);

      if (error) {
        console.error('[DELETE PHOTO] Database deletion error:', error);
        throw error;
      }

      console.log('[DELETE PHOTO] Database record deleted successfully');
      await loadMerchantPhotos(merchantInfo.id);

      if (Platform.OS === 'web') {
        window.alert('Photo supprimée avec succès');
      } else {
        Alert.alert('Succès', 'Photo supprimée avec succès');
      }
    } catch (error: any) {
      console.error('[DELETE PHOTO] Error in deleteShopPhoto:', error);
      const errorMessage = error.message || 'Erreur inconnue';
      if (Platform.OS === 'web') {
        window.alert(`Impossible de supprimer la photo: ${errorMessage}`);
      } else {
        Alert.alert('Erreur', `Impossible de supprimer la photo: ${errorMessage}`);
      }
    }
  };

  const handleSaveWorkingHours = async (hours: any) => {
    if (!merchantInfo) return;

    try {
      const { error } = await supabase
        .from('merchants')
        .update({ opening_hours: hours })
        .eq('id', merchantInfo.id);

      if (error) throw error;

      setMerchantInfo({ ...merchantInfo, opening_hours: hours });
    } catch (error) {
      console.error('Error saving working hours:', error);
      throw error;
    }
  };

  const handleSavePaymentDetails = async () => {
    if (!merchantInfo) return;

    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          orange_money_number: orangeMoneyNumber || null,
          orange_money_name: orangeMoneyName || null,
        })
        .eq('id', merchantInfo.id);

      if (error) throw error;

      setMerchantInfo({
        ...merchantInfo,
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
        <Text style={styles.title}>Mon Profil Commerçant</Text>
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
                onError={(e) => console.error('Profile image load error:', e.nativeEvent.error)}
                onLoad={() => console.log('Profile image loaded:', profile.profile_photo_url)}
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
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {merchantInfo?.shop_name || `${profile?.first_name} ${profile?.last_name}`}
          </Text>
          {merchantInfo?.shop_name && profile?.first_name && profile?.last_name && (
            <Text style={styles.ownerName}>
              Propriétaire: {profile.first_name} {profile.last_name}
            </Text>
          )}
          <Text style={styles.phone}>{profile?.phone}</Text>
          {merchantInfo && (
            <View style={[styles.statusBadge, {
              backgroundColor: merchantInfo.verification_status === 'verified' ? '#4caf50' :
                              merchantInfo.verification_status === 'rejected' ? '#f44336' : '#ff9800'
            }]}>
              <Text style={styles.statusText}>
                {merchantInfo.verification_status === 'verified' ? 'Commerçant vérifié' :
                 merchantInfo.verification_status === 'rejected' ? 'Rejeté' : 'En attente de validation'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Photos de la boutique</Text>
            <Text style={styles.photoCount}>{merchantPhotos.length}/6</Text>
          </View>
          {loading ? (
            <Text style={styles.comingSoon}>Chargement...</Text>
          ) : !merchantInfo ? (
            <Text style={styles.comingSoon}>
              Les informations de votre boutique apparaîtront ici une fois votre compte validé.
            </Text>
          ) : (
            <View style={styles.photoSection}>
              {merchantPhotos.length === 0 ? (
                <View style={styles.noPhotoContainer}>
                  <View style={styles.noPhotoIcon}>
                    {merchantInfo.category_name === 'Boulangéries' ? (
                      <Image
                        source={require('@/assets/images/bread-25206_1920.png')}
                        style={styles.noPhotoIconImage}
                        resizeMode="contain"
                      />
                    ) : merchantInfo.category_name === 'Restaurants' ? (
                      <Image
                        source={require('@/assets/images/pasta-576417.png')}
                        style={styles.noPhotoIconImage}
                        resizeMode="contain"
                      />
                    ) : merchantInfo.category_name === 'Pharmacies' ? (
                      <Image
                        source={require('@/assets/images/apothecary-159037.png')}
                        style={styles.noPhotoIconImage}
                        resizeMode="contain"
                      />
                    ) : merchantInfo.category_name === 'Cliniques à Domicile' ? (
                      <Image
                        source={require('@/assets/images/stethoscope-icon-2316460.png')}
                        style={styles.noPhotoIconImage}
                        resizeMode="contain"
                      />
                    ) : merchantInfo.category_name === 'Garages Autos' ? (
                      <Image
                        source={require('@/assets/images/tow-truck-2901948_1920.png')}
                        style={styles.noPhotoIconImage}
                        resizeMode="contain"
                      />
                    ) : merchantInfo.category_name === 'Garages Motos' ? (
                      <Image
                        source={require('@/assets/images/vespa_moto.png')}
                        style={styles.noPhotoIconImage}
                        resizeMode="contain"
                      />
                    ) : merchantInfo.category_name === 'Plombiers' ? (
                      <Image
                        source={require('@/assets/images/plunger-7226993_1920.png')}
                        style={styles.noPhotoIconImage}
                        resizeMode="contain"
                      />
                    ) : merchantInfo.category_name === 'Electriciens' ? (
                      <Image
                        source={require('@/assets/images/bulb-310821_1920.png')}
                        style={styles.noPhotoIconImage}
                        resizeMode="contain"
                      />
                    ) : merchantInfo.category_name === 'Alimentations' ? (
                      <Text style={styles.noPhotoIconEmoji}>🛒</Text>
                    ) : merchantInfo.category_name === 'TAXI' ? (
                      <Text style={styles.noPhotoIconEmoji}>🚕</Text>
                    ) : merchantInfo.category_icon ? (
                      <Text style={styles.noPhotoIconEmoji}>{merchantInfo.category_icon}</Text>
                    ) : (
                      <Store size={48} color="#ccc" />
                    )}
                  </View>
                  <Text style={styles.noPhotoText}>Aucune photo de boutique</Text>
                  <Text style={styles.noPhotoSubtext}>
                    Ajoutez jusqu'à 6 photos de votre boutique pour attirer plus de clients
                  </Text>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={pickShopImage}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Upload size={20} color="#fff" />
                        <Text style={styles.uploadButtonText}>Ajouter une photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <View style={styles.mandatoryBadge}>
                    <Text style={styles.mandatoryText}>OBLIGATOIRE</Text>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.photosGrid}>
                    {merchantPhotos.map((photo) => (
                      <View key={photo.id} style={styles.photoCard}>
                        <Image
                          source={{ uri: photo.photo_url }}
                          style={styles.shopPhotoImage}
                          resizeMode="cover"
                          onError={(e) => console.error('Image load error:', e.nativeEvent.error)}
                          onLoad={() => console.log('Image loaded:', photo.photo_url)}
                        />
                        <TouchableOpacity
                          style={styles.deletePhotoButton}
                          onPress={() => {
                            if (Platform.OS === 'web') {
                              if (window.confirm('Voulez-vous supprimer cette photo ?')) {
                                deleteShopPhoto(photo.id, photo.photo_url);
                              }
                            } else {
                              Alert.alert(
                                'Supprimer',
                                'Voulez-vous supprimer cette photo ?',
                                [
                                  { text: 'Annuler', style: 'cancel' },
                                  {
                                    text: 'Supprimer',
                                    style: 'destructive',
                                    onPress: () => deleteShopPhoto(photo.id, photo.photo_url),
                                  },
                                ]
                              );
                            }
                          }}
                        >
                          <X size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {merchantPhotos.length < 6 && (
                      <TouchableOpacity
                        style={styles.addPhotoCard}
                        onPress={pickShopImage}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <ActivityIndicator color="#2563eb" size="small" />
                        ) : (
                          <>
                            <Upload size={32} color="#2563eb" />
                            <Text style={styles.addPhotoText}>Ajouter</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations boutique</Text>
          {loading ? (
            <Text style={styles.comingSoon}>Chargement...</Text>
          ) : !merchantInfo ? (
            <Text style={styles.comingSoon}>
              Les informations de votre boutique apparaîtront ici une fois votre compte validé.
            </Text>
          ) : (
            <View style={styles.infoContainer}>
              {merchantInfo.category_name && (
                <View style={styles.infoRow}>
                  <Store size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Catégorie</Text>
                    <Text style={styles.infoValue}>{merchantInfo.category_name}</Text>
                  </View>
                </View>
              )}

              <View style={styles.infoRow}>
                <MapPin size={20} color="#2563eb" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Adresse</Text>
                  <Text style={styles.infoValue}>{merchantInfo.address}</Text>
                  <Text style={styles.infoSubValue}>Quartier: {merchantInfo.neighborhood}</Text>
                  {merchantInfo.latitude && merchantInfo.longitude && (
                    <Text style={styles.infoSubValue}>
                      GPS: {parseFloat(merchantInfo.longitude).toFixed(6)}, {parseFloat(merchantInfo.latitude).toFixed(6)}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.infoRow}>
                <Phone size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Téléphone</Text>
                  <Text style={styles.infoValue}>{profile?.phone}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Clock size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Statut</Text>
                  <Text style={[styles.infoValue, { color: merchantInfo.is_open ? '#4caf50' : '#f44336' }]}>
                    {merchantInfo.is_open ? 'Ouvert' : 'Fermé'}
                  </Text>
                </View>
              </View>

              <WorkingHoursEditor
                workingHours={merchantInfo.opening_hours}
                onSave={handleSaveWorkingHours}
              />

              {merchantInfo.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={styles.descriptionText}>{merchantInfo.description}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {merchantInfo && (
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
                        setOrangeMoneyNumber(merchantInfo.orange_money_number || '');
                        setOrangeMoneyName(merchantInfo.orange_money_name || '');
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
                  {merchantInfo.orange_money_number ? (
                    <>
                      <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentLabel}>Titulaire</Text>
                        <Text style={styles.paymentValue}>{merchantInfo.orange_money_name || 'Non renseigné'}</Text>
                      </View>
                      <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentLabel}>Numéro</Text>
                        <Text style={styles.paymentValue}>{merchantInfo.orange_money_number}</Text>
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
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(merchant)/settings')}
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
  ownerName: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  photoCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
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
  descriptionContainer: {
    paddingTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 4,
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
  photoSection: {
    marginBottom: 0,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: '48%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  shopPhotoImage: {
    width: '100%',
    height: '100%',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoCard: {
    width: '48%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  noPhotoContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  noPhotoIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noPhotoIconImage: {
    width: 64,
    height: 64,
  },
  noPhotoIconEmoji: {
    fontSize: 48,
  },
  noPhotoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  noPhotoSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 180,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mandatoryBadge: {
    marginTop: 16,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  mandatoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
    letterSpacing: 0.5,
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
});
