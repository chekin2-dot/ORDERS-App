import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform, Share, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Package, Clock, DollarSign, Share2, User, Phone } from 'lucide-react-native';
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
  notes: string;
  payment_method: string;
  delivery_address: string;
  delivery_neighborhood: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  client_name: string;
  client_phone: string;
  driver_id: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_photo_url: string | null;
  items: OrderItem[];
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total,
          status,
          created_at,
          delivery_fee,
          notes,
          payment_method,
          delivery_address,
          delivery_neighborhood,
          delivery_latitude,
          delivery_longitude,
          client_id,
          driver_id
        `)
        .eq('id', id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!orderData) {
        console.error('Order not found');
        setLoading(false);
        return;
      }

      const { data: clientData } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, phone')
        .eq('id', orderData.client_id)
        .maybeSingle();

      let driverData = null;
      if (orderData.driver_id) {
        const { data: driverRecord } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', orderData.driver_id)
          .maybeSingle();

        if (driverRecord) {
          const { data } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, phone, profile_photo_url')
            .eq('id', driverRecord.user_id)
            .maybeSingle();
          driverData = data;
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
        driver_name: driverData ? `${driverData.first_name} ${driverData.last_name}` : null,
        driver_phone: driverData?.phone || null,
        driver_photo_url: driverData?.profile_photo_url || null,
        items: itemsData || [],
      });
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'En attente',
      accepted: 'Acceptée',
      preparing: 'En préparation',
      ready: 'Prête',
      in_delivery: 'En livraison',
      delivered: 'Livrée',
      cancelled: 'Annulée',
      rejected: 'Rejetée',
    };
    return statusMap[status] || status;
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

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: { [key: string]: string } = {
      cash: 'Espèces',
      orange_money: 'Orange Money',
      card: 'Carte bancaire',
    };
    return methodMap[method] || method;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

    const subtotal = order.total - order.delivery_fee;

    const message = `📦 Détails de la commande ${order.order_number}

📅 Date: ${formatDate(order.created_at)}

📝 Articles commandés:
${itemsList}

💰 Récapitulatif:
  Sous-total: ${subtotal.toFixed(0)} FCFA
  Frais de livraison: ${order.delivery_fee.toFixed(0)} FCFA
  Total: ${order.total.toFixed(0)} FCFA

💳 Paiement: ${getPaymentMethodLabel(order.payment_method)}

📊 Statut: ${getStatusLabel(order.status)}`;

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
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Détails de la commande</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>Commande introuvable</Text>
        </View>
      </View>
    );
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
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>{order.order_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color="#666" />
            <Text style={styles.sectionTitle}>Date et heure</Text>
          </View>
          <Text style={styles.sectionContent}>{formatDate(order.created_at)}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color="#666" />
            <Text style={styles.sectionTitle}>Produits commandés</Text>
          </View>
          <View style={styles.itemsList}>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
                <View style={styles.itemFooter}>
                  <Text style={styles.itemPrice}>{item.unit_price.toLocaleString('fr-FR')} F CFA/unité</Text>
                  <Text style={styles.itemTotal}>{item.total_price.toLocaleString('fr-FR')} F CFA</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={20} color="#666" />
            <Text style={styles.sectionTitle}>Détails du paiement</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Méthode de paiement</Text>
            <Text style={styles.infoValue}>{getPaymentMethodLabel(order.payment_method)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sous-total</Text>
            <Text style={styles.infoValue}>
              {(order.total - order.delivery_fee).toLocaleString('fr-FR')} F CFA
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Frais de livraison</Text>
            <Text style={styles.infoValue}>{order.delivery_fee.toLocaleString('fr-FR')} F CFA</Text>
          </View>
          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{order.total.toLocaleString('fr-FR')} F CFA</Text>
          </View>
        </View>

        {order.driver_id && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color="#666" />
              <Text style={styles.sectionTitle}>Informations du chauffeur</Text>
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
                    style={styles.driverPhoneRow}
                    onPress={() => Linking.openURL(`tel:${order.driver_phone}`)}
                  >
                    <Phone size={16} color="#2563eb" />
                    <Text style={styles.driverDetailsPhone}>{order.driver_phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

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
    backgroundColor: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
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
  sectionContent: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  sectionSubContent: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
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
  itemsList: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 13,
    color: '#999',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    borderBottomWidth: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
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
  driverDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 16,
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
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverDetailsInfo: {
    flex: 1,
    gap: 8,
  },
  driverDetailsName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  driverPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  driverDetailsPhone: {
    fontSize: 15,
    color: '#2563eb',
    fontWeight: '500',
  },
});
