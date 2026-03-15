import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Switch } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Package, DollarSign, MapPin, Zap, Bike } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { DriverEarningsDashboard } from '@/components/DriverEarningsDashboard';
import SystemNotificationBanner from '@/components/SystemNotificationBanner';
import { startGPSTracking, stopGPSTracking } from '@/lib/gpsTracking';
import { Audio } from 'expo-av';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [isAvailable, setIsAvailable] = useState(false);
  const [acceptsExpress, setAcceptsExpress] = useState(false);
  const [driverData, setDriverData] = useState<any>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [todayDeliveries, setTodayDeliveries] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayExpressCount, setTodayExpressCount] = useState(0);
  const hasPlayedSound = useRef(false);

  const playNotificationSound = async () => {
    if (Platform.OS === 'web') return;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { shouldPlay: true }
      );
      await sound.playAsync();
      setTimeout(() => {
        sound.unloadAsync();
      }, 3000);
    } catch (error) {
      console.log('Error playing notification sound:', error);
    }
  };

  useEffect(() => {
    loadDriverData();
    requestLocationPermission();
    loadTodayStats();

    return () => {
      stopGPSTracking();
    };
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadTodayStats();
    }, [driverData])
  );

  useEffect(() => {
    if (driverData?.id) {
      loadAvailableOrders();
      const subscription = supabase
        .channel('driver_pending_orders')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `driver_id=eq.${driverData.id}`
          },
          (payload) => {
            console.log('Order change detected:', payload);
            hasPlayedSound.current = false;
            loadAvailableOrders();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      setAvailableOrders([]);
    }
  }, [driverData?.id]);

  useFocusEffect(
    useCallback(() => {
      if (driverData) {
        loadAvailableOrders();
      }
    }, [driverData])
  );

  useEffect(() => {
    if (driverData) {
      loadAvailableOrders();
    }
  }, [acceptsExpress]);

  useEffect(() => {
    if (location && profile) {
      updateDriverLocation();
    }
  }, [location]);

  const loadDriverData = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setDriverData(data);
        setIsAvailable(data.is_available || false);
        setAcceptsExpress(data.accepts_express_delivery || false);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
  };

  const loadTodayStats = async () => {
    if (!driverData?.id) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('is_express')
        .eq('driver_id', driverData.id)
        .in('status', ['accepted', 'preparing', 'ready', 'in_delivery', 'delivered'])
        .gte('created_at', todayISO);

      if (error) throw error;

      const deliveries = data?.length || 0;
      const expressCount = data?.filter(order => order.is_express).length || 0;
      const regularCount = deliveries - expressCount;

      const earnings = (regularCount * 1000) + (expressCount * 1500);

      setTodayDeliveries(deliveries);
      setTodayExpressCount(expressCount);
      setTodayEarnings(earnings);
    } catch (error) {
      console.error('Error loading today stats:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          window.alert('Permission requise: La localisation est nécessaire pour recevoir des courses dans votre zone');
        } else {
          Alert.alert(
            'Permission requise',
            'La localisation est nécessaire pour recevoir des courses dans votre zone'
          );
        }
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 100,
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const updateDriverLocation = async () => {
    if (!profile?.id || !location) return;

    try {
      await supabase
        .from('user_profiles')
        .update({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
        .eq('id', profile.id);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const getStatusBadge = () => {
    if (!profile) return null;

    let statusColor = '#f0ad4e';
    let statusText = 'En attente de validation';

    if (profile.status === 'active') {
      statusColor = isAvailable ? '#5cb85c' : '#999';
      statusText = isAvailable ? 'Disponible' : 'Hors ligne';
    } else if (profile.status === 'suspended') {
      statusColor = '#d9534f';
      statusText = 'Suspendu';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    );
  };

  const loadAvailableOrders = async () => {
    if (!driverData?.id) {
      console.log('Cannot load available orders: missing driver data');
      return;
    }

    console.log('Loading pending orders assigned to driver...');

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          merchant:merchants(shop_name, neighborhood, address),
          client:user_profiles!orders_client_id_fkey(first_name, last_name, whatsapp_number),
          delivery_address:addresses!orders_delivery_address_id_fkey(full_address, neighborhood, latitude, longitude)
        `)
        .eq('status', 'pending_driver_acceptance')
        .eq('driver_id', driverData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error loading orders:', error);
        throw error;
      }

      console.log('Loaded pending orders for acceptance:', data?.length || 0);
      setAvailableOrders(data || []);

      if (data && data.length > 0 && !hasPlayedSound.current) {
        playNotificationSound();
        hasPlayedSound.current = true;
      }
    } catch (error) {
      console.error('Error loading available orders:', error);
    }
  };

  const toggleAvailability = async () => {
    if (profile?.status !== 'active' || !driverData) return;

    const newAvailability = !isAvailable;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ is_available: newAvailability })
        .eq('id', driverData.id);

      if (error) throw error;
      setIsAvailable(newAvailability);

      if (newAvailability && profile?.id) {
        const started = await startGPSTracking(profile.id, (location) => {
          console.log('Driver location updated:', location);
        }, 30000);

        if (!started) {
          console.warn('GPS tracking could not be started');
        }
      } else {
        await stopGPSTracking();
      }

      if (Platform.OS === 'web') {
        if (newAvailability) {
          window.alert('Statut mis à jour: Vous êtes maintenant disponible pour les courses');
        } else {
          window.alert('Statut mis à jour: Vous êtes maintenant hors ligne');
        }
      } else {
        if (newAvailability) {
          Alert.alert('Statut mis à jour', 'Vous êtes maintenant disponible pour les courses');
        } else {
          Alert.alert('Statut mis à jour', 'Vous êtes maintenant hors ligne');
        }
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: Impossible de mettre à jour votre statut');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour votre statut');
      }
    }
  };

  const toggleExpressDelivery = async (value: boolean) => {
    if (profile?.status !== 'active' || !driverData) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .update({ accepts_express_delivery: value })
        .eq('id', driverData.id);

      if (error) throw error;
      setAcceptsExpress(value);

      if (Platform.OS === 'web') {
        if (value) {
          window.alert('Vous acceptez maintenant les livraisons express (10 min)');
        } else {
          window.alert('Vous n\'acceptez plus les livraisons express');
        }
      } else {
        if (value) {
          Alert.alert('Express activé', 'Vous acceptez maintenant les livraisons express (10 min)');
        } else {
          Alert.alert('Express désactivé', 'Vous n\'acceptez plus les livraisons express');
        }
      }
    } catch (error) {
      console.error('Error toggling express delivery:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: Impossible de mettre à jour vos préférences');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour vos préférences');
      }
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!profile?.id || !driverData) {
      console.log('Cannot accept order: missing profile or driver data');
      return;
    }

    console.log('Accepting order:', orderId, 'Driver ID:', driverData.id);

    try {
      const orderToAccept = availableOrders.find(o => o.id === orderId);
      if (!orderToAccept) {
        throw new Error('Order not found');
      }

      const { data, error } = await supabase
        .from('orders')
        .update({
          driver_id: driverData.id,
          status: 'accepted',
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error accepting order:', error);
        throw error;
      }

      console.log('Order accepted successfully:', data);

      const deliveryFee = orderToAccept.is_express ? 1500 : 1000;

      await supabase
        .from('driver_earnings')
        .insert({
          driver_id: driverData.id,
          order_id: orderId,
          amount: deliveryFee,
          earning_type: 'delivery_fee',
          description: orderToAccept.is_express ? 'Frais de livraison express' : 'Frais de livraison standard',
          status: 'pending',
        });

      const { data: conversationData, error: convError } = await supabase
        .from('order_conversations')
        .insert({
          order_id: orderId,
          driver_id: driverData.id,
          client_id: orderToAccept.client_id,
        })
        .select()
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
      } else {
        const merchantName = orderToAccept.merchant?.shop_name || 'une boutique';
        const deliveryType = orderToAccept.is_express ? 'livraison express' : 'livraison standard';

        const welcomeMessage = `Bonjour! Je suis votre livreur. J'ai bien reçu votre commande de ${merchantName}. Il s'agit d'une ${deliveryType}. Je suis entièrement disponible pour vous livrer. Êtes-vous d'accord pour que je vous livre cette commande?\nSi oui, veuillez procéder au PAIEMENT et cliquer sur l'icone GPS (en bas à gauche de l'écran) pour m'envoyer vos coordonnées svp.\nÀ bientôt !`;

        await supabase
          .from('user_notifications')
          .insert({
            user_id: orderToAccept.client_id,
            title: 'Livreur trouvé!',
            message: `Votre livreur a accepté votre course. Veuillez procéder au paiement.`,
            type: 'order_accepted',
            data: { order_id: orderId }
          });

        const { error: msgError } = await supabase
          .from('order_messages')
          .insert({
            conversation_id: conversationData.id,
            sender_id: profile.id,
            message: welcomeMessage,
          });

        if (msgError) {
          console.error('Error sending welcome message:', msgError);
        } else {
          await supabase
            .from('order_conversations')
            .update({
              last_message: welcomeMessage,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', conversationData.id);
        }
      }

      setAvailableOrders(prev => {
        const filtered = prev.filter(order => order.id !== orderId);
        console.log('Remaining available orders:', filtered.length);
        return filtered;
      });

      loadTodayStats();

      if (conversationData?.id) {
        router.push({
          pathname: '/(driver)/conversation',
          params: { conversationId: conversationData.id },
        });
      } else {
        router.push('/(driver)/(tabs)/deliveries');
      }
    } catch (error: any) {
      console.error('Error accepting order:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible d\'accepter la course'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible d\'accepter la course');
      }
    }
  };

  const formatOrderTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) {
      return 'À l\'instant';
    } else if (minutes < 60) {
      return `Il y a ${minutes} min`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return `Il y a ${hours} h`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const formatFullDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeclineOrder = async (orderId: string) => {
    if (!profile?.id) return;

    try {
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          driver_id: null,
          status: 'pending',
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      const { data: orderData } = await supabase
        .from('orders')
        .select('client_id')
        .eq('id', orderId)
        .single();

      if (orderData?.client_id) {
        const { error: messageError } = await supabase
          .from('order_messages')
          .insert({
            order_id: orderId,
            sender_id: profile.id,
            message: 'Le livreur a décliné cette course. Veuillez sélectionner un autre livreur.',
            is_system_message: true,
          });

        if (messageError) {
          console.error('Error sending decline notification:', messageError);
        }
      }

      setAvailableOrders(prev => prev.filter(order => order.id !== orderId));

      if (Platform.OS === 'web') {
        window.alert('Course déclinée');
      } else {
        Alert.alert('Course déclinée', 'Le client sera notifié');
      }
    } catch (error: any) {
      console.error('Error declining order:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible de décliner la course'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de décliner la course');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.logo}>ORDERS App</Text>
        {profile && (
          <Text style={styles.subtitle}>
            Bienvenue {profile.first_name} {profile.last_name} 👋
          </Text>
        )}
        {getStatusBadge()}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <SystemNotificationBanner onDismiss={() => router.push('/(driver)/(tabs)/messages')} />
        {profile?.status === 'pending' && (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Compte en attente</Text>
            <Text style={styles.alertText}>
              Votre compte est en cours de vérification. Vous serez notifié une fois
              votre profil validé et vous pourrez commencer à accepter des courses.
            </Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Package size={32} color="#1a1a1a" />
            <Text style={styles.statValue}>{todayDeliveries}</Text>
            <Text style={styles.statLabel}>Courses du jour</Text>
            {todayExpressCount > 0 && (
              <View style={styles.expressBadge}>
                <Zap size={12} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.expressBadgeText}>{todayExpressCount} express</Text>
              </View>
            )}
          </View>

          <View style={styles.statCard}>
            <DollarSign size={32} color="#1a1a1a" />
            <View style={styles.currencyContainer}>
              <Text style={styles.statValue}>{todayEarnings.toLocaleString()}</Text>
              <Text style={styles.currencyLabel}>F CFA</Text>
            </View>
            <Text style={styles.statLabel}>Gains du jour</Text>
            <Text style={styles.earningsNote}>
              1 000 F/course + 500 F express
            </Text>
          </View>
        </View>

        {profile?.status === 'active' && (
          <>
            <TouchableOpacity
              style={[
                styles.availabilityButton,
                isAvailable && styles.availabilityButtonActive,
              ]}
              onPress={toggleAvailability}
            >
              <Text style={styles.availabilityButtonText}>
                {isAvailable ? 'Je suis hors ligne' : 'Je suis disponible'}
              </Text>
            </TouchableOpacity>

            <View style={styles.expressToggleCard}>
              <View style={styles.expressToggleContent}>
                <View style={styles.expressToggleLeft}>
                  <Zap size={24} color="#f59e0b" fill={acceptsExpress ? '#f59e0b' : 'none'} />
                  <View style={styles.expressToggleText}>
                    <Text style={styles.expressToggleTitle}>Livraisons Express</Text>
                    <Text style={styles.expressToggleSubtitle}>
                      Accepter les livraisons en 10 minutes maximum
                    </Text>
                  </View>
                </View>
                <Switch
                  value={acceptsExpress}
                  onValueChange={toggleExpressDelivery}
                  trackColor={{ false: '#e0e0e0', true: '#fbbf24' }}
                  thumbColor={acceptsExpress ? '#f59e0b' : '#f5f5f5'}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.headerLeft}>
                  <Bike size={24} color="#1a1a1a" />
                  <Text style={styles.sectionTitle}>Courses disponibles</Text>
                </View>
                {availableOrders.length > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>{availableOrders.length}</Text>
                  </View>
                )}
              </View>
              {availableOrders.length > 0 ? (
                <>
                  {!isAvailable && (
                    <View style={styles.offlineWarning}>
                      <Text style={styles.offlineWarningText}>
                        ⚠️ Vous êtes hors ligne. Passez en disponible pour accepter ces courses.
                      </Text>
                    </View>
                  )}
                  {availableOrders.map((order) => (
                    <View key={order.id} style={[styles.deliveryCard, !isAvailable && styles.deliveryCardDisabled]}>
                      <View style={styles.deliveryHeader}>
                        <View style={styles.deliveryHeaderLeft}>
                          <Text style={styles.deliveryMerchant}>
                            {order.merchant?.shop_name || 'Boutique'}
                          </Text>
                          <Text style={styles.deliveryDistance}>
                            {order.merchant?.neighborhood || 'Quartier'}
                          </Text>
                          <Text style={styles.orderTimestamp}>
                            {formatOrderTime(order.created_at)}
                          </Text>
                          <Text style={styles.orderFullDateTime}>
                            {formatFullDateTime(order.created_at)}
                          </Text>
                        </View>
                        <View style={styles.deliveryPriceContainer}>
                          <Text style={styles.deliveryPrice}>{order.is_express ? '1 500' : '1 000'}</Text>
                          <Text style={styles.deliveryPriceCurrency}>F CFA</Text>
                        </View>
                      </View>
                      <View style={styles.deliveryDetails}>
                        <MapPin size={14} color="#2563eb" />
                        <Text style={styles.deliveryAddress}>
                          Vers: {order.delivery_address?.full_address || 'Adresse de livraison'}
                        </Text>
                      </View>
                      {order.is_express && (
                        <View style={styles.expressTag}>
                          <Text style={styles.expressTagText}>EXPRESS</Text>
                        </View>
                      )}
                      <View style={styles.deliveryActions}>
                        <TouchableOpacity
                          style={[styles.declineButton, !isAvailable && styles.buttonDisabled]}
                          onPress={() => isAvailable && handleDeclineOrder(order.id)}
                          disabled={!isAvailable}
                        >
                          <Text style={[styles.declineButtonText, !isAvailable && styles.buttonTextDisabled]}>Décliner</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.acceptButton, !isAvailable && styles.buttonDisabled]}
                          onPress={() => isAvailable && handleAcceptOrder(order.id)}
                          disabled={!isAvailable}
                        >
                          <Text style={[styles.acceptButtonText, !isAvailable && styles.buttonTextDisabled]}>Accepter</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.emptyText}>Aucune course disponible pour le moment</Text>
              )}
            </View>

            {driverData?.id && (
              <DriverEarningsDashboard driverId={driverData.id} />
            )}
          </>
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
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  availabilityButton: {
    backgroundColor: '#5cb85c',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginVertical: 16,
  },
  availabilityButtonActive: {
    backgroundColor: '#999',
  },
  availabilityButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  alertCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
    marginBottom: 4,
  },
  currencyContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  expressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 4,
  },
  expressBadgeText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
  },
  earningsNote: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  offlineWarning: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  offlineWarningText: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  deliveryCardDisabled: {
    opacity: 0.6,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  deliveryHeaderLeft: {
    flex: 1,
  },
  deliveryMerchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  deliveryDistance: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  orderTimestamp: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '500',
  },
  orderFullDateTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  deliveryPriceContainer: {
    alignItems: 'flex-end',
  },
  deliveryPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5cb85c',
  },
  deliveryPriceCurrency: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  deliveryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  deliveryAddress: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  deliveryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  acceptButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#5cb85c',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextDisabled: {
    opacity: 0.7,
  },
  ongoingDeliveryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ongoingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    marginBottom: 12,
    alignSelf: 'flex-start',
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
  },
  ongoingAddressText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
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
  expressToggleCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  expressToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expressToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  expressToggleText: {
    flex: 1,
  },
  expressToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 4,
  },
  expressToggleSubtitle: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  pendingBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
