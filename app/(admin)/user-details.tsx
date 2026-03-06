import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  TrendingUp,
  Store,
  Truck,
  ShoppingBag,
  Ban,
  CheckCircle,
  DollarSign,
  Star
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface UserDetails {
  id: string;
  user_type: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  created_at: string;
  gps_enabled: boolean;
}

interface MerchantDetails {
  shop_name: string;
  shop_description: string;
  category_id: string;
  neighborhood: string;
  categories: { name: string };
}

interface DriverDetails {
  license_number: string;
  vehicle_type: string;
  vehicle_number: string;
  accepts_express: boolean;
  working_hours: any;
  id_card_number: string;
  id_card_front_url: string;
  id_card_back_url: string;
}

interface Stats {
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  total_earnings: number;
  average_rating: number;
  total_ratings: number;
}

export default function UserDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [merchantDetails, setMerchantDetails] = useState<MerchantDetails | null>(null);
  const [driverDetails, setDriverDetails] = useState<DriverDetails | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadUserDetails();
    subscribeToUserUpdates();
  }, [userId]);

  const subscribeToUserUpdates = () => {
    const channel = supabase
      .channel('user-details')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          if (payload.eventType === 'UPDATE' &&
              (newData.latitude !== oldData?.latitude || newData.longitude !== oldData?.longitude)) {
            console.log('GPS coordinates updated:', {
              old: { lat: oldData?.latitude, lng: oldData?.longitude },
              new: { lat: newData.latitude, lng: newData.longitude }
            });
          }

          loadUserDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadUserDetails = async () => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      setUser(userData);

      if (userData.user_type === 'merchant') {
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*, categories(name)')
          .eq('user_id', userId)
          .single();
        setMerchantDetails(merchantData);

        const { data: orderStats } = await supabase
          .from('orders')
          .select('total, status')
          .eq('merchant_id', merchantData?.id);

        const completed = orderStats?.filter(o => o.status === 'delivered').length || 0;
        const revenue = orderStats?.filter(o => o.status === 'delivered')
          .reduce((sum, o) => sum + Number(o.total), 0) || 0;

        setStats({
          total_orders: orderStats?.length || 0,
          completed_orders: completed,
          total_revenue: revenue,
          total_earnings: revenue * 0.85,
          average_rating: 0,
          total_ratings: 0,
        });
      } else if (userData.user_type === 'driver') {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', userId)
          .single();
        setDriverDetails(driverData);

        const { data: deliveryStats } = await supabase
          .from('orders')
          .select('delivery_fee, status')
          .eq('driver_id', driverData?.id);

        const completed = deliveryStats?.filter(o => o.status === 'delivered').length || 0;
        const earnings = deliveryStats?.filter(o => o.status === 'delivered')
          .reduce((sum, o) => sum + Number(o.delivery_fee), 0) || 0;

        setStats({
          total_orders: deliveryStats?.length || 0,
          completed_orders: completed,
          total_revenue: 0,
          total_earnings: earnings,
          average_rating: 0,
          total_ratings: 0,
        });
      } else if (userData.user_type === 'client') {
        const { data: orderStats } = await supabase
          .from('orders')
          .select('total, status')
          .eq('client_id', userId);

        const completed = orderStats?.filter(o => o.status === 'delivered').length || 0;
        const spent = orderStats?.filter(o => o.status === 'delivered')
          .reduce((sum, o) => sum + Number(o.total), 0) || 0;

        setStats({
          total_orders: orderStats?.length || 0,
          completed_orders: completed,
          total_revenue: spent,
          total_earnings: 0,
          average_rating: 0,
          total_ratings: 0,
        });
      }
    } catch (error) {
      console.error('Error loading user details:', error);
      Alert.alert('Error', 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user) return;

    const confirmed = confirm(`Are you sure you want to block ${user.first_name} ${user.last_name}?`);
    if (!confirmed) return;

    setProcessing(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Blocking user:', user.id, 'as admin:', currentUser?.id);

      const { data, error } = await supabase.rpc('block_user_account', {
        target_user_id: user.id,
        admin_user_id: currentUser?.id,
        block_reason: 'Admin action',
      });

      console.log('Block response:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        console.error('Block failed:', data);
        throw new Error(data.error || 'Failed to block user');
      }

      console.log('User blocked successfully');
      alert('User blocked successfully');
      loadUserDetails();
    } catch (error: any) {
      console.error('Block exception:', error);
      alert(error.message || 'Failed to block user');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!user) return;

    setProcessing(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('Unblocking user:', user.id, 'as admin:', currentUser?.id);

      const { data, error } = await supabase.rpc('unblock_user_account', {
        target_user_id: user.id,
        admin_user_id: currentUser?.id,
      });

      console.log('Unblock response:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        console.error('Unblock failed:', data);
        throw new Error(data.error || 'Failed to unblock user');
      }

      console.log('User unblocked successfully');
      alert('User unblocked successfully');
      loadUserDetails();
    } catch (error: any) {
      console.error('Unblock exception:', error);
      alert(error.message || 'Failed to unblock user');
    } finally {
      setProcessing(false);
    }
  };

  const handleCallUser = () => {
    if (user?.phone) {
      Linking.openURL(`tel:${user.phone}`);
    }
  };

  const handleViewLocation = () => {
    if (user?.latitude && user?.longitude) {
      const url = `https://www.google.com/maps?q=${user.latitude},${user.longitude}`;
      Linking.openURL(url);
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'client': return '#3b82f6';
      case 'merchant': return '#f59e0b';
      case 'driver': return '#10b981';
      default: return '#64748b';
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'client': return ShoppingBag;
      case 'merchant': return Store;
      case 'driver': return Truck;
      default: return Shield;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const TypeIcon = getUserTypeIcon(user.user_type);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileCard}>
          <View style={[styles.avatarContainer, { backgroundColor: getUserTypeColor(user.user_type) + '20' }]}>
            <TypeIcon size={40} color={getUserTypeColor(user.user_type)} />
          </View>

          <Text style={styles.profileName}>
            {user.first_name} {user.last_name}
          </Text>

          <View style={styles.profileBadges}>
            <View style={[styles.badge, { backgroundColor: getUserTypeColor(user.user_type) + '20' }]}>
              <Text style={[styles.badgeText, { color: getUserTypeColor(user.user_type) }]}>
                {user.user_type.toUpperCase()}
              </Text>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: user.status === 'active' ? '#10b98120' : '#ef444420' }
            ]}>
              <Text style={[
                styles.badgeText,
                { color: user.status === 'active' ? '#10b981' : '#ef4444' }
              ]}>
                {user.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.callButton} onPress={handleCallUser}>
              <Phone size={18} color="#fff" />
              <Text style={styles.callButtonText}>Call</Text>
            </TouchableOpacity>

            {user.status === 'banned' ? (
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={handleUnblockUser}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#fff" />
                    <Text style={styles.unblockButtonText}>Unblock</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.blockButton}
                onPress={handleBlockUser}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ban size={18} color="#fff" />
                    <Text style={styles.blockButtonText}>Block</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Phone size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{user.phone}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <TouchableOpacity
                onPress={() => {
                  if (user.latitude && user.longitude) {
                    handleViewLocation();
                  } else {
                    Alert.alert('No GPS', 'GPS coordinates not available for this user');
                  }
                }}
                style={[
                  styles.gpsIconButton,
                  user.latitude && user.longitude && styles.gpsIconButtonActive
                ]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MapPin size={20} color={user.latitude && user.longitude ? "#10b981" : "#94a3b8"} />
              </TouchableOpacity>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Address</Text>
                <Text style={styles.infoValue}>{user.address || 'Not provided'}</Text>
                <Text style={[
                  styles.infoSubtext,
                  user.latitude && user.longitude && styles.gpsCoordinatesActive
                ]}>
                  GPS: {user.longitude ? user.longitude.toFixed(6) : '0.000000'}, {user.latitude ? user.latitude.toFixed(6) : '0.000000'}
                  {user.latitude && user.longitude && (
                    <Text style={styles.tapToViewText}> (Tap icon to view on map)</Text>
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Calendar size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Joined</Text>
                <Text style={styles.infoValue}>
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <ShoppingBag size={24} color="#3b82f6" />
                <Text style={styles.statValue}>{stats.total_orders}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
              <View style={styles.statCard}>
                <CheckCircle size={24} color="#10b981" />
                <Text style={styles.statValue}>{stats.completed_orders}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              {user.user_type === 'client' && (
                <View style={styles.statCard}>
                  <DollarSign size={24} color="#f59e0b" />
                  <Text style={styles.statValue}>{stats.total_revenue.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
              )}
              {(user.user_type === 'merchant' || user.user_type === 'driver') && (
                <View style={styles.statCard}>
                  <DollarSign size={24} color="#10b981" />
                  <Text style={styles.statValue}>{stats.total_earnings.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Earnings</Text>
                </View>
              )}
              {user.user_type === 'driver' && stats.total_ratings > 0 && (
                <View style={styles.statCard}>
                  <Star size={24} color="#f59e0b" />
                  <Text style={styles.statValue}>{stats.average_rating.toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {merchantDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Merchant Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Store size={20} color="#64748b" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Shop Name</Text>
                  <Text style={styles.infoValue}>{merchantDetails.shop_name}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Category</Text>
                  <Text style={styles.infoValue}>{merchantDetails.categories?.name || 'N/A'}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Neighborhood</Text>
                  <Text style={styles.infoValue}>{merchantDetails.neighborhood}</Text>
                </View>
              </View>
              {merchantDetails.shop_description && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Description</Text>
                      <Text style={styles.infoValue}>{merchantDetails.shop_description}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {driverDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Details</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Truck size={20} color="#64748b" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Vehicle Type</Text>
                  <Text style={styles.infoValue}>{driverDetails.vehicle_type}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Vehicle Number</Text>
                  <Text style={styles.infoValue}>{driverDetails.vehicle_number}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>License Number</Text>
                  <Text style={styles.infoValue}>{driverDetails.license_number}</Text>
                </View>
              </View>
              {driverDetails.id_card_number && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.infoRow}>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>ID Card Number</Text>
                      <Text style={styles.infoValue}>{driverDetails.id_card_number}</Text>
                    </View>
                  </View>
                </>
              )}
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Express Delivery</Text>
                  <Text style={styles.infoValue}>
                    {driverDetails.accepts_express ? 'Accepted' : 'Not Accepted'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  profileBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#2563eb',
    borderRadius: 10,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  blockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#ef4444',
    borderRadius: 10,
  },
  blockButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  unblockButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#10b981',
    borderRadius: 10,
  },
  unblockButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  linkText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  gpsIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  gpsIconButtonActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  gpsCoordinatesActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  tapToViewText: {
    fontSize: 11,
    color: '#6366f1',
    fontStyle: 'italic',
  },
});
