import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Package, DollarSign, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SystemNotificationBanner from '@/components/SystemNotificationBanner';

interface OrderStats {
  todayOrders: number;
  inProgress: number;
  todayRevenue: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  items: Array<{
    product_name: string;
    quantity: number;
  }>;
}

export default function MerchantDashboardScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<OrderStats>({
    todayOrders: 0,
    inProgress: 0,
    todayRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.merchant_id) {
      fetchDashboardData();
    } else if (profile && !profile.merchant_id) {
      setLoading(false);
    }
  }, [profile?.merchant_id]);

  const fetchDashboardData = async () => {
    if (!profile?.merchant_id) return;

    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total,
          status,
          created_at,
          order_items (
            product_name,
            quantity
          )
        `)
        .eq('merchant_id', profile.merchant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersWithItems = orders?.map(order => ({
        ...order,
        items: order.order_items || []
      })) || [];

      const todayOrders = ordersWithItems?.filter(
        (order) => new Date(order.created_at) >= today
      ) || [];

      const inProgressOrders = ordersWithItems?.filter(
        (order) => ['pending', 'accepted', 'preparing', 'ready', 'in_delivery'].includes(order.status)
      ) || [];

      const todayRevenue = todayOrders.reduce(
        (sum, order) => sum + (order.total || 0),
        0
      );

      setStats({
        todayOrders: todayOrders.length,
        inProgress: inProgressOrders.length,
        todayRevenue,
      });

      setRecentOrders(ordersWithItems?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!profile) return null;

    let statusColor = '#f0ad4e';
    let statusText = 'En attente de validation';

    if (profile.status === 'active') {
      statusColor = '#5cb85c';
      statusText = 'Active';
    } else if (profile.status === 'suspended') {
      statusColor = '#d9534f';
      statusText = 'Suspendue';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.logo}>ORDERS App</Text>
        {profile && (
          <Text style={styles.subtitle}>
            Bienvenue {profile.first_name} {profile.last_name}
          </Text>
        )}
        {getStatusBadge()}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <SystemNotificationBanner />
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(merchant)/(tabs)/orders?filter=today')}
            activeOpacity={0.75}
          >
            <Package size={32} color="#1a1a1a" />
            <Text style={[styles.statValue, styles.statValueMargin]}>{stats.todayOrders}</Text>
            <Text style={styles.statLabel}>Commandes du jour</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(merchant)/(tabs)/orders?filter=inprogress')}
            activeOpacity={0.75}
          >
            <Clock size={32} color="#1a1a1a" />
            <Text style={[styles.statValue, styles.statValueMargin]}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>En cours</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.push('/(merchant)/(tabs)/orders?scrollTo=sales')}
            activeOpacity={0.75}
          >
            <DollarSign size={32} color="#1a1a1a" />
            <View style={styles.priceContainer}>
              <Text style={styles.statValue}>{stats.todayRevenue.toLocaleString('fr-FR')}</Text>
              <Text style={styles.currencyLabel}>F CFA</Text>
            </View>
            <Text style={styles.statLabel}>Chiffre du jour</Text>
          </TouchableOpacity>
        </View>

        {profile?.status === 'pending' && (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Compte en attente</Text>
            <Text style={styles.alertText}>
              Votre compte est en cours de vérification. Vous serez notifié une fois
              votre boutique validée et vous pourrez commencer à recevoir des commandes.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions rapides</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(merchant)/(tabs)/orders?scrollTo=allOrders')}
          >
            <Text style={styles.actionButtonText}>Voir toutes les commandes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(merchant)/(tabs)/catalog')}
          >
            <Text style={styles.actionButtonText}>Ajouter un produit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commandes récentes</Text>
          {recentOrders.length === 0 ? (
            <Text style={styles.emptyText}>Aucune commande pour le moment</Text>
          ) : (
            recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/(merchant)/order-details?id=${order.id}`)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>{order.order_number}</Text>
                  <View style={[styles.orderStatusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.orderStatusText}>{getStatusLabel(order.status)}</Text>
                  </View>
                </View>
                {order.items.length > 0 && (
                  <View style={styles.orderItems}>
                    {order.items.slice(0, 2).map((item, index) => (
                      <Text key={index} style={styles.orderItemText}>
                        • {item.quantity}x {item.product_name}
                      </Text>
                    ))}
                    {order.items.length > 2 && (
                      <Text style={styles.orderMoreText}>
                        +{order.items.length - 2} autre{order.items.length - 2 > 1 ? 's' : ''} produit{order.items.length - 2 > 1 ? 's' : ''}
                      </Text>
                    )}
                  </View>
                )}
                <View style={styles.orderFooter}>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                  <Text style={styles.orderTotal}>{order.total.toLocaleString('fr-FR')} F CFA</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
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
  priceContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statValueMargin: {
    marginTop: 8,
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  orderCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  orderItems: {
    marginBottom: 12,
    gap: 4,
  },
  orderItemText: {
    fontSize: 13,
    color: '#666',
  },
  orderMoreText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
