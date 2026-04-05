import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform, Share, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Package, MapPin, Clock, User, Phone, DollarSign, Truck, Store, Share2 } from 'lucide-react-native';
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
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  delivery_fee: number;
  express_bonus: number;
  notes: string;
  payment_method: string;
  payment_status: string;
  delivery_address: string;
  delivery_neighborhood: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  is_express: boolean;
  client_name: string;
  client_phone: string;
  client_gps_latitude: number | null;
  client_gps_longitude: number | null;
  merchant_name: string;
  merchant_phone: string;
  driver_name: string;
  driver_phone: string;
  driver_photo_url: string | null;
  items: OrderItem[];
}

export default function AdminOrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    console.log('[OrderDetails] Received ID param:', id);
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      console.log('[OrderDetails] Fetching order:', id);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total,
          status,
          created_at,
          delivery_fee,
          express_bonus,
          notes,
          payment_method,
          payment_status,
          delivery_address,
          delivery_neighborhood,
          delivery_latitude,
          delivery_longitude,
          is_express,
          client_id,
          merchant_id,
          driver_id
        `)
        .eq('id', id)
        .maybeSingle();

      if (orderError) {
        console.error('[OrderDetails] Error fetching order:', orderError);
        throw orderError;
      }
      if (!orderData) {
        console.error('[OrderDetails] Order not found for ID:', id);
        setLoading(false);
        return;
      }

      console.log('[OrderDetails] Order data loaded:', orderData.order_number);

      const { data: clientData } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, phone, latitude, longitude')
        .eq('id', orderData.client_id)
        .maybeSingle();

      const { data: merchantData } = await supabase
        .from('merchants')
        .select('shop_name, user_profiles(phone)')
        .eq('id', orderData.merchant_id)
        .maybeSingle();

      let driverName = 'N/A';
      let driverPhone = 'N/A';
      let driverPhotoUrl: string | null = null;
      if (orderData.driver_id) {
        const { data: driverData } = await supabase
          .from('drivers')
          .select('user_profiles(first_name, last_name, phone, profile_photo_url)')
          .eq('id', orderData.driver_id)
          .maybeSingle();

        if (driverData?.user_profiles) {
          const profile = driverData.user_profiles as any;
          driverName = `${profile.first_name} ${profile.last_name}`;
          driverPhone = profile.phone;
          driverPhotoUrl = profile.profile_photo_url || null;
        }
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('id, product_name, quantity, unit_price, total_price')
        .eq('order_id', id)
        .order('created_at');

      if (itemsError) throw itemsError;

      setOrder({
        ...orderData,
        client_name: clientData ? `${clientData.first_name} ${clientData.last_name}` : 'N/A',
        client_phone: clientData?.phone || 'N/A',
        client_gps_latitude: clientData?.latitude || null,
        client_gps_longitude: clientData?.longitude || null,
        merchant_name: merchantData?.shop_name || 'N/A',
        merchant_phone: (merchantData?.user_profiles as any)?.phone || 'N/A',
        driver_name: driverName,
        driver_phone: driverPhone,
        driver_photo_url: driverPhotoUrl,
        items: itemsData || [],
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: '#f0ad4e',
      accepted: '#17a2b8',
      preparing: '#5bc0de',
      ready: '#0275d8',
      in_delivery: '#5b7c99',
      delivered: '#5cb85c',
      cancelled: '#d9534f',
      rejected: '#dc3545',
    };
    return colorMap[status] || '#999';
  };

  const getPaymentStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      pending: '#f59e0b',
      paid: '#10b981',
      failed: '#ef4444',
      refunded: '#6b7280',
    };
    return colorMap[status] || '#999';
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: { [key: string]: string } = {
      cash: 'Cash',
      orange_money: 'Orange Money',
      card: 'Card',
    };
    return methodMap[method] || method;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateItemsSubtotal = () => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleOpenMap = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    Linking.openURL(url);
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

    const itemsSubtotal = calculateItemsSubtotal();

    const message = `📦 Order Details ${order.order_number}

📅 Date: ${formatDate(order.created_at)}

👤 Client: ${order.client_name}
📞 Phone: ${order.client_phone}

🏪 Merchant: ${order.merchant_name}
📞 Phone: ${order.merchant_phone}

${order.driver_name ? `🚚 Driver: ${order.driver_name}\n📞 Phone: ${order.driver_phone}\n` : ''}
📝 Items:
${itemsList}

💰 Summary:
  Items Subtotal: ${itemsSubtotal.toFixed(0)} FCFA
  Delivery Fee: ${order.delivery_fee.toFixed(0)} FCFA${order.express_bonus > 0 ? `\n  Express Bonus: ${order.express_bonus.toFixed(0)} FCFA` : ''}
  Total: ${order.total.toFixed(0)} FCFA

📍 Delivery Address: ${order.delivery_address}, ${order.delivery_neighborhood}

💳 Payment: ${getPaymentMethodLabel(order.payment_method)} - ${order.payment_status}

📊 Status: ${order.status}${order.is_express ? ' (Express Delivery)' : ''}`;

    try {
      if (Platform.OS === 'web') {
        // Web fallback: copy to clipboard
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          showToast('Order details copied to clipboard', 'info');
        } else {
          showToast('Sharing is not available on this platform', 'error');
        }
      } else {
        // Native sharing for iOS and Android
        await Share.share({
          message: message,
        });
      }
    } catch (error) {
      console.error('Error sharing order details:', error);
      showToast('Unable to share order details', 'error');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Order not found</Text>
        </View>
      </View>
    );
  }

  const itemsSubtotal = calculateItemsSubtotal();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <TouchableOpacity onPress={shareOrderDetails} style={styles.shareButton}>
          <Share2 size={24} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color="#64748b" />
            <Text style={styles.sectionTitle}>Date & Time</Text>
          </View>
          <Text style={styles.sectionContent}>{formatDate(order.created_at)}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#64748b" />
            <Text style={styles.sectionTitle}>Client Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{order.client_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <TouchableOpacity onPress={() => handleCall(order.client_phone)}>
              <Text style={[styles.infoValue, styles.phoneLink]}>{order.client_phone}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>GPS Location</Text>
            {order.client_gps_latitude && order.client_gps_longitude ? (
              <TouchableOpacity
                onPress={() => handleOpenMap(order.client_gps_latitude!, order.client_gps_longitude!)}
                style={styles.clientGpsButton}
              >
                <MapPin size={16} color="#2563eb" />
                <Text style={styles.clientGpsText}>View on Map</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.infoValue}>Not available</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Store size={20} color="#64748b" />
            <Text style={styles.sectionTitle}>Merchant Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Shop</Text>
            <Text style={styles.infoValue}>{order.merchant_name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <TouchableOpacity onPress={() => handleCall(order.merchant_phone)}>
              <Text style={[styles.infoValue, styles.phoneLink]}>{order.merchant_phone}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {order.driver_name !== 'N/A' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Truck size={20} color="#64748b" />
              <Text style={styles.sectionTitle}>Driver Information</Text>
            </View>
            <View style={styles.driverDetailsCard}>
              {order.driver_photo_url ? (
                <Image
                  source={{ uri: order.driver_photo_url }}
                  style={styles.driverPhoto}
                />
              ) : (
                <View style={styles.driverPhotoPlaceholder}>
                  <User size={32} color="#94a3b8" />
                </View>
              )}
              <View style={styles.driverDetailsInfo}>
                <Text style={styles.driverDetailsName}>{order.driver_name}</Text>
                {order.driver_phone && (
                  <TouchableOpacity
                    style={styles.driverCallButton}
                    onPress={() => handleCall(order.driver_phone)}
                  >
                    <Phone size={16} color="#2563eb" />
                    <Text style={styles.driverCallButtonText}>{order.driver_phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => {
                if (order.client_gps_latitude && order.client_gps_longitude) {
                  handleOpenMap(order.client_gps_latitude!, order.client_gps_longitude!);
                } else {
                  showToast('Client GPS position not available', 'error');
                }
              }}
              style={[
                styles.gpsIconButton,
                order.client_gps_latitude && order.client_gps_longitude && styles.gpsIconButtonActive
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MapPin size={20} color={order.client_gps_latitude && order.client_gps_longitude ? "#2563eb" : "#94a3b8"} />
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
          </View>
          <Text style={styles.sectionContent}>{order.delivery_address}</Text>
          <Text style={styles.sectionSubContent}>Neighborhood: {order.delivery_neighborhood}</Text>
          {order.client_gps_latitude && order.client_gps_longitude && (
            <View style={styles.coordinatesContainer}>
              <View style={styles.coordinatesRow}>
                <MapPin size={14} color="#2563eb" />
                <Text style={styles.coordinatesLabel}>Client GPS Position:</Text>
              </View>
              <Text style={styles.coordinatesValue}>
                Long {order.client_gps_longitude.toFixed(6)}, Lat {order.client_gps_latitude.toFixed(6)}
              </Text>
              <TouchableOpacity
                style={styles.clientMapButton}
                onPress={() => handleOpenMap(order.client_gps_latitude!, order.client_gps_longitude!)}
              >
                <MapPin size={16} color="#fff" />
                <Text style={styles.mapButtonText}>Open in Google Maps</Text>
              </TouchableOpacity>
            </View>
          )}
          {(!order.client_gps_latitude || !order.client_gps_longitude) && (
            <View style={styles.noCoordinatesContainer}>
              <Text style={styles.noCoordinatesText}>
                Client GPS position not available
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#64748b" />
            <Text style={styles.sectionTitle}>Order Items</Text>
          </View>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.product_name}</Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} × {item.unit_price.toLocaleString()} F CFA
                </Text>
              </View>
              <Text style={styles.itemTotal}>{item.total_price.toLocaleString()} F CFA</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#64748b" />
            <Text style={styles.sectionTitle}>Payment Details</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Method</Text>
            <Text style={styles.infoValue}>{getPaymentMethodLabel(order.payment_method)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment Status</Text>
            <View style={[styles.paymentStatusBadge, { backgroundColor: getPaymentStatusColor(order.payment_status) + '20' }]}>
              <Text style={[styles.paymentStatusText, { color: getPaymentStatusColor(order.payment_status) }]}>
                {order.payment_status}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Subtotal</Text>
            <Text style={styles.infoValue}>{itemsSubtotal.toLocaleString()} F CFA</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery Fee</Text>
            <Text style={styles.infoValue}>{order.delivery_fee.toLocaleString()} F CFA</Text>
          </View>
          {order.is_express && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Express Delivery</Text>
              <Text style={[styles.infoValue, { color: '#f59e0b' }]}>Yes</Text>
            </View>
          )}
          {order.is_express && order.express_bonus > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Driver Bonus</Text>
              <Text style={[styles.infoValue, { color: '#10b981' }]}>+{order.express_bonus.toLocaleString()} F CFA</Text>
            </View>
          )}
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.total.toLocaleString()} F CFA</Text>
          </View>
        </View>

        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}
      </ScrollView>

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
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 16,
  },
  backButton: {
    padding: 8,
  },
  shareButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  sectionSubContent: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  phoneLink: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  itemDetails: {
    fontSize: 13,
    color: '#64748b',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#64748b',
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  gpsButtonText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  gpsLinkText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
    textDecorationLine: 'underline',
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
  clientMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 8,
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
    color: '#64748b',
    textAlign: 'center',
  },
  clientGpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  clientGpsText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
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
  driverDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  driverPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e2e8f0',
  },
  driverPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  driverDetailsInfo: {
    flex: 1,
    gap: 8,
  },
  driverDetailsName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  driverCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  driverCallButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
});
