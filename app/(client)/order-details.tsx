import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Linking, Modal, TextInput, Image, Share } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Package, MapPin, Clock, User, Calendar, DollarSign, Truck, ShoppingBag, XCircle, CheckCircle, Edit, Star, Navigation, Smartphone, CreditCard, X, Share2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { DriverRating } from '@/components/DriverRating';
import { StarRating } from '@/components/StarRating';
import AppFooter from '@/components/AppFooter';
import { subscribeToUserLocation } from '@/lib/gpsTracking';
import { Toast } from '@/components/Toast';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderDetails {
  id: string;
  merchant_id: string;
  status: string;
  subtotal: number;
  total: number;
  delivery_fee: number;
  delivery_address: string;
  delivery_neighborhood: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  created_at: string;
  driver_id: string | null;
  is_express: boolean;
  payment_method: string;
  payment_status: string;
  merchant_name?: string;
  driver_name?: string;
  items: OrderItem[];
  has_rating?: boolean;
  rating_data?: {
    rating: number;
    comment: string;
  };
}

export default function OrderDetailsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId: string | string[] }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mobile_money' | 'card' | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [orangeMoneyOTP, setOrangeMoneyOTP] = useState('');
  const [orangeMoneyPhone, setOrangeMoneyPhone] = useState('');
  const [showUSSDCode, setShowUSSDCode] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (orderId && profile?.id) {
      loadOrderDetails();
    }
  }, [orderId, profile?.id]);

  useEffect(() => {
    if (!orderId || !profile?.id) return;

    const subscription = supabase
      .channel(`order_details_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          console.log('Order update received:', payload);
          const updatedOrder = payload.new as any;
          console.log('Updated order status:', updatedOrder.status, 'Payment status:', updatedOrder.payment_status);
          if (updatedOrder.status === 'accepted' && updatedOrder.payment_status === 'pending') {
            console.log('Driver accepted! Opening payment modal...');
            setShowPaymentModal(true);
          }
          loadOrderDetails();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId, profile?.id]);

  useEffect(() => {
    if (order && order.status === 'accepted' && order.payment_status === 'pending') {
      setShowPaymentModal(true);
    }
  }, [order]);

  useEffect(() => {
    if (!order?.driver_id) return;

    const activeStatuses = ['accepted', 'preparing', 'ready', 'in_delivery'];
    if (!activeStatuses.includes(order.status)) return;

    const driverUserId = order.driver_id;

    const loadDriverProfile = async () => {
      const { data: driverData } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', driverUserId)
        .maybeSingle();

      if (driverData?.user_id) {
        const { data: locationData } = await supabase
          .from('user_profiles')
          .select('latitude, longitude')
          .eq('id', driverData.user_id)
          .maybeSingle();

        if (locationData?.latitude && locationData?.longitude) {
          setDriverLocation({
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          });
        }

        const locationSubscription = subscribeToUserLocation(
          driverData.user_id,
          (location) => {
            console.log('Driver location updated:', location);
            setDriverLocation(location);
          }
        );

        return () => {
          locationSubscription.unsubscribe();
        };
      }
    };

    loadDriverProfile();
  }, [order?.driver_id, order?.status]);

  const loadOrderDetails = async () => {
    if (!orderId || !profile?.id) {
      console.log('Missing orderId or profile.id:', { orderId, profileId: profile?.id });
      return;
    }

    console.log('Loading order details for:', { orderId, clientId: profile.id });
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          merchants (
            shop_name
          ),
          drivers (
            user_profiles (
              first_name,
              last_name
            )
          ),
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('id', orderId)
        .eq('client_id', profile.id)
        .maybeSingle();

      console.log('Query result:', { data, error });
      if (error) throw error;

      if (!data) {
        if (Platform.OS === 'web') {
          window.alert('Commande introuvable');
        } else {
          Alert.alert('Erreur', 'Commande introuvable');
        }
        router.back();
        return;
      }

      let has_rating = false;
      let rating_data = null;

      if (data.status === 'delivered' && data.driver_id) {
        const { data: ratingData } = await supabase
          .from('driver_ratings')
          .select('rating, comment')
          .eq('order_id', data.id)
          .maybeSingle();

        if (ratingData) {
          has_rating = true;
          rating_data = ratingData;
        }
      }

      setOrder({
        ...data,
        merchant_name: data.merchants?.shop_name,
        driver_name: data.drivers?.user_profiles
          ? `${data.drivers.user_profiles.first_name} ${data.drivers.user_profiles.last_name}`
          : null,
        items: data.order_items || [],
        has_rating,
        rating_data,
      });
    } catch (error) {
      console.error('Error loading order details:', error);
      console.error('Error type:', typeof error);
      console.error('Error stringified:', JSON.stringify(error, null, 2));

      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
        ? JSON.stringify(error)
        : 'Erreur inconnue';

      if (Platform.OS === 'web') {
        window.alert(`Erreur de chargement: ${errorMessage}`);
      } else {
        Alert.alert('Erreur', `Impossible de charger les détails de la commande: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedPaymentMethod || !order || processingPayment) {
      return;
    }

    setProcessingPayment(true);

    try {
      if (selectedPaymentMethod === 'mobile_money') {
        await supabase
          .from('orders')
          .update({
            payment_method: 'mobile_money',
            orange_money_phone: orangeMoneyPhone || profile?.phone_number || '',
            payment_status: 'completed',
          })
          .eq('id', order.id);

        setShowPaymentModal(false);
        setProcessingPayment(false);
        setShowPaymentSuccessModal(true);
      } else if (selectedPaymentMethod === 'card') {
        const { data: { session } } = await supabase.auth.getSession();
        const apiUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/initialize-paystack-payment`;

        const paystackResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            amount: order.total,
            email: profile?.phone_number ? `${profile.phone_number}@app.com` : '',
            orderId: order.id,
            currency: 'NGN',
          }),
        });

        const paystackData = await paystackResponse.json();

        if (!paystackData.success) {
          throw new Error(paystackData.error || 'Payment initialization failed');
        }

        await supabase
          .from('orders')
          .update({
            payment_method: 'card',
            paystack_reference: paystackData.reference,
            paystack_access_code: paystackData.accessCode,
          })
          .eq('id', order.id);

        if (paystackData.authorizationUrl) {
          if (Platform.OS === 'web') {
            window.open(paystackData.authorizationUrl, '_blank');
          } else {
            await Linking.openURL(paystackData.authorizationUrl);
          }
        }

        setShowPaymentModal(false);
        setProcessingPayment(false);

        router.push('/(client)/(tabs)/messages');

        if (Platform.OS === 'web') {
          window.alert('Paiement en cours de traitement. Veuillez compléter le paiement sur Paystack.');
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setProcessingPayment(false);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible de traiter le paiement'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de traiter le paiement');
      }
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    if (Platform.OS === 'web') {
      if (!window.confirm('Êtes-vous sûr de vouloir annuler cette commande?')) {
        return;
      }
    } else {
      Alert.alert(
        'Annuler la commande',
        'Êtes-vous sûr de vouloir annuler cette commande?',
        [
          { text: 'Non', style: 'cancel' },
          { text: 'Oui, annuler', style: 'destructive', onPress: performCancel },
        ]
      );
      return;
    }
    await performCancel();
  };

  const performCancel = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', order.id);

      if (error) throw error;

      setOrder({ ...order, status: 'cancelled' });

      if (Platform.OS === 'web') {
        window.alert('Commande annulée avec succès');
      } else {
        Alert.alert('Succès', 'Commande annulée avec succès');
      }
    } catch (error: any) {
      console.error('Error cancelling order:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible d\'annuler la commande'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible d\'annuler la commande');
      }
    }
  };

  const handleConfirmDelivery = async () => {
    if (!order) return;

    if (Platform.OS === 'web') {
      if (!window.confirm('Confirmez-vous avoir reçu cette commande?')) {
        return;
      }
    } else {
      Alert.alert(
        'Confirmer la réception',
        'Confirmez-vous avoir reçu cette commande?',
        [
          { text: 'Non', style: 'cancel' },
          { text: 'Oui, confirmer', onPress: performConfirmDelivery },
        ]
      );
      return;
    }
    await performConfirmDelivery();
  };

  const performConfirmDelivery = async () => {
    if (!order) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          delivery_completed_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      setOrder({ ...order, status: 'delivered' });

      if (Platform.OS === 'web') {
        window.alert('Livraison confirmée avec succès');
      } else {
        Alert.alert('Succès', 'Livraison confirmée avec succès');
      }

      if (order.driver_id) {
        setTimeout(() => {
          setShowRatingModal(true);
        }, 500);
      }
    } catch (error: any) {
      console.error('Error confirming delivery:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible de confirmer la livraison'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de confirmer la livraison');
      }
    }
  };

  const handleRateDriver = () => {
    setShowRatingModal(true);
  };

  const handleRatingSubmitted = () => {
    loadOrderDetails();
  };

  const handleModifyOrder = () => {
    if (order) {
      router.push(`/(client)/merchant-shop?merchantId=${order.merchant_id}`);
    }
  };

  const canModifyOrder = (status: string) => {
    return ['pending', 'confirmed'].includes(status);
  };

  const canCancelOrder = (status: string) => {
    return ['pending', 'pending_driver_assignment', 'pending_driver_acceptance', 'confirmed', 'accepted', 'preparing'].includes(status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'pending_driver_assignment':
        return '#fbbf24';
      case 'pending_driver_acceptance':
        return '#f59e0b';
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'pending_driver_assignment':
        return 'Recherche de livreur';
      case 'pending_driver_acceptance':
        return 'En attente du livreur';
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

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'pending':
        return 'En attente';
      case 'cash':
        return 'Espèces';
      case 'mobile_money':
      case 'orange_money':
        return 'Orange Money';
      case 'card':
        return 'Carte bancaire';
      default:
        return method;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'paid':
      case 'completed':
        return 'Payé';
      case 'failed':
        return 'Échoué';
      default:
        return status;
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const shareOrderDetails = async () => {
    if (!order) return;

    const itemsList = order.items.map(item =>
      `  • ${item.product_name} x${item.quantity} - ${item.total_price.toFixed(0)} FCFA`
    ).join('\n');

    const message = `📦 Détails de la commande #${order.id.slice(0, 8)}

📅 Date: ${new Date(order.created_at).toLocaleDateString('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

🏪 Commerçant: ${order.merchant_name}

📝 Articles commandés:
${itemsList}

💰 Récapitulatif:
  Sous-total: ${order.subtotal.toFixed(0)} FCFA
  Frais de livraison: ${order.delivery_fee.toFixed(0)} FCFA
  Total: ${order.total.toFixed(0)} FCFA

📍 Adresse de livraison: ${order.delivery_address}, ${order.delivery_neighborhood}

${order.driver_name ? `🚚 Livreur: ${order.driver_name}` : ''}

💳 Paiement: ${getPaymentMethodText(order.payment_method)} - ${getPaymentStatusText(order.payment_status)}

📊 Statut: ${getStatusText(order.status)}${order.is_express ? ' (Livraison Express)' : ''}`;

    try {
      if (Platform.OS === 'web') {
        // Web fallback: copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          showToast('Détails de la commande copiés dans le presse-papiers', 'info');
        } else {
          showToast('Le partage n\'est pas disponible sur cette plateforme', 'error');
        }
      } else {
        // Native sharing for iOS and Android
        await Share.share({
          message: message,
        });
      }
    } catch (error) {
      console.error('Error sharing order details:', error);
      showToast('Impossible de partager les détails de la commande', 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Détails de la commande</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Détails de la commande</Text>
        <TouchableOpacity onPress={shareOrderDetails} style={styles.shareButton}>
          <Share2 size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusText(order.status)}</Text>
          </View>
          <Text style={styles.orderNumber}>Commande #{order.id.slice(0, 8)}</Text>
          <View style={styles.dateRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.dateText}>
              {new Date(order.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          {order.is_express && (
            <View style={styles.expressBadge}>
              <Truck size={14} color="#ff5722" />
              <Text style={styles.expressText}>Livraison Express</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Commerçant</Text>
          </View>
          <Text style={styles.merchantName}>{order.merchant_name}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShoppingBag size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Articles commandés</Text>
          </View>
          <View style={styles.itemsList}>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQuantity}>Quantité: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>{item.total_price.toLocaleString()} F</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          </View>
          <View style={styles.addressDetails}>
            {order.delivery_neighborhood && (
              <Text style={styles.addressText}>{order.delivery_neighborhood}</Text>
            )}
            {order.delivery_address && (
              <Text style={styles.addressSubtext}>{order.delivery_address}</Text>
            )}
            {order.delivery_latitude && order.delivery_longitude && (
              <View style={styles.coordinatesContainer}>
                <View style={styles.coordinatesRow}>
                  <MapPin size={14} color="#059669" />
                  <Text style={styles.coordinatesLabel}>Coordonnées GPS:</Text>
                </View>
                <Text style={styles.coordinatesValue}>
                  {order.delivery_latitude.toFixed(6)}, {order.delivery_longitude.toFixed(6)}
                </Text>
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => Linking.openURL(`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`)}
                >
                  <MapPin size={16} color="#fff" />
                  <Text style={styles.mapButtonText}>Ouvrir dans Google Maps</Text>
                </TouchableOpacity>
              </View>
            )}
            {(!order.delivery_latitude || !order.delivery_longitude) && (
              <View style={styles.noCoordinatesContainer}>
                <Text style={styles.noCoordinatesText}>Coordonnées GPS non disponibles</Text>
              </View>
            )}
          </View>
        </View>

        {order.driver_name && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color="#2563eb" />
              <Text style={styles.sectionTitle}>Livreur</Text>
            </View>
            <Text style={styles.driverName}>{order.driver_name}</Text>
            {driverLocation && ['accepted', 'preparing', 'ready', 'in_delivery'].includes(order.status) && (
              <View style={styles.liveLocationContainer}>
                <View style={styles.liveLocationHeader}>
                  <Navigation size={16} color="#10b981" />
                  <Text style={styles.liveLocationLabel}>Position en temps réel</Text>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
                <Text style={styles.gpsCoordinates}>
                  {driverLocation.latitude.toFixed(6)}, {driverLocation.longitude.toFixed(6)}
                </Text>
                <TouchableOpacity
                  style={styles.trackDriverButton}
                  onPress={() => {
                    const url = `https://www.google.com/maps?q=${driverLocation.latitude},${driverLocation.longitude}`;
                    Linking.openURL(url);
                  }}
                >
                  <MapPin size={16} color="#fff" />
                  <Text style={styles.trackDriverText}>Voir sur la carte</Text>
                </TouchableOpacity>
              </View>
            )}
            {order.status === 'delivered' && order.driver_id && !order.has_rating && (
              <TouchableOpacity style={styles.rateButton} onPress={handleRateDriver}>
                <Star size={16} color="#FFB800" />
                <Text style={styles.rateButtonText}>Évaluer le livreur</Text>
              </TouchableOpacity>
            )}
            {order.status === 'delivered' && order.has_rating && order.rating_data && (
              <View style={styles.ratingDisplay}>
                <Text style={styles.ratingLabel}>Votre évaluation:</Text>
                <StarRating
                  rating={order.rating_data.rating}
                  size={16}
                  showNumber={true}
                />
                {order.rating_data.comment && (
                  <Text style={styles.ratingComment}>{order.rating_data.comment}</Text>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#2563eb" />
            <Text style={styles.sectionTitle}>Détails du paiement</Text>
          </View>
          <View style={styles.paymentDetails}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Sous-total</Text>
              <Text style={styles.paymentValue}>{order.subtotal.toLocaleString()} F CFA</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Frais de livraison</Text>
              <Text style={styles.paymentValue}>{order.delivery_fee.toLocaleString()} F CFA</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.paymentRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{order.total.toLocaleString()} F CFA</Text>
            </View>
            <View style={styles.paymentMethodRow}>
              <Text style={styles.paymentMethodLabel}>Mode de paiement:</Text>
              <Text style={styles.paymentMethodValue}>{getPaymentMethodText(order.payment_method)}</Text>
            </View>
            <View style={styles.paymentMethodRow}>
              <Text style={styles.paymentMethodLabel}>Statut du paiement:</Text>
              <Text style={[styles.paymentStatusValue, {
                color: (order.payment_status === 'paid' || order.payment_status === 'completed') ? '#4caf50' : '#ff9800'
              }]}>
                {getPaymentStatusText(order.payment_status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsSection}>
          {order.status === 'in_delivery' && (
            <TouchableOpacity style={styles.confirmDeliveryButton} onPress={handleConfirmDelivery}>
              <CheckCircle size={20} color="#fff" />
              <Text style={styles.confirmDeliveryButtonText}>Confirmer la réception</Text>
            </TouchableOpacity>
          )}

          {canModifyOrder(order.status) && (
            <TouchableOpacity style={styles.modifyButton} onPress={handleModifyOrder}>
              <Edit size={20} color="#2563eb" />
              <Text style={styles.modifyButtonText}>Modifier la commande</Text>
            </TouchableOpacity>
          )}

          {canCancelOrder(order.status) && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelOrder}>
              <XCircle size={20} color="#f44336" />
              <Text style={styles.cancelButtonText}>Annuler la commande</Text>
            </TouchableOpacity>
          )}
        </View>
        <AppFooter />
      </ScrollView>

      {order.driver_id && (
        <DriverRating
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          orderId={order.id}
          driverId={order.driver_id}
          clientId={profile?.id!}
          driverName={order.driver_name || 'Livreur'}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}

      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paiement de la course</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.driverAcceptedBanner}>
                <CheckCircle size={24} color="#16a34a" />
                <View style={styles.driverAcceptedTextContainer}>
                  <Text style={styles.driverAcceptedTitle}>Livreur trouvé!</Text>
                  <Text style={styles.driverAcceptedText}>
                    {order?.driver_name} a accepté votre course. Veuillez procéder au paiement pour confirmer.
                  </Text>
                </View>
              </View>

              <View style={styles.paymentSummary}>
                <Text style={styles.summaryTitle}>Récapitulatif</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total à payer</Text>
                  <Text style={styles.summaryValue}>{order?.total.toLocaleString()} F CFA</Text>
                </View>
              </View>

              <View style={styles.paymentMethodsContainer}>
                <Text style={styles.paymentMethodsTitle}>Choisissez votre méthode de paiement</Text>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === 'mobile_money' && styles.paymentMethodButtonSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod('mobile_money')}
                >
                  <View style={styles.paymentMethodIcon}>
                    <Image
                      source={require('@/assets/images/orange_money.png')}
                      style={styles.orangeMoneyLogoImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[
                      styles.paymentMethodName,
                      selectedPaymentMethod === 'mobile_money' && styles.paymentMethodNameSelected,
                    ]}>
                      Orange Money
                    </Text>
                    <Text style={styles.paymentMethodDescription}>
                      Paiement par mobile money
                    </Text>
                  </View>
                  {selectedPaymentMethod === 'mobile_money' && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodButton,
                    selectedPaymentMethod === 'card' && styles.paymentMethodButtonSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod('card')}
                >
                  <View style={styles.paymentMethodIcon}>
                    <CreditCard size={24} color={selectedPaymentMethod === 'card' ? '#2563eb' : '#666'} />
                  </View>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={[
                      styles.paymentMethodName,
                      selectedPaymentMethod === 'card' && styles.paymentMethodNameSelected,
                    ]}>
                      Carte Bancaire
                    </Text>
                    <Text style={styles.paymentMethodDescription}>
                      Paiement sécurisé par Paystack
                    </Text>
                  </View>
                  {selectedPaymentMethod === 'card' && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              </View>

              {selectedPaymentMethod === 'mobile_money' && (
                <View style={styles.orangeMoneyFormContainer}>
                  <View style={styles.orangeMoneyCard}>
                    <View style={styles.orangeMoneyHeader}>
                      <Text style={styles.orangeMoneyLogoText}>Orange Money</Text>
                    </View>

                    <View style={styles.ussdSection}>
                      <Text style={styles.ussdInstruction}>
                        TAPER SUR VOTRE TELEPHONE:
                      </Text>

                      <View style={styles.ussdCodeContainer}>
                        <Text style={styles.ussdCode}>
                          *144*4*6*{order?.total}#
                        </Text>
                      </View>

                      <Text style={styles.orText}>Ou</Text>

                      <TouchableOpacity
                        style={styles.generateOTPButton}
                        onPress={() => {
                          const ussdCode = `*144*4*6*${order?.total}#`;
                          const telUrl = Platform.OS === 'ios'
                            ? `tel:${encodeURIComponent(ussdCode)}`
                            : `tel:${ussdCode}`;

                          Linking.openURL(telUrl).catch(err => {
                            console.error('Error opening dialer:', err);
                          });
                          setShowUSSDCode(true);
                        }}
                      >
                        <Smartphone size={20} color="#fff" />
                        <Text style={styles.generateOTPButtonText}>Générer code OTP</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>
                        Code OTP <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Entrez le code OTP à 6 chiffres"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={orangeMoneyOTP}
                        onChangeText={setOrangeMoneyOTP}
                      />
                    </View>

                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>
                        N° ayant servi pour le paiement <Text style={styles.required}>*</Text>
                      </Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Ex: 07123456"
                        keyboardType="phone-pad"
                        maxLength={8}
                        value={orangeMoneyPhone}
                        onChangeText={setOrangeMoneyPhone}
                      />
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.paymentButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelPaymentButton}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={styles.cancelPaymentButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmPaymentButton,
                    (!selectedPaymentMethod || processingPayment || (selectedPaymentMethod === 'mobile_money' && (!orangeMoneyOTP || !orangeMoneyPhone))) && styles.confirmPaymentButtonDisabled,
                  ]}
                  onPress={handlePayment}
                  disabled={!selectedPaymentMethod || processingPayment || (selectedPaymentMethod === 'mobile_money' && (!orangeMoneyOTP || !orangeMoneyPhone))}
                >
                  {processingPayment ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmPaymentButtonText}>
                      Payer {order?.total.toLocaleString()} F
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPaymentSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowPaymentSuccessModal(false);
          router.push('/(client)/(tabs)/messages');
        }}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle size={64} color="#fff" />
              </View>
            </View>
            <Text style={styles.successTitle}>Paiement réussi!</Text>
            <Text style={styles.successMessage}>
              Votre paiement a été effectué avec succès. Vous pouvez maintenant suivre votre commande.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setShowPaymentSuccessModal(false);
                router.push('/(client)/(tabs)/messages');
              }}
            >
              <Text style={styles.successButtonText}>Voir ma commande</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 16,
  },
  backButton: {
    padding: 4,
  },
  shareButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  orderNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  expressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  expressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff5722',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#666',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addressDetails: {
    gap: 6,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  addressSubtext: {
    fontSize: 14,
    color: '#666',
  },
  coordinatesText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  gpsLinkText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  paymentDetails: {
    gap: 8,
  },
  paymentRow: {
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
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentMethodLabel: {
    fontSize: 13,
    color: '#999',
  },
  paymentMethodValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  paymentStatusValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionsSection: {
    gap: 12,
    marginTop: 8,
  },
  confirmDeliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmDeliveryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  modifyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f44336',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f44336',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF9E6',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CC9200',
  },
  ratingDisplay: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  ratingLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  ratingComment: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
    marginTop: 4,
  },
  liveLocationContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  liveLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  liveLocationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  gpsCoordinates: {
    fontSize: 12,
    color: '#15803d',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  trackDriverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  trackDriverText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  coordinatesContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  coordinatesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  coordinatesValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 10,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  noCoordinatesContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  noCoordinatesText: {
    fontSize: 13,
    color: '#991b1b',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    padding: 20,
  },
  driverAcceptedBanner: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#86efac',
    gap: 12,
  },
  driverAcceptedTextContainer: {
    flex: 1,
  },
  driverAcceptedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  driverAcceptedText: {
    fontSize: 14,
    color: '#15803d',
    lineHeight: 20,
  },
  paymentSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  paymentMethodsContainer: {
    marginBottom: 20,
  },
  paymentMethodsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  paymentMethodButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orangeMoneyLogoImage: {
    width: 40,
    height: 40,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  paymentMethodNameSelected: {
    color: '#2563eb',
  },
  paymentMethodDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    borderWidth: 6,
    borderColor: '#eff6ff',
  },
  orangeMoneyFormContainer: {
    marginBottom: 20,
  },
  orangeMoneyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ff7900',
  },
  orangeMoneyHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  orangeMoneyLogoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF7900',
  },
  ussdSection: {
    backgroundColor: '#fff5f0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ff7900',
  },
  ussdInstruction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  ussdCodeContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  ussdCode: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ff7900',
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 12,
  },
  generateOTPButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ff7900',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  generateOTPButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  formInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  paymentButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelPaymentButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  cancelPaymentButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmPaymentButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmPaymentButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  confirmPaymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
