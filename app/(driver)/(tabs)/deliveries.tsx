import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Linking, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

export default function DeliveriesScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [ongoingDeliveries, setOngoingDeliveries] = useState<any[]>([]);
  const [driverData, setDriverData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const previousDeliveryCountRef = useRef<number>(0);

  useEffect(() => {
    loadDriverData();
  }, [profile]);

  useEffect(() => {
    if (driverData) {
      loadOngoingDeliveries();

      console.log('Setting up realtime subscription for driver:', driverData.id);

      const subscription = supabase
        .channel(`driver_orders_${driverData.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `driver_id=eq.${driverData.id}`
          },
          (payload) => {
            console.log('Realtime update received:', payload);
            console.log('Event type:', payload.eventType);
            console.log('New order data:', payload.new);
            loadOngoingDeliveries();
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to driver orders channel');
          }
        });

      return () => {
        console.log('Unsubscribing from driver orders channel');
        subscription.unsubscribe();
      };
    }
  }, [driverData]);

  useFocusEffect(
    useCallback(() => {
      if (driverData) {
        loadOngoingDeliveries();
      }
    }, [driverData])
  );

  const loadDriverData = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setDriverData(data);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
  };

  const playNewOrderSound = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        allowsRecordingIOS: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' },
        { shouldPlay: true, volume: 0.8 }
      );

      setTimeout(async () => {
        await sound.unloadAsync();
      }, 1000);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const loadOngoingDeliveries = async (isRefreshing = false) => {
    if (!driverData?.id) {
      console.log('Cannot load deliveries: missing driver data');
      return;
    }

    console.log('=== Loading ongoing deliveries ===');
    console.log('Driver ID:', driverData.id);
    console.log('Profile ID:', profile?.id);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          merchant:merchants(shop_name, neighborhood, address),
          client:user_profiles!orders_client_id_fkey(first_name, last_name, whatsapp_number, latitude, longitude),
          delivery_address:addresses!orders_delivery_address_id_fkey(full_address, latitude, longitude)
        `)
        .eq('driver_id', driverData.id)
        .in('status', ['pending_driver_acceptance', 'accepted', 'preparing', 'ready', 'in_delivery', 'delivered'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error loading deliveries:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Query successful - Found deliveries:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Delivery statuses:', data.map(d => ({ id: d.id, status: d.status })));

        const pendingAcceptance = data.filter(d => d.status === 'pending_driver_acceptance').length;
        const previousPending = ongoingDeliveries.filter(d => d.status === 'pending_driver_acceptance').length;

        if (pendingAcceptance > previousPending && previousDeliveryCountRef.current > 0) {
          console.log('🔔 NEW ORDER DETECTED! Playing notification...');
          await playNewOrderSound();
          if (Platform.OS !== 'web') {
            Alert.alert(
              '🔔 Nouvelle Course!',
              'Vous avez reçu une nouvelle demande de course!',
              [{ text: 'OK' }]
            );
          }
        }
      }

      previousDeliveryCountRef.current = data?.length || 0;
      setOngoingDeliveries(data || []);
    } catch (error) {
      console.error('Error loading ongoing deliveries:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur lors du chargement des livraisons');
      } else {
        Alert.alert('Erreur', 'Erreur lors du chargement des livraisons');
      }
    } finally {
      if (isRefreshing) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOngoingDeliveries(true);
  }, [driverData]);

  const openMapForAddress = (latitude: number | null, longitude: number | null, address: string) => {
    if (!latitude || !longitude) {
      if (Platform.OS === 'web') {
        window.alert('Coordonnées GPS non disponibles pour cette adresse');
      } else {
        Alert.alert('Erreur', 'Coordonnées GPS non disponibles pour cette adresse');
      }
      return;
    }

    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${encodeURIComponent(address)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(err => {
        console.error('Error opening maps:', err);
        Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de cartographie');
      });
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      if (Platform.OS === 'web') {
        window.alert(`Statut mis à jour: La commande est maintenant: ${getStatusLabel(newStatus)}`);
      } else {
        Alert.alert('Statut mis à jour', `La commande est maintenant: ${getStatusLabel(newStatus)}`);
      }
      loadOngoingDeliveries();
    } catch (error: any) {
      console.error('Error updating order status:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible de mettre à jour le statut'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de mettre à jour le statut');
      }
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const { data: orderData, error: orderFetchError } = await supabase
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .single();

      if (orderFetchError) throw orderFetchError;

      const { error } = await supabase
        .from('orders')
        .update({ status: 'accepted' })
        .eq('id', orderId);

      if (error) throw error;

      await supabase
        .from('user_notifications')
        .insert({
          user_id: orderData.client_id,
          title: 'Course acceptée!',
          message: 'Le livreur a accepté votre course. Vous pouvez suivre sa progression.',
          type: 'order_accepted',
          data: { order_id: orderId }
        });

      if (Platform.OS === 'web') {
        window.alert('Course acceptée! Vous pouvez maintenant voir les détails.');
      } else {
        Alert.alert('Succès', 'Course acceptée! Vous pouvez maintenant voir les détails.');
      }
      loadOngoingDeliveries();
    } catch (error: any) {
      console.error('Error accepting order:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible d\'accepter la course'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible d\'accepter la course');
      }
    }
  };

  const rejectOrder = async (orderId: string) => {
    try {
      const { data: orderData, error: orderFetchError } = await supabase
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .single();

      if (orderFetchError) throw orderFetchError;

      const { error } = await supabase
        .from('orders')
        .update({ status: 'rejected', driver_id: null })
        .eq('id', orderId);

      if (error) throw error;

      await supabase
        .from('user_notifications')
        .insert({
          user_id: orderData.client_id,
          title: 'Course refusée',
          message: 'Le livreur a refusé votre course. Veuillez sélectionner un autre livreur.',
          type: 'order_rejected',
          data: { order_id: orderId }
        });

      if (Platform.OS === 'web') {
        window.alert('Course refusée');
      } else {
        Alert.alert('Course refusée', 'La course a été refusée');
      }
      loadOngoingDeliveries();
    } catch (error: any) {
      console.error('Error rejecting order:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible de refuser la course'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de refuser la course');
      }
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending_driver_acceptance':
        return 'En attente de votre acceptation';
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
      default:
        return status;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Mes Livraisons</Text>
          <TouchableOpacity
            onPress={() => loadOngoingDeliveries()}
            style={styles.refreshButton}
          >
            <RefreshCw size={20} color="#2563eb" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        }
      >
        {ongoingDeliveries.length > 0 ? (
          ongoingDeliveries.map((order) => (
            <View key={order.id} style={styles.ongoingDeliveryCard}>
              <View style={styles.ongoingHeader}>
                <View style={styles.ongoingHeaderLeft}>
                  <Text style={styles.ongoingMerchant}>
                    {order.merchant?.shop_name || 'Boutique'}
                  </Text>
                  <Text style={styles.ongoingClient}>
                    Client: {order.client?.first_name} {order.client?.last_name} • {order.client?.whatsapp_number}
                  </Text>
                </View>
                <View style={styles.ongoingHeaderRight}>
                  {order.is_express && (
                    <View style={styles.expressTag}>
                      <Text style={styles.expressTagText}>EXPRESS</Text>
                    </View>
                  )}
                  <View style={styles.earningsTag}>
                    <Text style={styles.earningsAmount}>{order.is_express ? '1 500' : '1 000'}</Text>
                    <Text style={styles.earningsCurrency}>F CFA</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.ongoingAddress}
                onPress={() =>
                  openMapForAddress(
                    order.client?.latitude,
                    order.client?.longitude,
                    order.delivery_address?.full_address || 'Adresse de livraison'
                  )
                }
              >
                <MapPin size={16} color="#2563eb" />
                <Text style={styles.ongoingAddressText}>
                  Livraison: {order.delivery_address?.full_address || 'Adresse de livraison'}
                </Text>
              </TouchableOpacity>
              {order.client?.latitude && order.client?.longitude && (
                <View style={styles.clientGpsInfo}>
                  <MapPin size={12} color="#2563eb" />
                  <Text style={styles.clientGpsText}>
                    Position client: Long {order.client.longitude.toFixed(6)}, Lat {order.client.latitude.toFixed(6)}
                  </Text>
                </View>
              )}

              {order.status === 'pending_driver_acceptance' ? (
                <View style={styles.pendingActions}>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>NOUVELLE DEMANDE</Text>
                  </View>
                  <View style={styles.acceptRejectButtons}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => rejectOrder(order.id)}
                    >
                      <Text style={styles.rejectButtonText}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptButton}
                      onPress={() => acceptOrder(order.id)}
                    >
                      <Text style={styles.acceptButtonText}>Accepter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.statusSelector}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      order.status === 'accepted' && styles.statusButtonActive,
                    ]}
                    onPress={() => updateOrderStatus(order.id, 'accepted')}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        order.status === 'accepted' && styles.statusButtonTextActive,
                      ]}
                    >
                      Acceptée
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      order.status === 'ready' && styles.statusButtonActive,
                    ]}
                    onPress={() => updateOrderStatus(order.id, 'ready')}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        order.status === 'ready' && styles.statusButtonTextActive,
                      ]}
                    >
                      Prête
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      order.status === 'in_delivery' && styles.statusButtonActive,
                    ]}
                    onPress={() => updateOrderStatus(order.id, 'in_delivery')}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        order.status === 'in_delivery' && styles.statusButtonTextActive,
                      ]}
                    >
                      En livraison
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      order.status === 'delivered' && styles.statusButtonActive,
                    ]}
                    onPress={() => updateOrderStatus(order.id, 'delivered')}
                  >
                    <Text
                      style={[
                        styles.statusButtonText,
                        order.status === 'delivered' && styles.statusButtonTextActive,
                      ]}
                    >
                      Livrée
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Aucune livraison en cours</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 40,
  },
  ongoingDeliveryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 16,
  },
  ongoingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ongoingHeaderLeft: {
    flex: 1,
  },
  ongoingHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ongoingMerchant: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  ongoingClient: {
    fontSize: 12,
    color: '#666',
  },
  expressTag: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  earningsTag: {
    alignItems: 'flex-end',
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  earningsCurrency: {
    fontSize: 10,
    color: '#16a34a',
    fontWeight: '500',
  },
  expressTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  ongoingAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ongoingAddressText: {
    fontSize: 13,
    color: '#2563eb',
    flex: 1,
    textDecorationLine: 'underline',
  },
  clientGpsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  clientGpsText: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  pendingActions: {
    marginTop: 16,
    gap: 12,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  pendingBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#d97706',
    textAlign: 'center',
  },
  acceptRejectButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
