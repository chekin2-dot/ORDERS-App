import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Package, MapPin, Clock, User, Trash2, Edit, XCircle, CheckCircle, ShoppingBag, Star, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import AppFooter from '@/components/AppFooter';
import { DriverRating } from '@/components/DriverRating';
import { StarRating } from '@/components/StarRating';

interface Order {
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
  merchant_name?: string;
  driver_name?: string;
  items_preview?: string;
  has_rating?: boolean;
  rating_data?: {
    rating: number;
    comment: string;
  };
}

export default function OrdersScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState<Order | null>(null);

  useEffect(() => {
    if (profile?.id) {
      loadOrders();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const subscription = supabase
      .channel('orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `client_id=eq.${profile.id}`,
        },
        (payload) => {
          console.log('Order change detected:', payload);
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  const loadOrders = async () => {
    if (!profile?.id) return;

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
            quantity,
            product_name
          )
        `)
        .eq('client_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithRatings = await Promise.all(
        (data || []).map(async (order: any) => {
          const items = order.order_items || [];
          const itemNames = items.slice(0, 2).map((item: any) => item.product_name).join(', ');
          const itemsPreview = items.length > 2 ? `${itemNames}...` : itemNames;

          let has_rating = false;
          let rating_data = null;

          if (order.status === 'delivered' && order.driver_id) {
            const { data: ratingData } = await supabase
              .from('driver_ratings')
              .select('rating, comment')
              .eq('order_id', order.id)
              .maybeSingle();

            if (ratingData) {
              has_rating = true;
              rating_data = ratingData;
            }
          }

          return {
            ...order,
            merchant_name: order.merchants?.shop_name,
            driver_name: order.drivers?.user_profiles
              ? `${order.drivers.user_profiles.first_name} ${order.drivers.user_profiles.last_name}`
              : null,
            items_preview: itemsPreview,
            has_rating,
            rating_data,
          };
        })
      );

      setOrders(ordersWithRatings);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const isOrderOlderThanOneMonth = (orderDate: string) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return new Date(orderDate) < oneMonthAgo;
  };

  const canDeleteOrder = (order: Order) => {
    return (
      order.status === 'delivered' ||
      order.status === 'cancelled' ||
      isOrderOlderThanOneMonth(order.created_at)
    );
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette commande?')) {
        return;
      }
    } else {
      Alert.alert(
        'Supprimer la commande',
        'Êtes-vous sûr de vouloir supprimer cette commande?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: () => performDelete(orderId) },
        ]
      );
      return;
    }
    await performDelete(orderId);
  };

  const performDelete = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.filter(order => order.id !== orderId));

      if (Platform.OS === 'web') {
        window.alert('Commande supprimée avec succès');
      } else {
        Alert.alert('Succès', 'Commande supprimée avec succès');
      }
    } catch (error: any) {
      console.error('Error deleting order:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible de supprimer la commande'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de supprimer la commande');
      }
    }
  };

  const handleCancelOrder = async (orderId: string) => {
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
          { text: 'Oui, annuler', style: 'destructive', onPress: () => performCancel(orderId) },
        ]
      );
      return;
    }
    await performCancel(orderId);
  };

  const performCancel = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: 'cancelled' } : order
      ));

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

  const handleConfirmDelivery = async (orderId: string) => {
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
          { text: 'Oui, confirmer', onPress: () => performConfirmDelivery(orderId) },
        ]
      );
      return;
    }
    await performConfirmDelivery(orderId);
  };

  const performConfirmDelivery = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          delivery_completed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;

      const updatedOrder = orders.find(order => order.id === orderId);

      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: 'delivered' } : order
      ));

      if (Platform.OS === 'web') {
        window.alert('Livraison confirmée avec succès');
      } else {
        Alert.alert('Succès', 'Livraison confirmée avec succès');
      }

      if (updatedOrder && updatedOrder.driver_id) {
        setTimeout(() => {
          setSelectedOrderForRating(updatedOrder);
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

  const handleRateDriver = (order: Order) => {
    setSelectedOrderForRating(order);
    setShowRatingModal(true);
  };

  const handleRatingSubmitted = () => {
    loadOrders();
  };

  const handleModifyOrder = (order: Order) => {
    router.push(`/(client)/merchant-shop?merchantId=${order.merchant_id}`);
  };

  const canModifyOrder = (status: string) => {
    return ['pending', 'confirmed'].includes(status);
  };

  const canCancelOrder = (status: string) => {
    return ['pending', 'confirmed', 'accepted', 'preparing'].includes(status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#ff9800';
      case 'confirmed':
        return '#2196f3';
      case 'accepted':
        return '#2196f3';
      case 'preparing':
        return '#9c27b0';
      case 'ready':
        return '#00bcd4';
      case 'in_delivery':
        return '#ff5722';
      case 'in_progress':
        return '#9c27b0';
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
      case 'in_progress':
        return 'En cours';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes Commandes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Mes Commandes</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {orders.length === 0 ? (
          <Text style={styles.emptyText}>Aucune commande pour le moment</Text>
        ) : (
          orders.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => router.push(`/(client)/order-details?orderId=${order.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <View style={styles.statusBadge} style={{ backgroundColor: getStatusColor(order.status) + '20' }}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {getStatusText(order.status)}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#999" />
                </View>

                {order.status === 'pending' && (
                  <View style={styles.headerActions}>
                    {canModifyOrder(order.status) && (
                      <TouchableOpacity
                        style={styles.modifyButtonHeader}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleModifyOrder(order);
                        }}
                      >
                        <Edit size={14} color="#2563eb" />
                        <Text style={styles.modifyButtonTextHeader}>Modifier</Text>
                      </TouchableOpacity>
                    )}

                    {canCancelOrder(order.status) && (
                      <TouchableOpacity
                        style={styles.cancelButtonHeader}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCancelOrder(order.id);
                        }}
                      >
                        <XCircle size={14} color="#f44336" />
                        <Text style={styles.cancelButtonTextHeader}>Annuler</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                <Text style={styles.orderDate}>
                  {new Date(order.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>

              <View style={styles.orderInfo}>
                <View style={styles.infoRow}>
                  <Package size={18} color="#666" />
                  <Text style={styles.merchantNameText} numberOfLines={1} ellipsizeMode="tail">{order.merchant_name}</Text>
                </View>
                {order.items_preview && (
                  <View style={styles.infoRow}>
                    <ShoppingBag size={16} color="#2563eb" />
                    <Text style={styles.itemsPreviewText} numberOfLines={1} ellipsizeMode="tail">{order.items_preview}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <MapPin size={18} color="#666" />
                  <View style={styles.addressContainer}>
                    <Text style={styles.locationText} numberOfLines={1} ellipsizeMode="tail">
                      {(order.delivery_latitude && order.delivery_longitude) && (
                        <Text style={styles.coordinatesText}>
                          {`${order.delivery_longitude.toFixed(6)}, ${order.delivery_latitude.toFixed(6)}`}
                        </Text>
                      )}
                      {order.delivery_neighborhood && (
                        <Text style={styles.neighborhoodInlineText}>
                          {' '}{order.delivery_neighborhood}
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
                {order.driver_name && (
                  <View style={styles.infoRow}>
                    <User size={18} color="#666" />
                    <Text style={styles.infoText} numberOfLines={1} ellipsizeMode="tail">Livreur: {order.driver_name}</Text>
                  </View>
                )}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.totalAmount} numberOfLines={1} ellipsizeMode="tail">
                  {(order.total || 0).toLocaleString()} F CFA
                </Text>

                <View style={styles.orderActions}>
                  {order.status === 'in_delivery' && (
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleConfirmDelivery(order.id);
                      }}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.confirmButtonText}>Confirmer la réception</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'delivered' && order.driver_id && !order.has_rating && (
                    <TouchableOpacity
                      style={styles.rateButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRateDriver(order);
                      }}
                    >
                      <Star size={16} color="#FFB800" />
                      <Text style={styles.rateButtonText}>Évaluer le livreur</Text>
                    </TouchableOpacity>
                  )}

                  {order.status === 'delivered' && order.has_rating && order.rating_data && (
                    <View style={styles.ratingDisplay}>
                      <Text style={styles.ratingLabel}>Votre évaluation:</Text>
                      <StarRating
                        rating={order.rating_data.rating}
                        size={14}
                        showNumber={false}
                      />
                    </View>
                  )}

                  {order.status !== 'pending' && canModifyOrder(order.status) && (
                    <TouchableOpacity
                      style={styles.modifyButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleModifyOrder(order);
                      }}
                    >
                      <Edit size={16} color="#2563eb" />
                      <Text style={styles.modifyButtonText}>Modifier</Text>
                    </TouchableOpacity>
                  )}

                  {order.status !== 'pending' && canCancelOrder(order.status) && (
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleCancelOrder(order.id);
                      }}
                    >
                      <XCircle size={16} color="#f44336" />
                      <Text style={styles.cancelButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  )}

                  {canDeleteOrder(order) && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteOrder(order.id);
                      }}
                    >
                      <Trash2 size={16} color="#f44336" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <AppFooter />
      </ScrollView>

      {selectedOrderForRating && (
        <DriverRating
          visible={showRatingModal}
          onClose={() => {
            setShowRatingModal(false);
            setSelectedOrderForRating(null);
          }}
          orderId={selectedOrderForRating.id}
          driverId={selectedOrderForRating.driver_id!}
          clientId={profile?.id!}
          driverName={selectedOrderForRating.driver_name || 'Livreur'}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
  },
  orderInfo: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  merchantNameText: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '700',
    flex: 1,
  },
  itemsPreviewText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  addressContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  coordinatesText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  neighborhoodInlineText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  neighborhoodText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  orderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  modifyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f44336',
  },
  deleteButton: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modifyButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  modifyButtonTextHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563eb',
  },
  cancelButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  cancelButtonTextHeader: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f44336',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB800',
  },
  rateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CC9200',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
