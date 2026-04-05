import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, Alert, Modal, Image, ActivityIndicator, Platform } from 'react-native';
import { Search, X, Trash2, CreditCard as Edit3, Check, Bone as XIcon, Plus, Package, Clock, Camera, Image as ImageIcon, Video, Play } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

interface ProductCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  unit: string;
  default_price: number;
  typical_brands: string[];
  description: string;
}

interface MerchantProduct {
  id: string;
  merchant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  quantity: number | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  video_url?: string | null;
  updated_at: string;
}

export default function MerchantCatalogScreen() {
  const { user, loading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductCatalogItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [myProducts, setMyProducts] = useState<MerchantProduct[]>([]);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<MerchantProduct | null>(null);
  const [editedPrice, setEditedPrice] = useState('');
  const [editedName, setEditedName] = useState('');
  const [editedQuantity, setEditedQuantity] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editedExtraImages, setEditedExtraImages] = useState<(string | null)[]>([null, null, null]);
  const [editedVideo, setEditedVideo] = useState<string | null>(null);
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customProductName, setCustomProductName] = useState('');
  const [customProductDescription, setCustomProductDescription] = useState('');
  const [customProductPrice, setCustomProductPrice] = useState('');
  const [customProductCategory, setCustomProductCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [customProductImage, setCustomProductImage] = useState<string | null>(null);
  const [customProductVideo, setCustomProductVideo] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.id) {
      loadMerchantData();
      loadCategories();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user?.id, authLoading]);

  const loadCategories = async () => {
    try {
      // Predefined service categories
      const serviceCategories = [
        'Transport - Marchandise Tricycle',
        'Transport - Personne',
        'Dépannage - Electricité',
        'Dépannage - Plomberie',
        'Dépannage - Auto',
        'Dépannage - Moto',
        'Soins Médicaux',
      ];

      const { data, error } = await supabase
        .from('merchant_product_catalog')
        .select('category, subcategory')
        .order('category');

      if (error) throw error;

      const categories = new Set<string>(serviceCategories);
      data?.forEach(item => {
        categories.add(`${item.category} - ${item.subcategory}`);
      });

      setAvailableCategories(Array.from(categories).sort());
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadMerchantData = async () => {
    if (!user?.id) {
      console.log('No user ID found');
      setLoading(false);
      return;
    }

    console.log('Loading merchant data for user:', user.id);

    try {
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (merchantError) {
        console.error('Error loading merchant:', merchantError);
        setLoading(false);
        return;
      }

      console.log('Merchant data:', merchantData);

      if (merchantData) {
        setMerchantId(merchantData.id);
        await loadProducts(merchantData.id);
      } else {
        console.log('No merchant found for this user');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading merchant data:', error);
      setLoading(false);
    }
  };

  const loadProducts = async (merchantId: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);

    if (text.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const { data, error } = await supabase
      .from('merchant_product_catalog')
      .select('*')
      .or(`name.ilike.%${text}%,search_terms.ilike.%${text}%`)
      .limit(10);

    if (data && !error) {
      setSearchResults(data);
      setShowResults(true);
    }
  };

  const handleSelectProduct = async (product: ProductCatalogItem) => {
    if (!merchantId) {
      Alert.alert('Erreur', 'Impossible de trouver votre boutique');
      return;
    }

    const existingProduct = myProducts.find(p => p.name === product.name);
    if (existingProduct) {
      Alert.alert('Attention', 'Ce produit existe déjà dans votre catalogue');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          merchant_id: merchantId,
          name: product.name,
          description: product.description || '',
          price: product.default_price,
          category: `${product.category} - ${product.subcategory}`,
          is_available: true,
        })
        .select()
        .single();

      if (error) throw error;

      setMyProducts([data, ...myProducts]);
      setSearchQuery('');
      setSearchResults([]);
      setShowResults(false);
    } catch (error) {
      console.error('Error adding product:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      console.log('[DELETE] Starting product deletion for ID:', productId);

      const { data: orderItems, error: checkError } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      if (checkError) {
        console.error('[DELETE] Error checking order items:', checkError);
        throw checkError;
      }

      console.log('[DELETE] Order items found:', orderItems?.length || 0);

      if (orderItems && orderItems.length > 0) {
        if (Platform.OS === 'web') {
          if (window.confirm('Ce produit a déjà été commandé et ne peut pas être supprimé. Il sera marqué comme indisponible à la place.\n\nVoulez-vous continuer ?')) {
            try {
              const { error: updateError } = await supabase
                .from('products')
                .update({ is_available: false })
                .eq('id', productId);

              if (updateError) {
                console.error('[DELETE] Error marking unavailable:', updateError);
                throw updateError;
              }

              setMyProducts(myProducts.filter(p => p.id !== productId));
              window.alert('Le produit a été marqué comme indisponible');
            } catch (error: any) {
              console.error('[DELETE] Error in mark unavailable:', error);
              window.alert(`Impossible de modifier le produit: ${error.message || 'Erreur inconnue'}`);
            }
          }
        } else {
          Alert.alert(
            'Produit commandé',
            'Ce produit a déjà été commandé et ne peut pas être supprimé. Il sera marqué comme indisponible à la place.',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Marquer indisponible',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const { error: updateError } = await supabase
                      .from('products')
                      .update({ is_available: false })
                      .eq('id', productId);

                    if (updateError) {
                      console.error('[DELETE] Error marking unavailable:', updateError);
                      throw updateError;
                    }

                    setMyProducts(myProducts.filter(p => p.id !== productId));
                    Alert.alert('Succès', 'Le produit a été marqué comme indisponible');
                  } catch (error: any) {
                    console.error('[DELETE] Error in mark unavailable:', error);
                    Alert.alert('Erreur', `Impossible de modifier le produit: ${error.message || 'Erreur inconnue'}`);
                  }
                },
              },
            ]
          );
        }
      } else {
        console.log('[DELETE] No order items, proceeding with delete');
        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);

        if (deleteError) {
          console.error('[DELETE] Error deleting product:', deleteError);
          throw deleteError;
        }

        console.log('[DELETE] Product deleted successfully');
        setMyProducts(myProducts.filter(p => p.id !== productId));
        if (Platform.OS === 'web') {
          window.alert('Produit supprimé avec succès');
        } else {
          Alert.alert('Succès', 'Produit supprimé avec succès');
        }
      }
    } catch (error: any) {
      console.error('[DELETE] Error in handleDeleteProduct:', error);
      if (Platform.OS === 'web') {
        window.alert(`Impossible de supprimer le produit: ${error.message || 'Erreur inconnue'}`);
      } else {
        Alert.alert('Erreur', `Impossible de supprimer le produit: ${error.message || 'Erreur inconnue'}`);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleEditProduct = (product: MerchantProduct) => {
    setEditingProduct(product);
    setEditedPrice(product.price.toString());
    setEditedName(product.name);
    setEditedQuantity(product.quantity !== null ? product.quantity.toString() : '');
    setEditedDescription(product.description || '');
    setEditedImage(product.image_url || null);
    const extras = product.image_urls ?? [];
    setEditedExtraImages([
      extras[0] ?? null,
      extras[1] ?? null,
      extras[2] ?? null,
    ]);
    setEditedVideo(product.video_url || null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    const newPrice = parseFloat(editedPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert('Erreur', 'Le prix doit être un nombre positif');
      return;
    }

    if (!editedName.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide');
      return;
    }

    const newQuantity = editedQuantity.trim() === '' ? null : parseInt(editedQuantity);
    if (newQuantity !== null && (isNaN(newQuantity) || newQuantity < 0)) {
      Alert.alert('Erreur', 'La quantité doit être un nombre positif ou vide');
      return;
    }

    try {
      setUploadingEditImage(true);

      let imageUrl = editingProduct.image_url;

      if (editedImage && !editedImage.startsWith('http')) {
        imageUrl = await uploadProductImage(editedImage);
      } else if (editedImage === null) {
        imageUrl = null;
      }

      const uploadedExtras: string[] = [];
      for (let i = 0; i < editedExtraImages.length; i++) {
        const uri = editedExtraImages[i];
        if (uri && !uri.startsWith('http')) {
          const uploaded = await uploadProductImage(uri);
          if (uploaded) uploadedExtras.push(uploaded);
        } else if (uri && uri.startsWith('http')) {
          uploadedExtras.push(uri);
        }
      }

      let videoUrl = editingProduct.video_url ?? null;
      if (editedVideo && !editedVideo.startsWith('http')) {
        videoUrl = await uploadProductVideo(editedVideo);
      } else if (editedVideo === null) {
        videoUrl = null;
      }

      const { data, error } = await supabase
        .from('products')
        .update({
          price: newPrice,
          name: editedName.trim(),
          quantity: newQuantity,
          description: editedDescription.trim(),
          image_url: imageUrl,
          image_urls: uploadedExtras,
          video_url: videoUrl,
        })
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;

      setMyProducts(
        myProducts.map((p) =>
          p.id === editingProduct.id ? data : p
        )
      );

      setShowEditModal(false);
      setEditingProduct(null);
      setEditedImage(null);
      setEditedExtraImages([null, null, null]);
      setEditedVideo(null);
      setEditedDescription('');

      if (Platform.OS === 'web') {
        window.alert('Produit modifié avec succès');
      } else {
        Alert.alert('Succès', 'Produit modifié avec succès');
      }
    } catch (error: any) {
      console.error('Error updating product:', error);
      if (Platform.OS === 'web') {
        window.alert(`Impossible de modifier le produit: ${error.message || 'Erreur inconnue'}`);
      } else {
        Alert.alert('Erreur', `Impossible de modifier le produit: ${error.message || 'Erreur inconnue'}`);
      }
    } finally {
      setUploadingEditImage(false);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    setEditedPrice('');
    setEditedName('');
    setEditedQuantity('');
    setEditedDescription('');
    setEditedImage(null);
    setEditedExtraImages([null, null, null]);
    setEditedVideo(null);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'À l\'instant';
    if (diffInMins < 60) return `Il y a ${diffInMins} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const pickFileWeb = (accept: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) { resolve(null); return; }
        const url = URL.createObjectURL(file);
        resolve(url);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });
  };

  const applyPickedImage = (target: 'main' | 'extra0' | 'extra1' | 'extra2' | 'custom', uri: string) => {
    if (target === 'main') {
      setEditedImage(uri);
    } else if (target === 'custom') {
      setCustomProductImage(uri);
    } else {
      const idx = parseInt(target.replace('extra', ''));
      setEditedExtraImages(prev => {
        const next = [...prev];
        next[idx] = uri;
        return next;
      });
    }
  };

  const pickImageFromCamera = async (target: 'main' | 'extra0' | 'extra1' | 'extra2' | 'custom' = 'main') => {
    if (Platform.OS === 'web') {
      const uri = await pickFileWeb('image/*');
      if (uri) applyPickedImage(target, uri);
      return;
    }
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la caméra pour prendre une photo');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        applyPickedImage(target, result.assets[0].uri);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error picking image from camera:', error);
      Alert.alert('Erreur', 'Impossible de prendre une photo');
    }
  };

  const pickImageFromLibrary = async (target: 'main' | 'extra0' | 'extra1' | 'extra2' | 'custom' = 'main') => {
    if (Platform.OS === 'web') {
      const uri = await pickFileWeb('image/*');
      if (uri) applyPickedImage(target, uri);
      return;
    }
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la galerie pour sélectionner une photo');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        applyPickedImage(target, result.assets[0].uri);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner une photo');
    }
  };

  const pickVideoFromCamera = async () => {
    if (Platform.OS === 'web') {
      const uri = await pickFileWeb('video/*');
      if (uri) setEditedVideo(uri);
      return;
    }
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la caméra pour enregistrer une vidéo');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'] as any,
        videoMaxDuration: 10,
      });
      if (!result.canceled && result.assets[0]) {
        setEditedVideo(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error picking video from camera:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer une vidéo');
    }
  };

  const pickVideoFromLibrary = async () => {
    if (Platform.OS === 'web') {
      const uri = await pickFileWeb('video/*');
      if (uri) setEditedVideo(uri);
      return;
    }
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la galerie pour sélectionner une vidéo');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'] as any,
        allowsEditing: true,
        videoMaxDuration: 10,
      });
      if (!result.canceled && result.assets[0]) {
        setEditedVideo(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error picking video from library:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner une vidéo');
    }
  };

  const pickCustomVideoFromCamera = async () => {
    if (Platform.OS === 'web') {
      const uri = await pickFileWeb('video/*');
      if (uri) setCustomProductVideo(uri);
      return;
    }
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (!cameraPermission.granted) {
        Alert.alert('Permission requise', 'Vous devez autoriser l\'accès à la caméra pour enregistrer une vidéo');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'] as any,
        videoMaxDuration: 10,
      });
      if (!result.canceled && result.assets[0]) {
        setCustomProductVideo(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Error recording custom video:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la vidéo');
    }
  };

  const uploadProductImage = async (imageUri: string): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const fileName = `${user.id}/product-${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('merchant-photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('merchant-photos')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const uploadProductVideo = async (videoUri: string): Promise<string | null> => {
    if (!user?.id) return null;
    try {
      const response = await fetch(videoUri);
      const blob = await response.blob();
      const fileName = `${user.id}/product-video-${Date.now()}.mp4`;
      const { error } = await supabase.storage
        .from('merchant-photos')
        .upload(fileName, blob, {
          contentType: 'video/mp4',
          upsert: false,
        });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('merchant-photos')
        .getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  };

  const handleAddCustomProduct = async () => {
    if (!merchantId) {
      Alert.alert('Erreur', 'Impossible de trouver votre boutique');
      return;
    }

    if (!customProductName.trim()) {
      Alert.alert('Erreur', 'Le nom du produit est requis');
      return;
    }

    const price = parseFloat(customProductPrice);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Erreur', 'Le prix doit être un nombre positif');
      return;
    }

    if (!customProductCategory.trim()) {
      Alert.alert('Erreur', 'La catégorie est requise');
      return;
    }

    try {
      setUploadingImage(true);

      let imageUrl: string | null = null;
      if (customProductImage) {
        imageUrl = await uploadProductImage(customProductImage);
      }

      let videoUrl: string | null = null;
      if (customProductVideo) {
        videoUrl = await uploadProductVideo(customProductVideo);
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          merchant_id: merchantId,
          name: customProductName.trim(),
          description: customProductDescription.trim(),
          price: price,
          category: customProductCategory.trim(),
          image_url: imageUrl,
          video_url: videoUrl,
          is_available: true,
        })
        .select()
        .single();

      if (error) throw error;

      setMyProducts([data, ...myProducts]);
      setShowAddCustomModal(false);
      setCustomProductName('');
      setCustomProductDescription('');
      setCustomProductPrice('');
      setCustomProductCategory('');
      setCustomProductImage(null);
      setCustomProductVideo(null);
      Alert.alert('Succès', 'Produit ajouté avec succès');
    } catch (error) {
      console.error('Error adding custom product:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancelAddCustom = () => {
    setShowAddCustomModal(false);
    setCustomProductName('');
    setCustomProductDescription('');
    setCustomProductPrice('');
    setCustomProductCategory('');
    setCustomProductImage(null);
    setCustomProductVideo(null);
    setShowCategoryDropdown(false);
  };

  const handleSelectCategory = (category: string) => {
    setCustomProductCategory(category);
    setShowCategoryDropdown(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Catalogue</Text>
          <TouchableOpacity
            style={styles.addCustomButton}
            onPress={() => setShowAddCustomModal(true)}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.addCustomButtonText}>Produit personnalisé</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Que cherchez-vous ?"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
                <X size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {showResults && searchResults.length > 0 && (
            <View style={styles.searchResults}>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.resultItem}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <View style={styles.resultItemContent}>
                      <Text style={styles.resultItemName}>{item.name}</Text>
                      <Text style={styles.resultItemCategory}>
                        {item.category} • {item.subcategory}
                      </Text>
                      <Text style={styles.resultItemPrice}>
                        {item.default_price.toLocaleString()} FCFA / {item.unit}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.resultsList}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Chargement...</Text>
        ) : myProducts.length === 0 ? (
          <>
            <Text style={styles.emptyText}>Aucun produit dans votre catalogue</Text>
            <Text style={styles.hintText}>
              Recherchez des produits dans le catalogue ou ajoutez vos propres produits personnalisés
            </Text>
          </>
        ) : (
          <View style={styles.productsGrid}>
            {myProducts.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productCardContent}>
                  <View style={styles.productInfo}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productName}>{product.name}</Text>
                      {product.quantity !== null && (
                        <View style={[
                          styles.quantityBadge,
                          product.quantity === 0 && styles.quantityBadgeEmpty
                        ]}>
                          <Package size={12} color={product.quantity === 0 ? '#ef4444' : '#059669'} />
                          <Text style={[
                            styles.quantityText,
                            product.quantity === 0 && styles.quantityTextEmpty
                          ]}>
                            {product.quantity}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.productCategory}>{product.category}</Text>
                    <Text style={styles.productPrice}>
                      {product.price.toLocaleString()} FCFA
                    </Text>
                    <View style={styles.productFooter}>
                      <Clock size={12} color="#999" />
                      <Text style={styles.updatedText}>
                        {formatRelativeTime(product.updated_at)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.productActions}>
                    <View style={styles.productActionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditProduct(product)}
                    >
                      <Edit3 size={20} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          if (window.confirm(`Voulez-vous supprimer "${product.name}" ?`)) {
                            handleDeleteProduct(product.id);
                          }
                        } else {
                          Alert.alert(
                            'Supprimer',
                            `Voulez-vous supprimer "${product.name}" ?`,
                            [
                              { text: 'Annuler', style: 'cancel' },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: () => handleDeleteProduct(product.id),
                              },
                            ]
                          );
                        }
                      }}
                    >
                      <Trash2 size={20} color="#ef4444" />
                    </TouchableOpacity>
                    </View>
                    <View style={styles.productThumbnail}>
                      {product.image_url ? (
                        <Image
                          source={{ uri: product.image_url }}
                          style={styles.productThumbnailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.productThumbnailPlaceholder}>
                          <ImageIcon size={24} color="#ccc" />
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Modifier le produit</Text>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Nom du produit</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editedName}
                  onChangeText={(text) => setEditedName(text.toUpperCase())}
                  placeholder="NOM DU PRODUIT"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={editedDescription}
                  onChangeText={(text) => setEditedDescription(text.toUpperCase())}
                  placeholder="DESCRIPTION DU PRODUIT"
                  autoCapitalize="characters"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Photo principale</Text>
                {editedImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: editedImage }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setEditedImage(null)}
                    >
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePickerButtons}>
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={() => pickImageFromCamera('main')}
                    >
                      <Camera size={24} color="#2563eb" />
                      <Text style={styles.imagePickerButtonText}>Caméra</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={() => pickImageFromLibrary('main')}
                    >
                      <ImageIcon size={24} color="#2563eb" />
                      <Text style={styles.imagePickerButtonText}>Galerie</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Photos supplémentaires (3 max)</Text>
                <View style={styles.extraImagesRow}>
                  {([0, 1, 2] as const).map((idx) => {
                    const uri = editedExtraImages[idx];
                    const target = `extra${idx}` as 'extra0' | 'extra1' | 'extra2';
                    return (
                      <View key={idx} style={styles.extraImageSlot}>
                        {uri ? (
                          <View style={styles.extraImagePreview}>
                            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                            <TouchableOpacity
                              style={styles.extraImageRemove}
                              onPress={() => {
                                setEditedExtraImages(prev => {
                                  const next = [...prev];
                                  next[idx] = null;
                                  return next;
                                });
                              }}
                            >
                              <X size={12} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.extraImageAdd}
                            onPress={() => {
                              if (Platform.OS === 'web') {
                                pickImageFromLibrary(target);
                              } else {
                                Alert.alert('Ajouter une photo', '', [
                                  { text: 'Caméra', onPress: () => pickImageFromCamera(target) },
                                  { text: 'Galerie', onPress: () => pickImageFromLibrary(target) },
                                  { text: 'Annuler', style: 'cancel' },
                                ]);
                              }
                            }}
                          >
                            <Plus size={20} color="#999" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Vidéo courte (10 sec max)</Text>
                {editedVideo ? (
                  <View style={styles.videoPreviewContainer}>
                    <View style={styles.videoPreviewInner}>
                      <Play size={28} color="#fff" />
                      <Text style={styles.videoPreviewLabel}>Vidéo sélectionnée</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setEditedVideo(null)}
                    >
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : Platform.OS === 'web' ? (
                  <TouchableOpacity
                    style={[styles.imagePickerButton, { alignSelf: 'flex-start' }]}
                    onPress={pickVideoFromLibrary}
                  >
                    <Video size={24} color="#2563eb" />
                    <Text style={styles.imagePickerButtonText}>Choisir une vidéo</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.imagePickerButtons}>
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={pickVideoFromCamera}
                    >
                      <Camera size={24} color="#2563eb" />
                      <Text style={styles.imagePickerButtonText}>Filmer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={pickVideoFromLibrary}
                    >
                      <Video size={24} color="#2563eb" />
                      <Text style={styles.imagePickerButtonText}>Galerie</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Prix (FCFA)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editedPrice}
                  onChangeText={setEditedPrice}
                  placeholder="Prix"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Quantité disponible</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editedQuantity}
                  onChangeText={setEditedQuantity}
                  placeholder="Laisser vide si non applicable"
                  keyboardType="numeric"
                />
                <Text style={styles.modalHint}>
                  Laissez vide si vous ne souhaitez pas suivre la quantité
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={handleCancelEdit}
                  disabled={uploadingEditImage}
                >
                  <XIcon size={20} color="#666" />
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSaveButton, uploadingEditImage && styles.modalButtonDisabled]}
                  onPress={handleSaveEdit}
                  disabled={uploadingEditImage}
                >
                  {uploadingEditImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={20} color="#fff" />
                  )}
                  <Text style={styles.modalSaveText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showAddCustomModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelAddCustom}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ajouter un produit personnalisé</Text>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Nom du produit *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={customProductName}
                  onChangeText={(text) => setCustomProductName(text.toUpperCase())}
                  placeholder="Ex: RIZ LOCAL"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={customProductDescription}
                  onChangeText={(text) => setCustomProductDescription(text.toUpperCase())}
                  placeholder="DESCRIPTION DU PRODUIT"
                  autoCapitalize="characters"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Photo du produit</Text>
                {customProductImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: customProductImage }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setCustomProductImage(null)}
                    >
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.customMediaPickerButtons}>
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={() => pickImageFromCamera('custom')}
                    >
                      <Camera size={24} color="#2563eb" />
                      <Text style={styles.imagePickerButtonText}>Prendre une photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.imagePickerButton}
                      onPress={() => pickImageFromLibrary('custom')}
                    >
                      <ImageIcon size={24} color="#2563eb" />
                      <Text style={styles.imagePickerButtonText}>Galerie</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {customProductVideo ? (
                  <View style={styles.videoPreviewContainer}>
                    <View style={styles.videoPreviewBadge}>
                      <Play size={16} color="#fff" />
                      <Text style={styles.videoPreviewText}>Vidéo enregistrée (10s)</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeVideoButton}
                      onPress={() => setCustomProductVideo(null)}
                    >
                      <X size={14} color="#dc2626" />
                      <Text style={styles.removeVideoText}>Supprimer la vidéo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.videoPickerButton}
                    onPress={pickCustomVideoFromCamera}
                  >
                    <Video size={22} color="#059669" />
                    <Text style={styles.videoPickerButtonText}>Faire une video 10s</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Prix (FCFA) *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={customProductPrice}
                  onChangeText={setCustomProductPrice}
                  placeholder="Ex: 1500"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Catégorie *</Text>
                <TouchableOpacity
                  style={styles.categorySelector}
                  onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                >
                  <TextInput
                    style={styles.categoryInput}
                    value={customProductCategory}
                    onChangeText={(text) => setCustomProductCategory(text.toUpperCase())}
                    placeholder="CHOISIR OU ÉCRIRE UNE CATÉGORIE"
                    autoCapitalize="characters"
                    editable={!showCategoryDropdown}
                  />
                </TouchableOpacity>
                {showCategoryDropdown && availableCategories.length > 0 && (
                  <View style={styles.categoryDropdown}>
                    <ScrollView style={styles.categoryList} nestedScrollEnabled>
                      {availableCategories.map((category, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.categoryItem}
                          onPress={() => handleSelectCategory(category)}
                        >
                          <Text style={styles.categoryItemText}>{category}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={handleCancelAddCustom}
                  disabled={uploadingImage}
                >
                  <XIcon size={20} color="#666" />
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSaveButton, uploadingImage && styles.modalButtonDisabled]}
                  onPress={handleAddCustomProduct}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={20} color="#fff" />
                  )}
                  <Text style={styles.modalSaveText}>
                    {uploadingImage ? 'Envoi en cours...' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addCustomButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  clearButton: {
    padding: 4,
  },
  searchResults: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultItemContent: {
    flex: 1,
  },
  resultItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  resultItemCategory: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  resultItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  hintText: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
    lineHeight: 20,
  },
  productsGrid: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  quantityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quantityBadgeEmpty: {
    backgroundColor: '#fee2e2',
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  quantityTextEmpty: {
    color: '#ef4444',
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  updatedText: {
    fontSize: 11,
    color: '#999',
  },
  productCategory: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  productActions: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
  },
  productActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  productThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productThumbnailImage: {
    width: 64,
    height: 64,
  },
  productThumbnailPlaceholder: {
    width: 64,
    height: 64,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalTextArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  categorySelector: {
    position: 'relative',
  },
  categoryInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  categoryDropdown: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryList: {
    maxHeight: 200,
  },
  categoryItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalSaveButton: {
    backgroundColor: '#2563eb',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    gap: 8,
  },
  imagePickerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    textAlign: 'center',
  },
  extraImagesRow: {
    flexDirection: 'row',
    gap: 10,
    height: 90,
  },
  extraImageSlot: {
    flex: 1,
    height: 90,
  },
  extraImagePreview: {
    width: '100%',
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  extraImageRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239,68,68,0.9)',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraImageAdd: {
    width: '100%',
    height: 90,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d0d0d0',
    borderStyle: 'dashed',
    backgroundColor: '#fafafa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewContainer: {
    position: 'relative',
    width: '100%',
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1e293b',
  },
  videoPreviewInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  videoPreviewLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  customMediaPickerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  videoPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    gap: 10,
  },
  videoPickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  videoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#059669',
    padding: 12,
    marginTop: 8,
  },
  videoPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  videoPreviewText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  removeVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  removeVideoText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
});
