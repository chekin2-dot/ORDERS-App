import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Linking, TextInput, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, MapPin, Calendar, Shield, Store, Truck, ShoppingBag, Ban, CircleCheck as CheckCircle, Circle as XCircle, DollarSign, Star, Clock, MessageSquare, TrendingUp, CreditCard, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/Toast';

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

interface PartnerClient {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  client_id: string;
  user_profiles: { first_name: string; last_name: string; phone: string } | null;
}

interface ClientOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  delivery_address: string;
  merchants: { shop_name: string } | null;
}

interface TurnoverData {
  today_total: number;
  today_user_share: number;
  today_platform: number;
  today_order_count: number;
  yesterday_total: number;
  yesterday_user_share: number;
  yesterday_platform: number;
  yesterday_order_count: number;
}

export default function UserDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [merchantDetails, setMerchantDetails] = useState<MerchantDetails | null>(null);
  const [driverDetails, setDriverDetails] = useState<DriverDetails | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [turnover, setTurnover] = useState<TurnoverData | null>(null);
  const [userTypeRef, setUserTypeRef] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [pendingValidationAction, setPendingValidationAction] = useState<'approve' | 'reject' | null>(null);
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState<string | null>(null);
  const [partnerRecordId, setPartnerRecordId] = useState<string | null>(null);
  const [payingYesterday, setPayingYesterday] = useState(false);
  const [confirmYesterdayPayment, setConfirmYesterdayPayment] = useState(false);
  const [clientOrders, setClientOrders] = useState<ClientOrder[]>([]);
  const [partnerClients, setPartnerClients] = useState<PartnerClient[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    loadUserDetails();
    const cleanup = subscribeToUserUpdates();
    return cleanup;
  }, [userId]);

  const subscribeToUserUpdates = () => {
    const channel = supabase
      .channel(`user-details-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        () => { loadUserDetails(); }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => { loadTurnover(userId); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadTurnover = async (uid: string) => {
    try {
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', uid)
        .maybeSingle();

      if (!profileData) return;

      if (profileData.user_type === 'merchant') {
        const { data, error } = await supabase.rpc('get_merchant_turnover', { merchant_uuid: uid });
        if (error || !data || data.length === 0) return;
        const row = data[0];
        setTurnover({
          today_total: Number(row.today_total),
          today_user_share: Number(row.today_merchant),
          today_platform: Number(row.today_platform),
          today_order_count: Number(row.today_order_count),
          yesterday_total: Number(row.yesterday_total),
          yesterday_user_share: Number(row.yesterday_merchant),
          yesterday_platform: Number(row.yesterday_platform),
          yesterday_order_count: Number(row.yesterday_order_count),
        });
      } else if (profileData.user_type === 'driver') {
        const { data, error } = await supabase.rpc('get_driver_turnover', { driver_uuid: uid });
        if (error || !data || data.length === 0) return;
        const row = data[0];
        setTurnover({
          today_total: Number(row.today_total),
          today_user_share: Number(row.today_driver),
          today_platform: Number(row.today_platform),
          today_order_count: Number(row.today_order_count),
          yesterday_total: Number(row.yesterday_total),
          yesterday_user_share: Number(row.yesterday_driver),
          yesterday_platform: Number(row.yesterday_platform),
          yesterday_order_count: Number(row.yesterday_order_count),
        });
      }
    } catch (e) {
      // silently ignore turnover errors
    }
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
      setUserTypeRef(userData.user_type);

      loadTurnover(userId);

      if (userData.user_type === 'merchant') {
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('*, categories(name)')
          .eq('user_id', userId)
          .single();
        setMerchantDetails(merchantData);
        setVerificationStatus(merchantData?.verification_status || '');
        setOrangeMoneyNumber(merchantData?.orange_money_number || null);
        setPartnerRecordId(merchantData?.id || null);

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

        const { data: recentClients } = await supabase
          .from('orders')
          .select('id, order_number, total, status, created_at, client_id, user_profiles!orders_client_id_fkey(first_name, last_name, phone)')
          .eq('merchant_id', merchantData?.id)
          .order('created_at', { ascending: false })
          .limit(10);

        setPartnerClients((recentClients as PartnerClient[]) || []);
      } else if (userData.user_type === 'driver') {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', userId)
          .single();
        setDriverDetails(driverData);
        setVerificationStatus(driverData?.verification_status || '');
        setOrangeMoneyNumber(driverData?.orange_money_number || null);
        setPartnerRecordId(driverData?.id || null);

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

        const { data: recentDriverClients } = await supabase
          .from('orders')
          .select('id, order_number, total, status, created_at, client_id, user_profiles!orders_client_id_fkey(first_name, last_name, phone)')
          .eq('driver_id', driverData?.id)
          .order('created_at', { ascending: false })
          .limit(10);

        setPartnerClients((recentDriverClients as PartnerClient[]) || []);
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

        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id, order_number, total, status, created_at, delivery_address, merchants(shop_name)')
          .eq('client_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        setClientOrders((recentOrders as ClientOrder[]) || []);
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

  const openValidationModal = (action: 'approve' | 'reject') => {
    setNoteText('');
    setPendingValidationAction(action);
    setNoteModalVisible(true);
  };

  const executeValidation = async () => {
    if (!pendingValidationAction || !user) return;
    setNoteModalVisible(false);
    setProcessing(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const rpc = pendingValidationAction === 'approve'
        ? 'admin_approve_subscription'
        : 'admin_reject_subscription';

      const { data, error } = await supabase.rpc(rpc, {
        target_user_id: user.id,
        admin_user_id: currentUser.id,
        ...(pendingValidationAction === 'approve'
          ? { approval_note: noteText || null }
          : { rejection_note: noteText || null }),
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      alert(pendingValidationAction === 'approve' ? 'Compte validé avec succès' : 'Compte rejeté');
      loadUserDetails();
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la validation');
    } finally {
      setProcessing(false);
      setPendingValidationAction(null);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handlePayYesterday = () => {
    if (!turnover || turnover.yesterday_user_share <= 0) {
      showToast('Aucun montant à payer pour hier', 'error');
      return;
    }
    if (!orangeMoneyNumber) {
      showToast('Numéro Orange Money non configuré', 'error');
      return;
    }
    const amount = Math.round(turnover.yesterday_user_share);
    const cleanNumber = orangeMoneyNumber.replace(/\D/g, '');
    const ussdCode = `*144*2*1*${cleanNumber}*${amount}#`;
    Linking.openURL(`tel:${encodeURIComponent(ussdCode)}`).catch(() => {});
    setConfirmYesterdayPayment(true);
  };

  const markYesterdayAsPaid = async () => {
    if (!turnover || !user || !partnerRecordId) return;
    setConfirmYesterdayPayment(false);
    setPayingYesterday(true);

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (user.user_type === 'merchant') {
        const { error } = await supabase
          .from('merchant_daily_payouts')
          .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
          .eq('merchant_id', partnerRecordId)
          .eq('payment_date', yesterdayStr)
          .eq('payment_status', 'pending');
        if (error) throw error;
      } else if (user.user_type === 'driver') {
        const amount = Math.round(turnover.yesterday_user_share);
        const { data: currentDriver } = await supabase
          .from('drivers')
          .select('balance')
          .eq('id', partnerRecordId)
          .maybeSingle();
        const newBalance = Math.max(0, (Number(currentDriver?.balance) || 0) - amount);
        const { error } = await supabase
          .from('drivers')
          .update({ balance: newBalance })
          .eq('id', partnerRecordId);
        if (error) throw error;
      }

      showToast('Paiement d\'hier enregistré avec succès', 'success');
      loadTurnover(userId);
    } catch (error: any) {
      showToast(error.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setPayingYesterday(false);
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

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#3b82f6';
      case 'preparing': return '#8b5cf6';
      case 'ready': return '#06b6d4';
      case 'picked_up': return '#6366f1';
      default: return '#64748b';
    }
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Livré';
      case 'cancelled': return 'Annulé';
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmé';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prêt';
      case 'picked_up': return 'Récupéré';
      default: return status;
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

          {(user.user_type === 'merchant' || user.user_type === 'driver') && (
            <View style={styles.validationSection}>
              <View style={styles.validationHeader}>
                {verificationStatus === 'pending' && (
                  <View style={styles.pendingTag}>
                    <Clock size={13} color="#d97706" />
                    <Text style={styles.pendingTagText}>En attente de validation</Text>
                  </View>
                )}
                {verificationStatus === 'verified' && (
                  <View style={styles.verifiedTag}>
                    <CheckCircle size={13} color="#10b981" />
                    <Text style={styles.verifiedTagText}>Compte validé</Text>
                  </View>
                )}
                {verificationStatus === 'rejected' && (
                  <View style={styles.rejectedTag}>
                    <XCircle size={13} color="#ef4444" />
                    <Text style={styles.rejectedTagText}>Compte rejeté</Text>
                  </View>
                )}
              </View>

              {(verificationStatus === 'pending' || verificationStatus === 'rejected') && (
                <View style={styles.validationActions}>
                  <TouchableOpacity
                    style={[styles.rejectValidationBtn, processing && styles.btnDisabled]}
                    onPress={() => openValidationModal('reject')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <XCircle size={16} color="#ef4444" />
                        <Text style={styles.rejectValidationText}>Rejeter</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.approveValidationBtn, processing && styles.btnDisabled]}
                    onPress={() => openValidationModal('approve')}
                    disabled={processing}
                  >
                    {processing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.approveValidationText}>Valider le compte</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {verificationStatus === 'verified' && (
                <TouchableOpacity
                  style={[styles.rejectValidationBtn, processing && styles.btnDisabled]}
                  onPress={() => openValidationModal('reject')}
                  disabled={processing}
                >
                  <XCircle size={16} color="#ef4444" />
                  <Text style={styles.rejectValidationText}>Révoquer la validation</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
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
                  GPS: Long {user.longitude ? user.longitude.toFixed(6) : '0.000000'}, Lat {user.latitude ? user.latitude.toFixed(6) : '0.000000'}
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

        {turnover && (user?.user_type === 'merchant' || user?.user_type === 'driver') && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={18} color="#2563eb" />
              <Text style={styles.sectionTitle}>Turnover</Text>
              <View style={styles.realtimeDot} />
              <Text style={styles.realtimeLabel}>Live</Text>
            </View>

            <View style={styles.turnoverCard}>
              <View style={styles.turnoverPeriodHeader}>
                <Text style={styles.turnoverPeriodTitle}>Today</Text>
                <Text style={styles.turnoverOrderCount}>{turnover.today_order_count} order{turnover.today_order_count !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.turnoverTotal}>{turnover.today_total.toLocaleString()} F CFA</Text>
              <View style={styles.turnoverSplitRow}>
                <View style={styles.turnoverSplitItem}>
                  <View style={[styles.splitDot, { backgroundColor: '#10b981' }]} />
                  <View>
                    <Text style={styles.splitLabel}>{user.user_type === 'merchant' ? 'Merchant' : 'Driver'} share (90%)</Text>
                    <Text style={[styles.splitValue, { color: '#10b981' }]}>{turnover.today_user_share.toLocaleString()} F</Text>
                  </View>
                </View>
                <View style={styles.turnoverSplitItem}>
                  <View style={[styles.splitDot, { backgroundColor: '#f59e0b' }]} />
                  <View>
                    <Text style={styles.splitLabel}>OFD App (10%)</Text>
                    <Text style={[styles.splitValue, { color: '#f59e0b' }]}>{turnover.today_platform.toLocaleString()} F</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.turnoverCard, styles.turnoverCardYesterday]}>
              <View style={styles.turnoverPeriodHeader}>
                <Text style={styles.turnoverPeriodTitle}>Yesterday</Text>
                <Text style={styles.turnoverOrderCount}>{turnover.yesterday_order_count} order{turnover.yesterday_order_count !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.turnoverTotal}>{turnover.yesterday_total.toLocaleString()} F CFA</Text>
              <View style={styles.turnoverSplitRow}>
                <View style={styles.turnoverSplitItem}>
                  <View style={[styles.splitDot, { backgroundColor: '#10b981' }]} />
                  <View>
                    <Text style={styles.splitLabel}>{user.user_type === 'merchant' ? 'Merchant' : 'Driver'} share (90%)</Text>
                    <Text style={[styles.splitValue, { color: '#10b981' }]}>{turnover.yesterday_user_share.toLocaleString()} F</Text>
                  </View>
                </View>
                <View style={styles.turnoverSplitItem}>
                  <View style={[styles.splitDot, { backgroundColor: '#f59e0b' }]} />
                  <View>
                    <Text style={styles.splitLabel}>OFD App (10%)</Text>
                    <Text style={[styles.splitValue, { color: '#f59e0b' }]}>{turnover.yesterday_platform.toLocaleString()} F</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.payYesterdayBtn, (payingYesterday || turnover.yesterday_user_share <= 0) && styles.btnDisabled]}
                onPress={handlePayYesterday}
                disabled={payingYesterday || turnover.yesterday_user_share <= 0}
              >
                {payingYesterday ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <CreditCard size={16} color="#fff" />
                    <Text style={styles.payYesterdayBtnText}>
                      Payer {Math.round(turnover.yesterday_user_share).toLocaleString()} F (hier)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
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

        {user.user_type === 'client' && clientOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10 dernières commandes</Text>
            <View style={styles.ordersList}>
              {clientOrders.map((order, index) => (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.orderRow, index < clientOrders.length - 1 && styles.orderRowBorder]}
                  onPress={() => router.push({ pathname: '/(admin)/order-details', params: { id: order.id } })}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderRowLeft}>
                    <View style={[styles.orderStatusDot, { backgroundColor: getOrderStatusColor(order.status) }]} />
                    <View style={styles.orderRowInfo}>
                      <Text style={styles.orderNumber}>{order.order_number}</Text>
                      <Text style={styles.orderMerchant} numberOfLines={1}>
                        {order.merchants?.shop_name || '—'}
                      </Text>
                      <Text style={styles.orderDate}>
                        {new Date(order.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderRowRight}>
                    <Text style={styles.orderTotal}>{Number(order.total).toLocaleString()} F</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: getOrderStatusColor(order.status) + '18' }]}>
                      <Text style={[styles.orderStatusText, { color: getOrderStatusColor(order.status) }]}>
                        {getOrderStatusLabel(order.status)}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {(user.user_type === 'merchant' || user.user_type === 'driver') && partnerClients.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10 derniers clients</Text>
            <View style={styles.ordersList}>
              {partnerClients.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.orderRow, index < partnerClients.length - 1 && styles.orderRowBorder]}
                  onPress={() => router.push({ pathname: '/(admin)/order-details', params: { id: item.id } })}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderRowLeft}>
                    <View style={[styles.orderStatusDot, { backgroundColor: getOrderStatusColor(item.status) }]} />
                    <View style={styles.orderRowInfo}>
                      <Text style={styles.orderNumber}>
                        {item.user_profiles ? `${item.user_profiles.first_name} ${item.user_profiles.last_name}` : '—'}
                      </Text>
                      <Text style={styles.orderMerchant} numberOfLines={1}>
                        {item.user_profiles?.phone || '—'} · {item.order_number}
                      </Text>
                      <Text style={styles.orderDate}>
                        {new Date(item.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderRowRight}>
                    <Text style={styles.orderTotal}>{Number(item.total).toLocaleString()} F</Text>
                    <View style={[styles.orderStatusBadge, { backgroundColor: getOrderStatusColor(item.status) + '18' }]}>
                      <Text style={[styles.orderStatusText, { color: getOrderStatusColor(item.status) }]}>
                        {getOrderStatusLabel(item.status)}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </View>
                </TouchableOpacity>
              ))}
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

      <Modal
        visible={noteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <MessageSquare
                size={22}
                color={pendingValidationAction === 'approve' ? '#10b981' : '#ef4444'}
              />
              <Text style={styles.modalTitle}>
                {pendingValidationAction === 'approve' ? 'Valider le compte' : 'Rejeter le compte'}
              </Text>
            </View>

            <Text style={styles.modalName}>{user?.first_name} {user?.last_name}</Text>

            <Text style={styles.modalLabel}>Note pour l'utilisateur (optionnel)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder={
                pendingValidationAction === 'approve'
                  ? 'Ex: Bienvenue sur la plateforme !'
                  : 'Ex: Documents non conformes...'
              }
              value={noteText}
              onChangeText={setNoteText}
              multiline
              numberOfLines={3}
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setNoteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  pendingValidationAction === 'approve'
                    ? styles.modalApproveBtn
                    : styles.modalRejectBtn,
                ]}
                onPress={executeValidation}
              >
                {pendingValidationAction === 'approve'
                  ? <CheckCircle size={16} color="#fff" />
                  : <XCircle size={16} color="#fff" />
                }
                <Text style={styles.modalConfirmText}>
                  {pendingValidationAction === 'approve' ? 'Valider' : 'Rejeter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={confirmYesterdayPayment}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmYesterdayPayment(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <CreditCard size={22} color="#10b981" />
              <Text style={styles.modalTitle}>Confirmer le paiement</Text>
            </View>
            <Text style={styles.modalName}>{user?.first_name} {user?.last_name}</Text>
            <Text style={styles.modalLabel}>
              Le paiement Orange Money de{' '}
              <Text style={{ fontWeight: '700', color: '#10b981' }}>
                {turnover ? Math.round(turnover.yesterday_user_share).toLocaleString() : 0} F CFA
              </Text>
              {' '}a-t-il bien été effectué ?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmYesterdayPayment(false)}
              >
                <Text style={styles.modalCancelText}>Non</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, styles.modalApproveBtn]}
                onPress={markYesterdayAsPaid}
              >
                <CheckCircle size={16} color="#fff" />
                <Text style={styles.modalConfirmText}>Oui, payé</Text>
              </TouchableOpacity>
            </View>
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
  validationSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14,
    gap: 10,
    width: '100%',
  },
  validationHeader: {
    alignItems: 'center',
  },
  pendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#d1fae5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  verifiedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  rejectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#fee2e2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  rejectedTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  validationActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  rejectValidationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectValidationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  approveValidationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  approveValidationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  modalLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 10,
  },
  modalApproveBtn: {
    backgroundColor: '#10b981',
  },
  modalRejectBtn: {
    backgroundColor: '#ef4444',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  realtimeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  turnoverCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  turnoverCardYesterday: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  turnoverPeriodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  turnoverPeriodTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  turnoverOrderCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  turnoverTotal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 12,
  },
  turnoverSplitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  turnoverSplitItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  splitDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  splitLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  splitValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  payYesterdayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  payYesterdayBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  ordersList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  orderRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  orderStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  orderRowInfo: {
    flex: 1,
    gap: 2,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  orderMerchant: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  orderDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  orderRowRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
    marginLeft: 8,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
