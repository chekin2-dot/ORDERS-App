import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, Star, Bike, Car, Truck, Zap, X, CheckCircle, Navigation, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { StarRating } from '@/components/StarRating';

interface Driver {
  id: string;
  user_id: string;
  vehicle_type: string;
  delivery_zones: string[];
  is_available: boolean;
  verification_status: string;
  accepts_express_delivery: boolean;
  average_rating?: number;
  total_ratings?: number;
  distance?: number | null;
  user_profiles: {
    first_name: string;
    last_name: string;
    phone: string;
    profile_photo_url: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

interface OrderDetails {
  id: string;
  merchant_id: string;
  is_express: boolean;
  delivery_address: string;
  delivery_fee: number;
  express_bonus: number;
  merchants: {
    shop_name: string;
  };
}

export default function SelectDriverScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const neighborhood = params.neighborhood as string;
  const orderId = params.orderId as string;
  const totalAmount = params.total as string;

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [assigningDriver, setAssigningDriver] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [clientLocation, setClientLocation] = useState<{latitude: number; longitude: number} | null>(null);

  useEffect(() => {
    loadAvailableDrivers();
    if (orderId) {
      loadOrderDetails();
    }
  }, [neighborhood, orderId]);

  const loadOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          merchant_id,
          is_express,
          delivery_address,
          delivery_fee,
          express_bonus,
          merchants (
            shop_name
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrderDetails(data as any);
    } catch (error) {
      console.error('Error loading order details:', error);
    }
  };

  const loadAvailableDrivers = async () => {
    setLoading(true);
    try {
      // Get client's location first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: clientProfile } = await supabase
        .from('user_profiles')
        .select('latitude, longitude')
        .eq('id', user.id)
        .maybeSingle();

      const clientLat = clientProfile?.latitude;
      const clientLon = clientProfile?.longitude;

      if (clientLat && clientLon) {
        setClientLocation({ latitude: clientLat, longitude: clientLon });
      }

      // Fetch ALL drivers in the zone (both available and unavailable)
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          id,
          user_id,
          vehicle_type,
          delivery_zones,
          is_available,
          verification_status,
          accepts_express_delivery,
          user_profiles (
            first_name,
            last_name,
            phone,
            profile_photo_url,
            latitude,
            longitude
          )
        `)
        .eq('verification_status', 'verified')
        .contains('delivery_zones', [neighborhood]);

      if (error) throw error;

      const driversWithDetails = await Promise.all(
        (data || []).map(async (driver: any) => {
          // Get driver ratings
          const { data: ratingData } = await supabase.rpc('get_driver_average_rating', {
            p_driver_id: driver.id,
          });

          // Extract user_profiles (Supabase returns it as an array with one object)
          const userProfile = Array.isArray(driver.user_profiles)
            ? driver.user_profiles[0]
            : driver.user_profiles;

          // Calculate distance if both coordinates are available
          let distance = null;
          if (clientLat && clientLon && userProfile?.latitude && userProfile?.longitude) {
            const { data: distanceData } = await supabase.rpc('calculate_distance', {
              lat1: clientLat,
              lon1: clientLon,
              lat2: userProfile.latitude,
              lon2: userProfile.longitude,
            });
            distance = distanceData;
          }

          return {
            ...driver,
            user_profiles: userProfile,
            average_rating: ratingData?.[0]?.average_rating || 0,
            total_ratings: ratingData?.[0]?.total_ratings || 0,
            distance,
          };
        })
      );

      // Sort drivers: available first, then by distance
      const sortedDrivers = driversWithDetails.sort((a, b) => {
        // Available drivers first
        if (a.is_available && !b.is_available) return -1;
        if (!a.is_available && b.is_available) return 1;

        // Then by distance (closest first)
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;

        return 0;
      });

      setDrivers(sortedDrivers);
    } catch (error) {
      console.error('Error loading drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType.toLowerCase()) {
      case 'moto':
      case 'motorcycle':
        return Bike;
      case 'car':
      case 'voiture':
        return Car;
      case 'truck':
      case 'camion':
        return Truck;
      default:
        return Bike;
    }
  };

  const handleSelectDriver = (driver: Driver) => {
    if (assigningDriver) return;

    // Don't allow selection of unavailable drivers
    if (!driver.is_available) {
      if (Platform.OS === 'web') {
        window.alert('Livreur indisponible\n\nCe livreur est actuellement indisponible. Veuillez en choisir un autre.');
      } else {
        Alert.alert(
          'Livreur indisponible',
          'Ce livreur est actuellement indisponible. Veuillez en choisir un autre.',
          [{ text: 'OK' }]
        );
      }
      return;
    }

    setSelectedDriver(driver);
    setShowConfirmModal(true);
  };

  const formatDistance = (distance: number | null | undefined): string => {
    if (distance === null || distance === undefined) return 'Distance inconnue';
    if (distance < 1) return `${(distance * 1000).toFixed(0)} m`;
    return `${distance.toFixed(1)} km`;
  };

  const estimateDeliveryTime = (distance: number | null | undefined, vehicleType: string): string => {
    if (distance === null || distance === undefined) return '~';

    // Average speeds in km/h
    const speeds: { [key: string]: number } = {
      moto: 30,
      motorcycle: 30,
      car: 25,
      voiture: 25,
      truck: 20,
      camion: 20,
    };

    const speed = speeds[vehicleType.toLowerCase()] || 25;
    const timeInHours = distance / speed;
    const timeInMinutes = Math.ceil(timeInHours * 60);

    return `~${timeInMinutes} min`;
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
    router.push({
      pathname: '/(client)/order-details',
      params: { orderId }
    });
  };

  const handleConfirmDriver = async () => {
    console.log('=== handleConfirmDriver called ===');
    console.log('orderId:', orderId);
    console.log('selectedDriver:', selectedDriver);
    console.log('assigningDriver:', assigningDriver);

    if (!orderId || !selectedDriver || assigningDriver) {
      console.log('Cannot confirm: missing data or already assigning');
      return;
    }

    console.log('Starting confirmation process for driver:', selectedDriver.id);
    console.log('Selected driver user_id:', selectedDriver.user_id);
    setAssigningDriver(selectedDriver.id);

    try {
      console.log('Step 1: Getting authenticated user');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        throw new Error('Non authentifié');
      }
      console.log('User authenticated:', user.id);

      console.log('Step 2: Assigning driver to order (pending driver acceptance)');
      console.log('Assigning driver_id:', selectedDriver.id);
      console.log('Setting status to: pending_driver_acceptance');

      const { data: updateData, error: orderError } = await supabase
        .from('orders')
        .update({
          driver_id: selectedDriver.id,
          status: 'pending_driver_acceptance',
        })
        .eq('id', orderId)
        .select();

      if (orderError) {
        console.error('Order update error:', orderError);
        console.error('Error code:', orderError.code);
        console.error('Error details:', orderError.details);
        console.error('Error hint:', orderError.hint);
        throw new Error('Impossible de mettre à jour la commande');
      }
      console.log('Order updated successfully:', updateData);
      console.log('Driver ID assigned:', updateData?.[0]?.driver_id);
      console.log('Status set to:', updateData?.[0]?.status);

      await supabase
        .from('user_notifications')
        .insert({
          user_id: selectedDriver.user_id,
          title: 'Nouvelle course!',
          message: `Vous avez une nouvelle demande de course. Ouvrez l\'application pour l\'accepter.`,
          type: 'new_order_request',
          data: { order_id: orderId }
        });

      console.log('Notification sent to driver');

      setShowConfirmModal(false);
      setAssigningDriver(null);

      console.log('About to show success modal');
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error in confirmation flow:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setAssigningDriver(null);
      setShowConfirmModal(false);

      if (Platform.OS === 'web') {
        window.alert('Erreur\n\n' + (error?.message || 'Une erreur est survenue. Veuillez réessayer.'));
      } else {
        Alert.alert(
          'Erreur',
          error?.message || 'Une erreur est survenue. Veuillez réessayer.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Choisir un livreur</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
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
        <Text style={styles.title}>Choisir un livreur</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {neighborhood && (
          <View style={styles.infoCard}>
            <MapPin size={20} color="#2563eb" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>Livreurs disponibles pour {neighborhood}</Text>
              {orderDetails && (
                <Text style={styles.totalAmount}>
                  Frais de livraison: {(orderDetails.delivery_fee + (orderDetails.is_express ? orderDetails.express_bonus : 0)).toLocaleString()} FCFA
                </Text>
              )}
            </View>
          </View>
        )}

        {drivers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun livreur dans votre zone pour le moment</Text>
            <Text style={styles.emptySubtext}>Veuillez réessayer plus tard</Text>
          </View>
        ) : (
          <View style={styles.driversList}>
            {drivers.filter(d => d.is_available).length > 0 && (
              <Text style={styles.sectionTitle}>Livreurs disponibles ({drivers.filter(d => d.is_available).length})</Text>
            )}

            {drivers.filter(d => d.is_available).map((driver) => {
              const VehicleIcon = getVehicleIcon(driver.vehicle_type);
              const isAssigning = assigningDriver === driver.id;
              return (
                <TouchableOpacity
                  key={driver.id}
                  style={[
                    styles.driverCard,
                    styles.availableDriverCard,
                    isAssigning && styles.driverCardAssigning,
                  ]}
                  onPress={() => handleSelectDriver(driver)}
                  activeOpacity={0.7}
                  disabled={!!assigningDriver}
                >
                  <View style={styles.driverHeader}>
                    {driver.user_profiles?.profile_photo_url ? (
                      <Image
                        source={{ uri: driver.user_profiles.profile_photo_url }}
                        style={styles.driverPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.driverPhotoPlaceholder}>
                        <Text style={styles.driverInitials}>
                          {driver.user_profiles?.first_name?.[0]}
                          {driver.user_profiles?.last_name?.[0]}
                        </Text>
                      </View>
                    )}
                    <View style={styles.driverInfo}>
                      <Text style={styles.driverName}>
                        {driver.user_profiles?.first_name} {driver.user_profiles?.last_name}
                      </Text>
                      <View style={styles.driverDetails}>
                        <VehicleIcon size={16} color="#666" />
                        <Text style={styles.vehicleType}>{driver.vehicle_type}</Text>
                      </View>
                      {driver.total_ratings && driver.total_ratings > 0 ? (
                        <StarRating
                          rating={driver.average_rating || 0}
                          totalRatings={driver.total_ratings}
                          size={14}
                        />
                      ) : (
                        <Text style={styles.noRatingText}>Nouveau livreur</Text>
                      )}
                    </View>
                    <View style={styles.availableBadge}>
                      <View style={styles.availableDot} />
                      <Text style={styles.availableText}>Dispo</Text>
                    </View>
                  </View>

                  <View style={styles.distanceInfoContainer}>
                    <View style={styles.distanceItem}>
                      <Navigation size={16} color="#2563eb" />
                      <View style={styles.distanceItemText}>
                        <Text style={styles.distanceLabel}>Distance</Text>
                        <Text style={styles.distanceValue}>{formatDistance(driver.distance)}</Text>
                      </View>
                    </View>
                    <View style={styles.distanceDivider} />
                    <View style={styles.distanceItem}>
                      <Clock size={16} color="#2563eb" />
                      <View style={styles.distanceItemText}>
                        <Text style={styles.distanceLabel}>Temps estimé</Text>
                        <Text style={styles.distanceValue}>
                          {estimateDeliveryTime(driver.distance, driver.vehicle_type)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.driverFooter}>
                    <View style={styles.zoneInfo}>
                      <MapPin size={14} color="#666" />
                      <Text style={styles.zonesText}>
                        {driver.delivery_zones.join(', ')}
                      </Text>
                    </View>
                    {driver.accepts_express_delivery && (
                      <View style={styles.expressInfo}>
                        <Zap size={14} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.expressText}>Accepte express</Text>
                      </View>
                    )}
                  </View>

                  {isAssigning && (
                    <View style={styles.assigningIndicator}>
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text style={styles.assigningText}>
                        Création de la conversation...
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {drivers.filter(d => !d.is_available).length > 0 && (
              <>
                <Text style={[styles.sectionTitle, styles.unavailableSectionTitle]}>
                  Livreurs indisponibles ({drivers.filter(d => !d.is_available).length})
                </Text>

                {drivers.filter(d => !d.is_available).map((driver) => {
                  const VehicleIcon = getVehicleIcon(driver.vehicle_type);
                  return (
                    <TouchableOpacity
                      key={driver.id}
                      style={[styles.driverCard, styles.unavailableDriverCard]}
                      onPress={() => handleSelectDriver(driver)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.driverHeader}>
                        {driver.user_profiles?.profile_photo_url ? (
                          <Image
                            source={{ uri: driver.user_profiles.profile_photo_url }}
                            style={[styles.driverPhoto, styles.unavailablePhoto]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.driverPhotoPlaceholder, styles.unavailablePhotoPlaceholder]}>
                            <Text style={styles.driverInitials}>
                              {driver.user_profiles?.first_name?.[0]}
                              {driver.user_profiles?.last_name?.[0]}
                            </Text>
                          </View>
                        )}
                        <View style={styles.driverInfo}>
                          <Text style={[styles.driverName, styles.unavailableText]}>
                            {driver.user_profiles?.first_name} {driver.user_profiles?.last_name}
                          </Text>
                          <View style={styles.driverDetails}>
                            <VehicleIcon size={16} color="#999" />
                            <Text style={[styles.vehicleType, styles.unavailableText]}>{driver.vehicle_type}</Text>
                          </View>
                          {driver.total_ratings && driver.total_ratings > 0 ? (
                            <StarRating
                              rating={driver.average_rating || 0}
                              totalRatings={driver.total_ratings}
                              size={14}
                            />
                          ) : (
                            <Text style={styles.noRatingText}>Nouveau livreur</Text>
                          )}
                        </View>
                        <View style={styles.unavailableBadge}>
                          <View style={styles.unavailableDot} />
                          <Text style={styles.unavailableBadgeText}>Occupé</Text>
                        </View>
                      </View>

                      <View style={styles.distanceInfoContainer}>
                        <View style={styles.distanceItem}>
                          <Navigation size={16} color="#999" />
                          <View style={styles.distanceItemText}>
                            <Text style={[styles.distanceLabel, styles.unavailableText]}>Distance</Text>
                            <Text style={[styles.distanceValue, styles.unavailableText]}>
                              {formatDistance(driver.distance)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.distanceDivider} />
                        <View style={styles.distanceItem}>
                          <Clock size={16} color="#999" />
                          <View style={styles.distanceItemText}>
                            <Text style={[styles.distanceLabel, styles.unavailableText]}>Temps estimé</Text>
                            <Text style={[styles.distanceValue, styles.unavailableText]}>
                              {estimateDeliveryTime(driver.distance, driver.vehicle_type)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.driverFooter}>
                        <View style={styles.zoneInfo}>
                          <MapPin size={14} color="#999" />
                          <Text style={[styles.zonesText, styles.unavailableText]}>
                            {driver.delivery_zones.join(', ')}
                          </Text>
                        </View>
                        {driver.accepts_express_delivery && (
                          <View style={[styles.expressInfo, styles.unavailableExpressInfo]}>
                            <Zap size={14} color="#d1d5db" fill="#d1d5db" />
                            <Text style={[styles.expressText, styles.unavailableText]}>Accepte express</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <CheckCircle size={56} color="#10b981" />
            </View>

            <Text style={styles.modalTitle}>Confirmer le livreur</Text>

            {selectedDriver && (
              <View style={styles.driverSummary}>
                {selectedDriver.user_profiles?.profile_photo_url ? (
                  <Image
                    source={{ uri: selectedDriver.user_profiles.profile_photo_url }}
                    style={styles.summaryDriverPhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.summaryDriverPhotoPlaceholder}>
                    <Text style={styles.summaryDriverInitials}>
                      {selectedDriver.user_profiles?.first_name?.[0]}
                      {selectedDriver.user_profiles?.last_name?.[0]}
                    </Text>
                  </View>
                )}
                <Text style={styles.summaryDriverName}>
                  {selectedDriver.user_profiles?.first_name} {selectedDriver.user_profiles?.last_name}
                </Text>
                <Text style={styles.summaryVehicleType}>{selectedDriver.vehicle_type}</Text>
              </View>
            )}

            <Text style={styles.modalDescription}>
              Une conversation automatique sera créée avec ce livreur pour discuter des détails de votre livraison. Vous serez redirigé vers la page Messages.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  assigningDriver === selectedDriver?.id && styles.confirmModalButtonDisabled,
                ]}
                onPress={handleConfirmDriver}
                disabled={assigningDriver === selectedDriver?.id}
              >
                {assigningDriver === selectedDriver?.id ? (
                  <View style={styles.buttonLoadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.confirmModalButtonText}>Confirmation...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmModalButtonText}>Confirmer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSuccessOk}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle size={80} color="#10b981" fill="#10b981" strokeWidth={0} />
              </View>
            </View>

            <Text style={styles.successTitle}>Demande envoyée</Text>

            {selectedDriver && (
              <Text style={styles.successMessage}>
                Votre demande a été envoyée à {selectedDriver.user_profiles?.first_name}.{'\n'}
                Vous serez notifié lorsqu'il acceptera la course.
              </Text>
            )}

            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessOk}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: '700',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  driversList: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unavailableSectionTitle: {
    color: '#6b7280',
    marginTop: 24,
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    padding: 16,
    gap: 12,
  },
  availableDriverCard: {
    borderColor: '#10b981',
    borderWidth: 2,
  },
  unavailableDriverCard: {
    borderColor: '#d1d5db',
    borderWidth: 1,
    backgroundColor: '#f9fafb',
    opacity: 0.8,
  },
  driverCardAssigning: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    opacity: 0.8,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
  },
  driverPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInitials: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  driverInfo: {
    flex: 1,
    gap: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  driverDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehicleType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  ratingCount: {
    fontSize: 12,
    color: '#999',
  },
  noRatingText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  availableText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  unavailableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
  },
  unavailableBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  unavailableText: {
    color: '#9ca3af',
  },
  unavailablePhoto: {
    opacity: 0.6,
  },
  unavailablePhotoPlaceholder: {
    backgroundColor: '#9ca3af',
  },
  unavailableExpressInfo: {
    backgroundColor: '#f3f4f6',
  },
  distanceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  distanceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceItemText: {
    flex: 1,
  },
  distanceLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  distanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  distanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#dbeafe',
  },
  driverFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    gap: 8,
  },
  zoneInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  zonesText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  expressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  expressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  assigningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
  },
  assigningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 24,
  },
  driverSummary: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  summaryDriverPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 4,
    borderColor: '#fff',
  },
  summaryDriverPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  summaryDriverInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  summaryDriverName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  summaryVehicleType: {
    fontSize: 15,
    color: '#2563eb',
    textTransform: 'capitalize',
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
  },
  confirmModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmModalButtonDisabled: {
    backgroundColor: '#93c5fd',
    opacity: 0.8,
  },
  confirmModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
