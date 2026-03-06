import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Linking, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Store, MapPin, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import WorkingHoursDisplay from '@/components/WorkingHoursDisplay';

interface Merchant {
  id: string;
  shop_name: string;
  address: string;
  neighborhood: string;
  is_open: boolean;
  opening_hours: any;
  shop_photo_url: string | null;
  verification_status: string;
  latitude: number | null;
  longitude: number | null;
  category_name?: string;
  category_icon?: string;
}

export default function MerchantsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryId = params.category as string;
  const merchantCategory = params.merchantCategory as string;
  const productName = params.product as string;
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Commerces');

  useEffect(() => {
    loadMerchants();
  }, [categoryId, merchantCategory, productName]);

  const loadMerchants = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('merchants')
        .select(`
          id,
          shop_name,
          address,
          neighborhood,
          is_open,
          opening_hours,
          shop_photo_url,
          verification_status,
          category_id,
          latitude,
          longitude,
          categories (
            name_fr,
            icon
          )
        `)
        .eq('verification_status', 'verified');

      if (merchantCategory) {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('name_fr')
          .eq('id', merchantCategory)
          .maybeSingle();

        if (categoryData) {
          setPageTitle(categoryData.name_fr);
        }
        query = query.eq('category_id', merchantCategory);
      } else if (productName) {
        setPageTitle(`Recherche: ${productName}`);

        const categoryNames = categoryId ? categoryId.split(',') : [];
        if (categoryNames.length > 0) {
          const { data: categories } = await supabase
            .from('categories')
            .select('id')
            .or(categoryNames.map(name => `name_fr.ilike.%${name}%`).join(','));

          if (categories && categories.length > 0) {
            const categoryIds = categories.map(c => c.id);
            query = query.in('category_id', categoryIds);
          }
        }
      } else if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      query = query.order('shop_name');

      const { data, error } = await query;

      if (error) throw error;

      const merchantsWithCategory = (data || []).map((merchant: any) => ({
        ...merchant,
        category_name: merchant.categories?.name_fr,
        category_icon: merchant.categories?.icon,
      }));

      setMerchants(merchantsWithCategory);
    } catch (error) {
      console.error('Error loading merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const openMap = (merchant: Merchant) => {
    if (!merchant.latitude || !merchant.longitude) return;

    const label = encodeURIComponent(merchant.shop_name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${merchant.latitude},${merchant.longitude}`,
      android: `geo:0,0?q=${merchant.latitude},${merchant.longitude}(${label})`,
      web: `https://www.google.com/maps/search/?api=1&query=${merchant.latitude},${merchant.longitude}`,
    });

    if (url) {
      Linking.openURL(url).catch(err => console.error('Error opening map:', err));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{pageTitle}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : merchants.length === 0 ? (
          <Text style={styles.emptyText}>
            Aucun commerce disponible dans cette catégorie pour le moment
          </Text>
        ) : (
          <View style={styles.merchantsList}>
            {merchants.map((merchant) => (
              <TouchableOpacity
                key={merchant.id}
                style={styles.merchantCard}
                onPress={() => router.push(`/(client)/merchant-shop?merchantId=${merchant.id}${productName ? `&product=${encodeURIComponent(productName)}` : ''}`)}
              >
                {merchant.shop_photo_url ? (
                  <Image
                    source={{ uri: merchant.shop_photo_url }}
                    style={styles.merchantImage}
                    resizeMode="cover"
                    onError={(e) => console.error('Merchant image error:', e.nativeEvent.error)}
                  />
                ) : (
                  <View style={styles.merchantImagePlaceholder}>
                    {merchant.category_name === 'Boulangéries' ? (
                      <Image
                        source={require('@/assets/images/bread-25206_1920.png')}
                        style={styles.merchantPlaceholderImage}
                        resizeMode="contain"
                      />
                    ) : merchant.category_name === 'Restaurants' ? (
                      <Image
                        source={require('@/assets/images/pasta-576417.png')}
                        style={styles.merchantPlaceholderImage}
                        resizeMode="contain"
                      />
                    ) : merchant.category_name === 'Pharmacies' ? (
                      <Image
                        source={require('@/assets/images/apothecary-159037.png')}
                        style={styles.merchantPlaceholderImage}
                        resizeMode="contain"
                      />
                    ) : merchant.category_name === 'Cliniques à Domicile' ? (
                      <Image
                        source={require('@/assets/images/stethoscope-icon-2316460.png')}
                        style={styles.merchantPlaceholderImage}
                        resizeMode="contain"
                      />
                    ) : merchant.category_name === 'Garages Autos' ? (
                      <Image
                        source={require('@/assets/images/tow-truck-2901948_1920.png')}
                        style={styles.merchantPlaceholderImage}
                        resizeMode="contain"
                      />
                    ) : merchant.category_name === 'Garages Motos' ? (
                      <Image
                        source={require('@/assets/images/vespa_moto.png')}
                        style={styles.merchantPlaceholderImage}
                        resizeMode="contain"
                      />
                    ) : merchant.category_name === 'Plombiers' ? (
                      <Image
                        source={require('@/assets/images/plunger-7226993_1920.png')}
                        style={styles.merchantPlaceholderImage}
                        resizeMode="contain"
                      />
                    ) : merchant.category_name === 'Electriciens' ? (
                      <Image
                        source={require('@/assets/images/bulb-310821_1920.png')}
                        style={styles.merchantPlaceholderImage}
                        resizeMode="contain"
                      />
                    ) : merchant.category_name === 'Alimentations' ? (
                      <Text style={styles.merchantPlaceholderEmoji}>🛒</Text>
                    ) : merchant.category_name === 'TAXI' ? (
                      <Text style={styles.merchantPlaceholderEmoji}>🚕</Text>
                    ) : merchant.category_icon ? (
                      <Text style={styles.merchantPlaceholderEmoji}>{merchant.category_icon}</Text>
                    ) : (
                      <Store size={32} color="#ccc" />
                    )}
                  </View>
                )}
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantHeader}>
                    <Text style={styles.merchantName}>{merchant.shop_name}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: merchant.is_open ? '#4caf50' : '#f44336' },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.merchantAddress}
                    onPress={() => openMap(merchant)}
                    disabled={!merchant.latitude || !merchant.longitude}
                  >
                    <MapPin size={14} color="#2563eb" />
                    <Text style={styles.merchantAddressText} numberOfLines={1}>
                      {merchant.neighborhood}
                    </Text>
                  </TouchableOpacity>
                  <WorkingHoursDisplay workingHours={merchant.opening_hours} compact />
                </View>
                <ChevronRight size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 40,
  },
  merchantsList: {
    gap: 16,
  },
  merchantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  merchantImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  merchantImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantPlaceholderImage: {
    width: 60,
    height: 60,
  },
  merchantPlaceholderEmoji: {
    fontSize: 40,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  merchantAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  merchantAddressText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
});
