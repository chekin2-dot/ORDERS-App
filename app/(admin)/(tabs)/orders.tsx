import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Search, PackageSearch, Eye, DollarSign, ChevronUp, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  client: { first_name: string; last_name: string };
  merchant: { shop_name: string };
  driver: { user_profiles: { first_name: string; last_name: string } } | null;
}

export default function OrdersManagementScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, filterStatus]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          payment_method,
          payment_status,
          created_at,
          client:user_profiles!orders_client_id_fkey(first_name, last_name),
          merchant:merchants(shop_name),
          driver:drivers(user_profiles(first_name, last_name))
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setOrders(data as any || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter(o =>
        o.order_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus);
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: '#f59e0b',
      accepted: '#3b82f6',
      preparing: '#8b5cf6',
      ready: '#10b981',
      in_delivery: '#14b8a6',
      delivered: '#10b981',
      cancelled: '#ef4444',
      rejected: '#dc2626',
    };
    return colors[status] || '#64748b';
  };

  const getPaymentStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
    };
    return colors[status] || '#64748b';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      all: 'Tous',
      pending: 'En attente',
      accepted: 'Accepté',
      delivered: 'Livré',
      cancelled: 'Annulé',
    };
    return labels[status] || status;
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 200);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Commandes & Transactions</Text>
        <Text style={styles.subtitle}>{filteredOrders.length} commandes</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par numéro de commande..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChipFull, filterStatus === 'all' && styles.filterChipActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextActive]}>
            Tous ({orders.length})
          </Text>
        </TouchableOpacity>
        <View style={styles.filterGrid}>
          {['pending', 'accepted', 'delivered', 'cancelled'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChipGrid, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.filterChipTextSmall, filterStatus === status && styles.filterChipTextActive]}>
                {getStatusLabel(status)} ({orders.filter(o => o.status === status).length})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadOrders} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {filteredOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => router.push(`/(admin)/order-details?id=${order.id}`)}
          >
            <View style={styles.orderHeader}>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                  {order.status}
                </Text>
              </View>
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoLabel}>Client:</Text>
              <Text style={styles.orderInfoValue}>
                {order.client?.first_name} {order.client?.last_name}
              </Text>
            </View>

            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoLabel}>Commerçant:</Text>
              <Text style={styles.orderInfoValue}>{order.merchant?.shop_name}</Text>
            </View>

            {order.driver && (
              <View style={styles.orderInfo}>
                <Text style={styles.orderInfoLabel}>Livreur:</Text>
                <Text style={styles.orderInfoValue}>
                  {order.driver.user_profiles?.first_name} {order.driver.user_profiles?.last_name}
                </Text>
              </View>
            )}

            <View style={styles.orderFooter}>
              <View style={styles.orderAmount}>
                <DollarSign size={16} color="#10b981" />
                <Text style={styles.orderAmountText}>{order.total?.toLocaleString()} F CFA</Text>
              </View>
              <View style={[styles.paymentBadge, { backgroundColor: getPaymentStatusColor(order.payment_status) + '20' }]}>
                <Text style={[styles.paymentText, { color: getPaymentStatusColor(order.payment_status) }]}>
                  {order.payment_status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filteredOrders.length === 0 && (
          <View style={styles.emptyState}>
            <PackageSearch size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucune commande trouvée</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.scrollButton, styles.scrollButtonBottom]}
        onPress={scrollToBottom}
      >
        <ChevronDown size={20} color="#fff" />
      </TouchableOpacity>

      {showScrollTop && (
        <TouchableOpacity
          style={[styles.scrollButton, styles.scrollButtonTop]}
          onPress={scrollToTop}
        >
          <ChevronUp size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 10,
  },
  filterChipFull: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterChipGrid: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderInfo: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  orderInfoLabel: {
    fontSize: 13,
    color: '#64748b',
    width: 80,
  },
  orderInfoValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  orderAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 12,
  },
  scrollButton: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollButtonBottom: {
    bottom: 100,
  },
  scrollButtonTop: {
    bottom: 154,
  },
});
