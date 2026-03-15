import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Search, MapPin, ChevronRight, X, MapPinOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AppFooter from '@/components/AppFooter';
import SystemNotificationBanner from '@/components/SystemNotificationBanner';

type Category = {
  id: string;
  name: string;
  name_fr: string;
  icon: string;
  parent_id: string | null;
  merchant_count?: number;
};

type Product = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  is_night_product: boolean;
};

type Merchant = {
  id: string;
  shop_name: string;
  address: string;
  neighborhood: string;
  category: string;
};

type SearchResult = {
  type: 'product' | 'category' | 'merchant';
  id: string;
  name: string;
  subtitle: string;
  icon?: string;
  data: any;
};

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  merchant_name?: string;
};

type NearbyMerchant = {
  id: string;
  shop_name: string;
  neighborhood: string;
  category_name: string;
  category_icon: string;
  distance: number;
  logo_url?: string;
  shop_photo_url?: string;
};

export default function ClientHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [mainCategories, setMainCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [latestOrders, setLatestOrders] = useState<Order[]>([]);
  const [nearbyMerchants, setNearbyMerchants] = useState<NearbyMerchant[]>([]);

  useEffect(() => {
    fetchCategories();
    checkLocationPermission();
    if (profile?.id) {
      fetchLatestOrders();
    }
  }, [profile?.id, profile?.gps_enabled]);

  useEffect(() => {
    if (!profile?.id) return;

    const subscription = supabase
      .channel('home_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `client_id=eq.${profile.id}`,
        },
        () => {
          fetchLatestOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  useEffect(() => {
    if (currentLocation && profile?.latitude && profile?.longitude) {
      fetchNearbyMerchants();
    }
  }, [currentLocation, profile?.latitude, profile?.longitude]);

  const checkLocationPermission = async () => {
    try {
      console.log('[GPS] Checking location permission...');
      console.log('[GPS] Profile data:', profile);
      const { status } = await Location.getForegroundPermissionsAsync();
      console.log('[GPS] Permission status:', status);

      const userGpsEnabled = profile?.gps_enabled ?? true;
      console.log('[GPS] User GPS preference:', userGpsEnabled);
      console.log('[GPS] Location will be enabled?', status === 'granted' && userGpsEnabled);

      if (status === 'granted' && userGpsEnabled) {
        setLocationEnabled(true);
        await startLocationTracking();
      } else {
        console.log('[GPS] Permission not granted or user disabled GPS');
        setLocationEnabled(false);
      }
    } catch (error) {
      console.error('[GPS] Error checking location permission:', error);
      setLocationEnabled(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      searchProducts();
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const requestLocationPermission = async () => {
    try {
      const userGpsEnabled = profile?.gps_enabled ?? true;

      if (!userGpsEnabled) {
        if (Platform.OS === 'web') {
          const confirm = window.confirm('Vous avez désactivé le GPS dans les paramètres. Voulez-vous aller aux paramètres pour l\'activer ?');
          if (confirm) {
            router.push('/(client)/settings');
          }
        } else {
          Alert.alert(
            'GPS désactivé',
            'Vous avez désactivé le GPS dans les paramètres. Voulez-vous aller aux paramètres pour l\'activer ?',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Paramètres', onPress: () => router.push('/(client)/settings') }
            ]
          );
        }
        return;
      }

      console.log('[GPS] Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[GPS] Requested permission status:', status);

      if (status !== 'granted') {
        setLocationEnabled(false);
        if (Platform.OS === 'web') {
          window.alert('Permission de localisation refusée. ATTENTION: Sans la localisation GPS activée, vous ne pourrez pas recevoir vos commandes.');
        } else {
          Alert.alert(
            'Localisation requise',
            'ATTENTION: Sans la localisation GPS activée, vous ne pourrez pas recevoir vos commandes.',
            [{ text: 'OK' }]
          );
        }
        return;
      }

      if (profile?.id) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ gps_enabled: true })
          .eq('id', profile.id);

        if (error) {
          console.error('[GPS] Error updating GPS status:', error);
        }
      }

      setLocationEnabled(true);
      await startLocationTracking();
    } catch (error) {
      console.error('[GPS] Error requesting location permission:', error);
      setLocationEnabled(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('[GPS] Starting location tracking...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      console.log('[GPS] Got current position:', location.coords);

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(coords);
      await updateUserLocation(coords.latitude, coords.longitude);
      console.log('[GPS] Initial location updated');

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 50,
        },
        (location) => {
          console.log('[GPS] Position updated:', location.coords);
          const newCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setCurrentLocation(newCoords);
          updateUserLocation(newCoords.latitude, newCoords.longitude);
        }
      );
    } catch (error) {
      console.error('[GPS] Error starting location tracking:', error);
    }
  };

  const updateUserLocation = async (latitude: number, longitude: number) => {
    if (!profile?.id) {
      console.log('[GPS] Cannot update location: no profile ID');
      return;
    }

    try {
      console.log('[GPS] Updating location in database:', { latitude, longitude, userId: profile.id });
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          latitude: latitude,
          longitude: longitude,
        })
        .eq('id', profile.id)
        .select();

      if (error) {
        console.error('[GPS] Error updating user location:', error);
      } else {
        console.log('[GPS] Location updated successfully:', data);
      }
    } catch (error) {
      console.error('[GPS] Exception updating user location:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('name_fr');

      if (error) throw error;

      // Fetch merchant count for each category
      const categoriesWithCount = await Promise.all(
        (data || []).map(async (category) => {
          const { count } = await supabase
            .from('merchants')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', category.id);

          return {
            ...category,
            merchant_count: count || 0,
          };
        })
      );

      setMainCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLatestOrders = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          created_at,
          merchants (
            shop_name
          )
        `)
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      const ordersData = data?.map((order: any) => ({
        id: order.id,
        status: order.status,
        total: order.total,
        created_at: order.created_at,
        merchant_name: order.merchants?.shop_name,
      })) || [];

      setLatestOrders(ordersData);
    } catch (error) {
      console.error('Error fetching latest orders:', error);
    }
  };

  const fetchNearbyMerchants = async () => {
    if (!profile?.latitude || !profile?.longitude) {
      console.log('[Nearby] No user location available');
      return;
    }

    try {
      console.log('[Nearby] Fetching nearby merchants...');
      const userLat = profile.latitude;
      const userLon = profile.longitude;

      const { data, error } = await supabase.rpc('get_nearby_merchants', {
        user_lat: userLat,
        user_lon: userLon,
        max_distance_km: 5
      });

      if (error) {
        console.error('[Nearby] Error fetching nearby merchants:', error);
        return;
      }

      console.log('[Nearby] Found merchants:', data);
      setNearbyMerchants(data || []);
    } catch (error) {
      console.error('[Nearby] Exception fetching nearby merchants:', error);
    }
  };

  const searchProducts = async () => {
    setIsSearching(true);
    try {
      const query = searchQuery.trim().toLowerCase();
      const results: SearchResult[] = [];

      // Search products
      const { data: products, error: productsError } = await supabase
        .from('product_catalog')
        .select('*')
        .ilike('search_terms', `%${query}%`)
        .limit(20);

      if (!productsError && products) {
        products.forEach((product: Product) => {
          results.push({
            type: 'product',
            id: product.id,
            name: product.name,
            subtitle: `${product.category}${product.subcategory ? ' › ' + product.subcategory : ''}`,
            data: product,
          });
        });
      }

      // Search categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .or(`name_fr.ilike.%${query}%,name.ilike.%${query}%`)
        .limit(10);

      if (!categoriesError && categories) {
        categories.forEach((category: Category) => {
          results.push({
            type: 'category',
            id: category.id,
            name: category.name_fr,
            subtitle: 'Catégorie',
            icon: category.icon,
            data: category,
          });
        });
      }

      // Search merchants
      const { data: merchants, error: merchantsError } = await supabase
        .from('merchants')
        .select('id, shop_name, address, neighborhood, category')
        .or(`shop_name.ilike.%${query}%,address.ilike.%${query}%,neighborhood.ilike.%${query}%`)
        .limit(15);

      if (!merchantsError && merchants) {
        merchants.forEach((merchant: Merchant) => {
          results.push({
            type: 'merchant',
            id: merchant.id,
            name: merchant.shop_name,
            subtitle: `Commerce › ${merchant.neighborhood}`,
            data: merchant,
          });
        });
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching:', error);
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmée';
      case 'accepted':
        return 'Acceptée';
      case 'preparing':
        return 'En préparation';
      case 'ready':
        return 'Prête';
      case 'in_delivery':
        return 'En livraison';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'confirmed':
      case 'accepted':
        return '#2196f3';
      case 'preparing':
        return '#9c27b0';
      case 'ready':
        return '#00bcd4';
      case 'in_delivery':
        return '#ff5722';
      case 'delivered':
        return '#4caf50';
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const handleSearchResultSelect = (result: SearchResult) => {
    if (result.type === 'product') {
      const product = result.data as Product;
      router.push(`/(client)/merchants?category=${encodeURIComponent(product.category)}&product=${encodeURIComponent(product.name)}`);
    } else if (result.type === 'category') {
      const category = result.data as Category;
      if (category.parent_id === null) {
        // Main category - go to subcategories
        router.push(`/(client)/subcategories?categoryId=${category.id}&categoryName=${category.name_fr}`);
      } else {
        // Subcategory - go to merchants
        router.push(`/(client)/merchants?category=${category.id}`);
      }
    } else if (result.type === 'merchant') {
      const merchant = result.data as Merchant;
      router.push(`/(client)/merchant-shop?merchantId=${merchant.id}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>ORDERS App</Text>
          <View style={[styles.locationBadge, locationEnabled ? styles.locationBadgeActive : styles.locationBadgeInactive]}>
            {locationEnabled ? (
              <>
                <MapPin size={14} color="#16a34a" />
                <Text style={styles.locationBadgeTextActive}>Localisation activée</Text>
              </>
            ) : (
              <>
                <MapPinOff size={14} color="#dc2626" />
                <Text style={styles.locationBadgeTextInactive}>Localisation désactivée</Text>
              </>
            )}
          </View>
        </View>
        {profile && (
          <Text style={styles.greeting}>
            Bienvenue {profile.first_name} {profile.last_name} ! <Text style={styles.waveEmoji}>👋</Text>
          </Text>
        )}
        {!locationEnabled && (
          <TouchableOpacity
            style={styles.locationWarning}
            onPress={requestLocationPermission}
            activeOpacity={0.7}
          >
            <MapPinOff size={20} color="#dc2626" />
            <View style={styles.locationWarningTextContainer}>
              <Text style={styles.locationWarningText}>
                ⚠️ ATTENTION: Sans GPS activé, vous ne pourrez pas recevoir vos commandes
              </Text>
              <Text style={styles.locationWarningSubtext}>
                👆 Appuyez ici pour activer la localisation GPS
              </Text>
            </View>
          </TouchableOpacity>
        )}
        <View style={styles.searchContainer}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Que cherchez-vous ?"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <X size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <SystemNotificationBanner onDismiss={() => router.push('/(client)/(tabs)/messages')} />
        {isSearching && searchResults.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Résultats de recherche ({searchResults.length})</Text>
            <View style={styles.searchResultsContainer}>
              {searchResults.map((result) => (
                <TouchableOpacity
                  key={`${result.type}-${result.id}`}
                  style={styles.productCard}
                  onPress={() => handleSearchResultSelect(result)}
                  activeOpacity={0.7}
                >
                  {result.icon && (
                    <Text style={styles.resultIcon}>{result.icon}</Text>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{result.name}</Text>
                    <Text style={styles.productCategory}>{result.subtitle}</Text>
                    {result.type === 'product' && result.data.is_night_product && (
                      <View style={styles.nightBadge}>
                        <Text style={styles.nightBadgeText}>Produit de nuit</Text>
                      </View>
                    )}
                    {result.type === 'category' && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>Catégorie</Text>
                      </View>
                    )}
                    {result.type === 'merchant' && (
                      <View style={styles.merchantBadge}>
                        <Text style={styles.merchantBadgeText}>Commerce</Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : isSearching && searchResults.length === 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aucun résultat</Text>
            <Text style={styles.comingSoon}>Aucun résultat ne correspond à votre recherche</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Catégories</Text>
              <View style={styles.categoriesGrid}>
                {mainCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryCard}
                    onPress={() => {
                      if (category.name_fr === 'TAXI') {
                        router.push(`/(client)/subcategories?categoryId=${category.id}&categoryName=${category.name_fr}`);
                      } else {
                        router.push(`/(client)/merchants?merchantCategory=${category.id}`);
                      }
                    }}
                  >
                    {category.name_fr === 'Boulangéries' ? (
                      <Image
                        source={require('@/assets/images/bread-25206_1920.png')}
                        style={styles.boulangeriesImage}
                        resizeMode="contain"
                      />
                    ) : category.name_fr === 'Restaurants' ? (
                      <Image
                        source={require('@/assets/images/pasta-576417.png')}
                        style={styles.restaurantsImage}
                        resizeMode="contain"
                      />
                    ) : category.name_fr === 'Pharmacies' ? (
                      <Image
                        source={require('@/assets/images/apothecary-159037.png')}
                        style={styles.pharmaciesImage}
                        resizeMode="contain"
                      />
                    ) : category.name_fr === 'Cliniques à Domicile' ? (
                      <Image
                        source={require('@/assets/images/stethoscope-icon-2316460.png')}
                        style={styles.cliniquesImage}
                        resizeMode="contain"
                      />
                    ) : category.name_fr === 'Garages Autos' ? (
                      <Image
                        source={require('@/assets/images/tow-truck-2901948_1920.png')}
                        style={styles.garagesAutosImage}
                        resizeMode="contain"
                      />
                    ) : category.name_fr === 'Garages Motos' ? (
                      <Image
                        source={require('@/assets/images/vespa_moto.png')}
                        style={styles.garagesMotosImage}
                        resizeMode="contain"
                      />
                    ) : category.name_fr === 'Plombiers' ? (
                      <Image
                        source={require('@/assets/images/plunger-7226993_1920.png')}
                        style={styles.plombiersImage}
                        resizeMode="contain"
                      />
                    ) : category.name_fr === 'Electriciens' ? (
                      <Image
                        source={require('@/assets/images/bulb-310821_1920.png')}
                        style={styles.electriciensImage}
                        resizeMode="contain"
                      />
                    ) : category.name_fr === 'Alimentations' ? (
                      <Text style={styles.alimentationsIcon}>🛒</Text>
                    ) : category.name_fr === 'TAXI' ? (
                      <Text style={styles.taxiIcon}>🚕</Text>
                    ) : (
                      <Text style={styles.categoryIcon}>{category.icon}</Text>
                    )}
                    <Text style={styles.categoryName}>{category.name_fr}</Text>
                    {category.merchant_count !== undefined && category.merchant_count > 0 && (
                      <View style={styles.merchantCountBadge}>
                        <Text style={styles.merchantCountText}>{category.merchant_count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Autour de moi</Text>
                <MapPin size={20} color="#2563eb" />
              </View>
              {!locationEnabled ? (
                <View style={styles.nearbyDisabledContainer}>
                  <MapPinOff size={24} color="#999" />
                  <Text style={styles.nearbyDisabledText}>
                    Activez la localisation pour découvrir les commerces autour de vous
                  </Text>
                </View>
              ) : nearbyMerchants.length === 0 ? (
                <Text style={styles.comingSoon}>Aucun commerce à proximité</Text>
              ) : (
                <View style={styles.nearbyMerchantsContainer}>
                  {nearbyMerchants.map((merchant) => (
                    <TouchableOpacity
                      key={merchant.id}
                      style={styles.nearbyMerchantCard}
                      onPress={() => router.push(`/(client)/merchant-shop?merchantId=${merchant.id}`)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.nearbyMerchantIcon}>
                        {merchant.shop_photo_url ? (
                          <Image
                            source={{ uri: merchant.shop_photo_url }}
                            style={styles.nearbyMerchantPhotoImage}
                            resizeMode="cover"
                          />
                        ) : merchant.category_name === 'Boulangéries' ? (
                          <Image
                            source={require('@/assets/images/bread-25206_1920.png')}
                            style={styles.nearbyMerchantImage}
                            resizeMode="contain"
                          />
                        ) : merchant.category_name === 'Restaurants' ? (
                          <Image
                            source={require('@/assets/images/pasta-576417.png')}
                            style={styles.nearbyMerchantImage}
                            resizeMode="contain"
                          />
                        ) : merchant.category_name === 'Pharmacies' ? (
                          <Image
                            source={require('@/assets/images/apothecary-159037.png')}
                            style={styles.nearbyMerchantImage}
                            resizeMode="contain"
                          />
                        ) : merchant.category_name === 'Cliniques à Domicile' ? (
                          <Image
                            source={require('@/assets/images/stethoscope-icon-2316460.png')}
                            style={styles.nearbyMerchantImage}
                            resizeMode="contain"
                          />
                        ) : merchant.category_name === 'Garages Autos' ? (
                          <Image
                            source={require('@/assets/images/tow-truck-2901948_1920.png')}
                            style={styles.nearbyMerchantImage}
                            resizeMode="contain"
                          />
                        ) : merchant.category_name === 'Garages Motos' ? (
                          <Image
                            source={require('@/assets/images/vespa_moto.png')}
                            style={styles.nearbyMerchantImage}
                            resizeMode="contain"
                          />
                        ) : merchant.category_name === 'Plombiers' ? (
                          <Image
                            source={require('@/assets/images/plunger-7226993_1920.png')}
                            style={styles.nearbyMerchantImage}
                            resizeMode="contain"
                          />
                        ) : merchant.category_name === 'Electriciens' ? (
                          <Image
                            source={require('@/assets/images/bulb-310821_1920.png')}
                            style={styles.nearbyMerchantImage}
                            resizeMode="contain"
                          />
                        ) : merchant.category_name === 'Alimentations' ? (
                          <Text style={styles.nearbyMerchantEmoji}>🛒</Text>
                        ) : merchant.category_name === 'TAXI' ? (
                          <Text style={styles.nearbyMerchantEmoji}>🚕</Text>
                        ) : (
                          <Text style={styles.nearbyMerchantEmoji}>{merchant.category_icon}</Text>
                        )}
                      </View>
                      <View style={styles.nearbyMerchantInfo}>
                        <Text style={styles.nearbyMerchantName} numberOfLines={1}>
                          {merchant.shop_name}
                        </Text>
                        <Text style={styles.nearbyMerchantCategory} numberOfLines={1}>
                          {merchant.category_name}
                        </Text>
                        <Text style={styles.nearbyMerchantNeighborhood} numberOfLines={1}>
                          {merchant.neighborhood}
                        </Text>
                      </View>
                      <View style={styles.nearbyMerchantDistance}>
                        <MapPin size={14} color="#16a34a" />
                        <Text style={styles.nearbyMerchantDistanceText}>
                          {merchant.distance < 1
                            ? `${Math.round(merchant.distance * 1000)}m`
                            : `${merchant.distance.toFixed(1)}km`
                          }
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Dernières commandes</Text>
                <TouchableOpacity onPress={() => router.push('/(client)/(tabs)/orders')}>
                  <Text style={styles.seeAllLink}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              {latestOrders.length === 0 ? (
                <Text style={styles.comingSoon}>Aucune commande pour le moment</Text>
              ) : (
                <View style={styles.ordersContainer}>
                  {latestOrders.map((order) => (
                    <TouchableOpacity
                      key={order.id}
                      style={styles.orderCard}
                      onPress={() => router.push('/(client)/(tabs)/orders')}
                      activeOpacity={0.7}
                    >
                      <View style={styles.orderCardHeader}>
                        <Text style={styles.orderMerchant} numberOfLines={1} ellipsizeMode="tail">{order.merchant_name}</Text>
                        <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                          <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]} numberOfLines={1}>
                            {getStatusText(order.status)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.orderCardFooter}>
                        <Text style={styles.orderDate} numberOfLines={1} ellipsizeMode="tail">
                          {new Date(order.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </Text>
                        <Text style={styles.orderTotal} numberOfLines={1} ellipsizeMode="tail">{order.total.toLocaleString()} F CFA</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  locationBadgeActive: {
    backgroundColor: '#dcfce7',
  },
  locationBadgeInactive: {
    backgroundColor: '#fee2e2',
  },
  locationBadgeTextActive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  locationBadgeTextInactive: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
  },
  locationWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#fca5a5',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationWarningTextContainer: {
    flex: 1,
  },
  locationWarningText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    marginBottom: 4,
  },
  locationWarningSubtext: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 16,
  },
  waveEmoji: {
    fontSize: 28,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  categoryCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    minHeight: 120,
  },
  categoryIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  taxiIcon: {
    fontSize: 80,
    marginBottom: 8,
  },
  alimentationsIcon: {
    fontSize: 80,
    marginBottom: 8,
  },
  categoryImage: {
    width: 105,
    height: 105,
    marginBottom: 6,
  },
  restaurantsImage: {
    width: 120,
    height: 120,
    marginBottom: 6,
  },
  garagesAutosImage: {
    width: 125,
    height: 125,
    marginBottom: 6,
  },
  garagesMotosImage: {
    width: 100,
    height: 100,
    marginBottom: 6,
  },
  pharmaciesImage: {
    width: 100,
    height: 100,
    marginBottom: 6,
  },
  plombiersImage: {
    width: 100,
    height: 100,
    marginBottom: 6,
  },
  electriciensImage: {
    width: 120,
    height: 120,
    marginBottom: 6,
  },
  boulangeriesImage: {
    width: 120,
    height: 120,
    marginBottom: 6,
  },
  cliniquesImage: {
    width: 100,
    height: 100,
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  merchantCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  merchantCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  comingSoon: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  searchResultsContainer: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productInfo: {
    gap: 4,
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  productCategory: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  productSubcategory: {
    fontSize: 12,
    color: '#999',
  },
  nightBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  nightBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  merchantBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  merchantBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  resultIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  ordersContainer: {
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderMerchant: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  nearbyDisabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  nearbyDisabledText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  nearbyMerchantsContainer: {
    gap: 12,
  },
  nearbyMerchantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  nearbyMerchantIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyMerchantEmoji: {
    fontSize: 24,
  },
  nearbyMerchantImage: {
    width: 40,
    height: 40,
  },
  nearbyMerchantPhotoImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  nearbyMerchantInfo: {
    flex: 1,
    gap: 2,
  },
  nearbyMerchantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  nearbyMerchantCategory: {
    fontSize: 13,
    color: '#666',
  },
  nearbyMerchantNeighborhood: {
    fontSize: 12,
    color: '#999',
  },
  nearbyMerchantDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nearbyMerchantDistanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
});
