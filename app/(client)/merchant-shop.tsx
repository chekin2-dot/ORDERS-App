import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, TextInput, Switch, Linking, Platform, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Store, MapPin, Search, Plus, Minus, ShoppingCart, Zap, ArrowUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import WorkingHoursDisplay from '@/components/WorkingHoursDisplay';

interface MerchantInfo {
  id: string;
  shop_name: string;
  address: string;
  neighborhood: string;
  is_open: boolean;
  opening_hours: any;
  shop_photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  category_name?: string;
  category_icon?: string;
}

interface MerchantPhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
  category: string;
  quantity: number | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function MerchantShopScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const merchantId = params.merchantId as string;
  const highlightProduct = params.product as string;

  const [merchant, setMerchant] = useState<MerchantInfo | null>(null);
  const [merchantPhotos, setMerchantPhotos] = useState<MerchantPhoto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isExpressDelivery, setIsExpressDelivery] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMerchantAndProducts();
  }, [merchantId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredProducts(
        products.filter(p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else if (highlightProduct) {
      setFilteredProducts(
        products.filter(p =>
          p.name.toLowerCase().includes(highlightProduct.toLowerCase())
        )
      );
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products, highlightProduct]);

  const loadMerchantAndProducts = async () => {
    setLoading(true);
    try {
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select(`
          id,
          shop_name,
          address,
          neighborhood,
          is_open,
          opening_hours,
          shop_photo_url,
          latitude,
          longitude,
          categories (
            name_fr,
            icon
          )
        `)
        .eq('id', merchantId)
        .maybeSingle();

      if (merchantError) throw merchantError;

      const merchant = merchantData ? {
        ...merchantData,
        category_name: merchantData.categories?.name_fr,
        category_icon: merchantData.categories?.icon,
      } : null;

      setMerchant(merchant);

      const { data: photosData, error: photosError } = await supabase
        .from('merchant_photos')
        .select('id, photo_url, display_order')
        .eq('merchant_id', merchantId)
        .order('display_order');

      if (!photosError && photosData && photosData.length > 0) {
        setMerchantPhotos(photosData);
      } else if (merchantData?.shop_photo_url) {
        setMerchantPhotos([{
          id: 'main',
          photo_url: merchantData.shop_photo_url,
          display_order: 0
        }]);
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_available', true)
        .order('name');

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading merchant shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    const existingItem = cart.find(item => item.product.id === productId);
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.product.id !== productId));
    }
  };

  const getCartQuantity = (productId: string) => {
    const item = cart.find(item => item.product.id === productId);
    return item ? item.quantity : 0;
  };

  const getTotalCartItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalCartPrice = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || !merchant || creatingOrder) {
      return;
    }

    setCreatingOrder(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('neighborhood, latitude, longitude, phone_number, full_address')
        .eq('id', user.id)
        .maybeSingle();

      const subtotal = getTotalCartPrice();
      const deliveryFee = isExpressDelivery ? 1500 : 1000;
      const finalTotal = subtotal + deliveryFee;
      const expressBonus = isExpressDelivery ? 500 : 0;

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          client_id: user.id,
          merchant_id: merchant.id,
          subtotal,
          delivery_fee: deliveryFee,
          total: finalTotal,
          delivery_mode: 'delivery',
          status: 'pending',
          is_express: isExpressDelivery,
          express_bonus: expressBonus,
          delivery_address: userProfile?.full_address || userProfile?.neighborhood || merchant.neighborhood || 'Adresse non renseignée',
          delivery_neighborhood: userProfile?.neighborhood || merchant.neighborhood,
          delivery_latitude: userProfile?.latitude || null,
          delivery_longitude: userProfile?.longitude || null,
          payment_status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        product_name: item.product.name,
        total_price: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setCart([]);
      setCreatingOrder(false);

      router.push({
        pathname: '/(client)/select-driver',
        params: {
          orderId: order.id,
          neighborhood: userProfile?.neighborhood || merchant.neighborhood,
          total: finalTotal.toString(),
        },
      });
    } catch (error: any) {
      console.error('Checkout error:', error);
      setCreatingOrder(false);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Une erreur est survenue'));
      }
    }
  };

  const openMap = () => {
    if (!merchant?.latitude || !merchant?.longitude) return;

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

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollToTop(offsetY > 300);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Chargement...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Commerce introuvable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{merchant.shop_name}</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.merchantHeader}>
          {merchantPhotos.length > 0 ? (
            <View>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(event) => {
                  const slideIndex = Math.round(
                    event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
                  );
                  setCurrentPhotoIndex(slideIndex);
                }}
                scrollEventThrottle={200}
              >
                {merchantPhotos.map((photo) => (
                  <Image
                    key={photo.id}
                    source={{ uri: photo.photo_url }}
                    style={styles.merchantImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {merchantPhotos.length > 1 && (
                <View style={styles.photoPaginationContainer}>
                  {merchantPhotos.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.photoPaginationDot,
                        currentPhotoIndex === index && styles.photoPaginationDotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
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
                <Store size={48} color="#ccc" />
              )}
            </View>
          )}
          <View style={styles.merchantDetails}>
            <View style={styles.merchantTitleRow}>
              <Text style={styles.merchantName}>{merchant.shop_name}</Text>
              <View style={[styles.statusDot, { backgroundColor: merchant.is_open ? '#4caf50' : '#f44336' }]} />
            </View>
            <TouchableOpacity
              style={styles.merchantAddressRow}
              onPress={openMap}
              disabled={!merchant.latitude || !merchant.longitude}
            >
              <MapPin size={14} color="#2563eb" />
              <Text style={styles.merchantAddress}>{merchant.neighborhood}</Text>
            </TouchableOpacity>
            <WorkingHoursDisplay workingHours={merchant.opening_hours} compact />
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredProducts.length === 0 ? (
          <Text style={styles.emptyText}>
            {searchQuery || highlightProduct
              ? 'Aucun produit ne correspond à votre recherche'
              : 'Aucun produit disponible pour le moment'}
          </Text>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => {
              const cartQty = getCartQuantity(product.id);
              return (
                <View key={product.id} style={styles.productCard}>
                  {product.image_url ? (
                    <Image
                      source={{ uri: product.image_url }}
                      style={styles.productImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Store size={24} color="#ccc" />
                    </View>
                  )}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    {product.description && (
                      <Text style={styles.productDescription} numberOfLines={2}>
                        {product.description}
                      </Text>
                    )}
                    <Text style={styles.productPrice}>{product.price.toLocaleString()} FCFA</Text>
                    {product.quantity !== null && (
                      <Text style={styles.productStock}>
                        Stock: {product.quantity}
                      </Text>
                    )}
                  </View>
                  {product.is_available ? (
                    cartQty > 0 ? (
                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => removeFromCart(product.id)}
                        >
                          <Minus size={16} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{cartQty}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => addToCart(product)}
                        >
                          <Plus size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => addToCart(product)}
                      >
                        <Plus size={20} color="#fff" />
                      </TouchableOpacity>
                    )
                  ) : (
                    <Text style={styles.unavailableText}>Non disponible</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {cart.length > 0 && (
        <View style={styles.cartFooter}>
          <View style={styles.expressDeliveryContainer}>
            <View style={styles.expressDeliveryLeft}>
              <Zap size={20} color={isExpressDelivery ? '#fbbf24' : '#999'} fill={isExpressDelivery ? '#fbbf24' : 'none'} />
              <View style={styles.expressDeliveryTextContainer}>
                <Text style={styles.expressDeliveryTitle}>Livraison Express</Text>
                <Text style={styles.expressDeliverySubtitle}>≤ 10 min • 1 000 F/course + 500 F express</Text>
              </View>
            </View>
            <Switch
              value={isExpressDelivery}
              onValueChange={setIsExpressDelivery}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={isExpressDelivery ? '#2563eb' : '#f3f4f6'}
            />
          </View>
          <View style={styles.cartSummary}>
            <View style={styles.cartIcon}>
              <ShoppingCart size={20} color="#fff" />
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getTotalCartItems()}</Text>
              </View>
            </View>
            <View style={styles.cartDetails}>
              <Text style={styles.cartItemsText}>{getTotalCartItems()} article(s)</Text>
              <Text style={styles.cartTotalText}>{getTotalCartPrice().toLocaleString()} F CFA</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.checkoutButton, creatingOrder && styles.checkoutButtonDisabled]} onPress={handleCheckout} disabled={creatingOrder}>
            {creatingOrder ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.checkoutButtonText}>Commander</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {showScrollToTop && (
        <TouchableOpacity
          style={styles.scrollToTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <ArrowUp size={24} color="#fff" />
        </TouchableOpacity>
      )}
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
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantHeader: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  merchantImage: {
    width: 375,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  merchantImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantPlaceholderImage: {
    width: 120,
    height: 120,
  },
  merchantPlaceholderEmoji: {
    fontSize: 80,
  },
  merchantDetails: {
    gap: 8,
  },
  merchantTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  merchantName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  merchantAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  merchantAddress: {
    fontSize: 14,
    color: '#666',
  },
  photoPaginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: -28,
    marginBottom: 16,
  },
  photoPaginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  photoPaginationDotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    margin: 20,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  productsGrid: {
    padding: 20,
    paddingTop: 8,
    gap: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#999',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 32,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#2563eb',
    margin: 16,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableText: {
    fontSize: 14,
    color: '#f44336',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  cartFooter: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
    gap: 12,
  },
  expressDeliveryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
    marginBottom: 12,
  },
  expressDeliveryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  expressDeliveryTextContainer: {
    flex: 1,
  },
  expressDeliveryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  expressDeliverySubtitle: {
    fontSize: 11,
    color: '#92400e',
    marginTop: 2,
  },
  cartSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cartIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cartDetails: {
    flex: 1,
  },
  cartItemsText: {
    fontSize: 13,
    color: '#666',
  },
  cartTotalText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  checkoutButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
});
