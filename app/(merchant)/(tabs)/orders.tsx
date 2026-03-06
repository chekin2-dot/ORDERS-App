import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Package, TrendingUp, Clock, CircleCheck as CheckCircle, Calendar, Wallet, BadgeCheck, Search, ChevronDown, ChevronUp, ArrowDown, ArrowUp } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface CategoryStats {
  category: string;
  orderCount: number;
  revenue: number;
  percentage: number;
}

interface OrderStats {
  total: number;
  pending: number;
  preparing: number;
  completed: number;
  revenue: number;
}

interface DailySales {
  date: string;
  total_sales: number;
  merchant_amount: number;
  platform_commission: number;
  order_count: number;
  payment_status: string;
  paid_at: string | null;
}

interface PeriodSales {
  total_sales: number;
  merchant_amount: number;
  platform_commission: number;
  order_count: number;
  start_date: string;
  end_date: string;
}

interface OrderListItem {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  driver_id: string | null;
  driver_first_name: string | null;
  driver_last_name: string | null;
  driver_phone: string | null;
  driver_photo_url: string | null;
}

export default function MerchantOrdersScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { scrollTo } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const allOrdersSectionRef = useRef<View>(null);
  const [loading, setLoading] = useState(true);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    preparing: 0,
    completed: 0,
    revenue: 0,
  });
  const [yesterdaySales, setYesterdaySales] = useState<DailySales | null>(null);
  const [todaySales, setTodaySales] = useState<DailySales | null>(null);
  const [weeklySales, setWeeklySales] = useState<PeriodSales | null>(null);
  const [monthlySales, setMonthlySales] = useState<PeriodSales | null>(null);
  const [firstOrderDate, setFirstOrderDate] = useState<string | null>(null);
  const [allOrders, setAllOrders] = useState<OrderListItem[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'completed'>('all');

  useEffect(() => {
    console.log('[Orders] Profile changed:', {
      hasMerchantId: !!profile?.merchant_id,
      merchantId: profile?.merchant_id,
      userId: profile?.id
    });

    if (profile?.merchant_id) {
      console.log('[Orders] Loading data for merchant:', profile.merchant_id);
      loadOrdersData();
      loadAllOrders();
      loadDailySales();
      loadPeriodSales();
    } else if (profile && !profile.merchant_id) {
      console.log('[Orders] Profile exists but no merchant_id');
      setLoading(false);
    }
  }, [profile?.merchant_id]);

  useEffect(() => {
    if (scrollTo === 'allOrders' && allOrdersSectionRef.current) {
      setTimeout(() => {
        allOrdersSectionRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
          },
          () => {}
        );
      }, 500);
    }
  }, [scrollTo, loading]);

  useEffect(() => {
    let filtered = [...allOrders];

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        filtered = filtered.filter(order => order.status === 'pending');
      } else if (statusFilter === 'preparing') {
        filtered = filtered.filter(order => ['accepted', 'preparing', 'ready'].includes(order.status));
      } else if (statusFilter === 'completed') {
        filtered = filtered.filter(order => order.status === 'delivered');
      }
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(query) ||
        (order.driver_first_name && order.driver_first_name.toLowerCase().includes(query)) ||
        (order.driver_last_name && order.driver_last_name.toLowerCase().includes(query)) ||
        (order.driver_first_name && order.driver_last_name &&
          `${order.driver_first_name} ${order.driver_last_name}`.toLowerCase().includes(query))
      );
    }

    setFilteredOrders(filtered);
  }, [searchQuery, allOrders, statusFilter]);

  useEffect(() => {
    if (!profile?.merchant_id) return;

    console.log('[Orders] Setting up realtime subscription for merchant:', profile.merchant_id);

    const subscription = supabase
      .channel('merchant_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `merchant_id=eq.${profile.merchant_id}`,
        },
        (payload) => {
          console.log('[Orders] Realtime order change detected:', payload);
          // Reload all data
          loadOrdersData();
          loadAllOrders();
          loadDailySales();
          loadPeriodSales();
        }
      )
      .subscribe((status) => {
        console.log('[Orders] Subscription status:', status);
      });

    return () => {
      console.log('[Orders] Unsubscribing from realtime');
      subscription.unsubscribe();
    };
  }, [profile?.merchant_id]);

  async function loadOrdersData() {
    if (!profile?.merchant_id) return;

    try {
      setLoading(true);

      // Get all orders for this merchant
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total,
          created_at,
          order_items (
            product_id,
            quantity,
            total_price,
            products (
              category
            )
          )
        `)
        .eq('merchant_id', profile.merchant_id);

      if (orders) {
        // Calculate order stats
        const stats: OrderStats = {
          total: orders.length,
          pending: orders.filter(o => o.status === 'pending').length,
          preparing: orders.filter(o => ['accepted', 'preparing', 'ready'].includes(o.status)).length,
          completed: orders.filter(o => o.status === 'delivered').length,
          revenue: orders.reduce((sum, o) => sum + parseFloat(o.total.toString()), 0),
        };
        setOrderStats(stats);

        // Find earliest order date
        if (orders.length > 0) {
          const sortedOrders = [...orders].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setFirstOrderDate(sortedOrders[0].created_at);
        }

        // Calculate category stats
        const categoryMap = new Map<string, { count: number; revenue: number }>();

        orders.forEach(order => {
          order.order_items?.forEach((item: any) => {
            const category = item.products?.category || 'Non catégorisé';
            const existing = categoryMap.get(category) || { count: 0, revenue: 0 };
            categoryMap.set(category, {
              count: existing.count + 1,
              revenue: existing.revenue + parseFloat(item.total_price.toString()),
            });
          });
        });

        // Convert to array and calculate percentages
        const totalRevenue = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.revenue, 0);
        const categoryArray: CategoryStats[] = Array.from(categoryMap.entries())
          .map(([category, data]) => ({
            category,
            orderCount: data.count,
            revenue: data.revenue,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10); // Top 10 categories

        setCategoryStats(categoryArray);
      }

      // Load daily sales
      await loadDailySales();

      // Load weekly and monthly sales
      await loadPeriodSales();
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDailySales() {
    if (!profile?.merchant_id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Get yesterday's sales
      const { data: yesterdayData, error: yesterdayError } = await supabase
        .rpc('get_merchant_daily_sales', {
          merchant_uuid: profile.merchant_id,
          target_date: yesterday
        });

      if (!yesterdayError && yesterdayData && yesterdayData.length > 0) {
        setYesterdaySales(yesterdayData[0]);
      }

      // Get today's sales
      const { data: todayData, error: todayError } = await supabase
        .rpc('get_merchant_daily_sales', {
          merchant_uuid: profile.merchant_id,
          target_date: today
        });

      if (!todayError && todayData && todayData.length > 0) {
        setTodaySales(todayData[0]);
      }
    } catch (error) {
      console.error('Error loading daily sales:', error);
    }
  }

  async function loadPeriodSales() {
    if (!profile?.merchant_id) return;

    try {
      // Get weekly sales
      const { data: weeklyData, error: weeklyError } = await supabase
        .rpc('get_merchant_weekly_sales', {
          merchant_uuid: profile.merchant_id
        });

      if (!weeklyError && weeklyData && weeklyData.length > 0) {
        setWeeklySales(weeklyData[0]);
      }

      // Get monthly sales
      const { data: monthlyData, error: monthlyError } = await supabase
        .rpc('get_merchant_monthly_sales', {
          merchant_uuid: profile.merchant_id
        });

      if (!monthlyError && monthlyData && monthlyData.length > 0) {
        setMonthlySales(monthlyData[0]);
      }
    } catch (error) {
      console.error('Error loading period sales:', error);
    }
  }

  async function loadAllOrders() {
    if (!profile?.merchant_id) {
      console.log('[Orders] Cannot load orders - merchant_id not found in profile:', profile);
      return;
    }

    try {
      console.log('[Orders] Loading all orders for merchant_id:', profile.merchant_id);
      setOrdersLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total,
          status,
          created_at,
          driver_id,
          drivers!orders_driver_id_fkey (
            user_profiles (
              first_name,
              last_name,
              phone,
              profile_photo_url
            )
          )
        `)
        .eq('merchant_id', profile.merchant_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Orders] Error loading orders:', error);
        throw error;
      }

      console.log('[Orders] Loaded orders count:', data?.length || 0);

      const ordersWithDriverInfo: OrderListItem[] = data?.map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        status: order.status,
        created_at: order.created_at,
        driver_id: order.driver_id,
        driver_first_name: order.drivers?.user_profiles?.first_name || null,
        driver_last_name: order.drivers?.user_profiles?.last_name || null,
        driver_phone: order.drivers?.user_profiles?.phone || null,
        driver_photo_url: order.drivers?.user_profiles?.profile_photo_url || null,
      })) || [];

      setAllOrders(ordersWithDriverInfo);
      setFilteredOrders(ordersWithDriverInfo);
    } catch (error) {
      console.error('[Orders] Error loading all orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleStatusFilter = (filter: 'all' | 'pending' | 'preparing' | 'completed') => {
    setStatusFilter(filter);
    setSearchQuery('');
    setTimeout(() => {
      allOrdersSectionRef.current?.measureLayout(
        scrollViewRef.current as any,
        (x, y) => {
          scrollViewRef.current?.scrollTo({ y: y - 20, animated: true });
        },
        () => {}
      );
    }, 100);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'En attente',
      pending_driver_acceptance: 'Attente chauffeur',
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
      pending_driver_acceptance: '#ff9800',
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

  const maxRevenue = categoryStats.length > 0 ? Math.max(...categoryStats.map(c => c.revenue)) : 1;

  const formatDateRange = () => {
    if (!firstOrderDate) return '';

    const startDate = new Date(firstOrderDate);
    const today = new Date();

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return `Du ${formatDate(startDate)} au ${formatDate(today)}`;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Commandes reçues</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : orderStats.total === 0 ? (
          <Text style={styles.emptyText}>Aucune commande reçue pour le moment</Text>
        ) : (
          <>
            {/* Order Stats Cards */}
            <View style={styles.statsSection}>
              <View style={styles.statsGrid}>
                <TouchableOpacity
                  style={[styles.statsCard, statusFilter === 'all' && styles.statsCardActive]}
                  onPress={() => handleStatusFilter('all')}
                  activeOpacity={0.7}
                >
                  <Package size={24} color={statusFilter === 'all' ? "#ffffff" : "#2563eb"} />
                  <Text style={[styles.statsValue, statusFilter === 'all' && styles.statsValueActive]}>{orderStats.total}</Text>
                  <Text style={[styles.statsLabel, statusFilter === 'all' && styles.statsLabelActive]}>Total</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statsCard, statusFilter === 'pending' && styles.statsCardActive]}
                  onPress={() => handleStatusFilter('pending')}
                  activeOpacity={0.7}
                >
                  <Clock size={24} color={statusFilter === 'pending' ? "#ffffff" : "#f59e0b"} />
                  <Text style={[styles.statsValue, statusFilter === 'pending' && styles.statsValueActive]}>{orderStats.pending}</Text>
                  <Text style={[styles.statsLabel, statusFilter === 'pending' && styles.statsLabelActive]}>En attente</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statsCard, statusFilter === 'preparing' && styles.statsCardActive]}
                  onPress={() => handleStatusFilter('preparing')}
                  activeOpacity={0.7}
                >
                  <TrendingUp size={24} color={statusFilter === 'preparing' ? "#ffffff" : "#8b5cf6"} />
                  <Text style={[styles.statsValue, statusFilter === 'preparing' && styles.statsValueActive]}>{orderStats.preparing}</Text>
                  <Text style={[styles.statsLabel, statusFilter === 'preparing' && styles.statsLabelActive]}>En cours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statsCard, statusFilter === 'completed' && styles.statsCardActive]}
                  onPress={() => handleStatusFilter('completed')}
                  activeOpacity={0.7}
                >
                  <CheckCircle size={24} color={statusFilter === 'completed' ? "#ffffff" : "#10b981"} />
                  <Text style={[styles.statsValue, statusFilter === 'completed' && styles.statsValueActive]}>{orderStats.completed}</Text>
                  <Text style={[styles.statsLabel, statusFilter === 'completed' && styles.statsLabelActive]}>Livrées</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.revenueCard}>
                <Text style={styles.revenueLabel}>Chiffre d'affaires total</Text>
                {firstOrderDate && (
                  <Text style={styles.revenuePeriod}>{formatDateRange()}</Text>
                )}
                <Text style={styles.revenueValue}>{orderStats.revenue.toLocaleString()} F CFA</Text>
              </View>
            </View>

            {/* Daily Sales Report */}
            {(yesterdaySales || todaySales) && (
              <View style={styles.reportSection}>
                <View style={styles.reportHeader}>
                  <Calendar size={20} color="#2563eb" style={{ marginBottom: 4 }} />
                  <Text style={styles.reportTitle}>Ventes par jour</Text>
                  <Text style={styles.reportSubtitle}>Paiements effectués chaque jour pour le CA de J-1</Text>
                </View>

                <View style={styles.dailySalesContainer}>
                  {/* Yesterday's Sales */}
                  {yesterdaySales && yesterdaySales.total_sales > 0 && (
                    <View style={styles.dailySalesCard}>
                      <View style={styles.dailySalesHeader}>
                        <Text style={styles.dailySalesDate}>Hier</Text>
                        {yesterdaySales.payment_status === 'paid' && (
                          <View style={styles.paidBadge}>
                            <BadgeCheck size={16} color="#10b981" />
                            <Text style={styles.paidBadgeText}>PAYÉ !</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.dailySalesRow}>
                        <Text style={styles.dailySalesLabel}>Chiffre d'affaires</Text>
                        <Text style={styles.dailySalesValue}>
                          {yesterdaySales.total_sales.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.merchantShareContainer}>
                        <View style={styles.splitLabelContainer}>
                          <Wallet size={16} color="#10b981" />
                          <Text style={styles.splitLabel}>Votre part (90%)</Text>
                        </View>
                        <Text style={styles.merchantAmount}>
                          {yesterdaySales.merchant_amount.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.dailySalesRow}>
                        <Text style={styles.platformLabel}>Commission ORDERS (10%)</Text>
                        <Text style={styles.platformAmount}>
                          {yesterdaySales.platform_commission.toLocaleString()} F CFA
                        </Text>
                      </View>

                      {yesterdaySales.payment_status === 'pending' && (
                        <View style={styles.pendingNotice}>
                          <Text style={styles.pendingNoticeText}>
                            Paiement en attente via Orange Money
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Today's Sales */}
                  {todaySales && todaySales.total_sales > 0 && (
                    <View style={styles.dailySalesCard}>
                      <View style={styles.dailySalesHeader}>
                        <Text style={styles.dailySalesDate}>Aujourd'hui</Text>
                        <View style={styles.todayBadge}>
                          <Text style={styles.todayBadgeText}>En cours</Text>
                        </View>
                      </View>

                      <View style={styles.dailySalesRow}>
                        <Text style={styles.dailySalesLabel}>Chiffre d'affaires</Text>
                        <Text style={styles.dailySalesValue}>
                          {todaySales.total_sales.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.merchantShareContainer}>
                        <View style={styles.splitLabelContainer}>
                          <Wallet size={16} color="#10b981" />
                          <Text style={styles.splitLabel}>Votre part (90%)</Text>
                        </View>
                        <Text style={styles.merchantAmount}>
                          {todaySales.merchant_amount.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.dailySalesRow}>
                        <Text style={styles.platformLabel}>Commission ORDERS (10%)</Text>
                        <Text style={styles.platformAmount}>
                          {todaySales.platform_commission.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.todayNotice}>
                        <Text style={styles.todayNoticeText}>
                          Sera payé demain via Orange Money
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Weekly and Monthly Sales Report */}
            {(weeklySales || monthlySales) && (
              <View style={styles.reportSection}>
                <View style={styles.reportHeader}>
                  <TrendingUp size={20} color="#2563eb" style={{ marginBottom: 4 }} />
                  <Text style={styles.reportTitle}>CA par semaine et mois</Text>
                  <Text style={styles.reportSubtitle}>Chiffre d'affaires cumulé sur la période</Text>
                </View>

                <View style={styles.periodSalesContainer}>
                  {/* Weekly Sales */}
                  {weeklySales && weeklySales.total_sales > 0 && (
                    <View style={styles.periodSalesCard}>
                      <View style={styles.periodSalesHeader}>
                        <Text style={styles.periodSalesTitle}>Cette semaine</Text>
                        <Text style={styles.periodSalesSubtitle}>
                          {new Date(weeklySales.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {new Date(weeklySales.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>

                      <View style={styles.periodSalesRow}>
                        <Text style={styles.dailySalesLabel}>Chiffre d'affaires</Text>
                        <Text style={styles.dailySalesValue}>
                          {weeklySales.total_sales.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.merchantShareContainer}>
                        <View style={styles.splitLabelContainer}>
                          <Wallet size={16} color="#10b981" />
                          <Text style={styles.splitLabel}>Votre part (90%)</Text>
                        </View>
                        <Text style={styles.merchantAmount}>
                          {weeklySales.merchant_amount.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.dailySalesRow}>
                        <Text style={styles.platformLabel}>Commission ORDERS (10%)</Text>
                        <Text style={styles.platformAmount}>
                          {weeklySales.platform_commission.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.periodOrderCount}>
                        <Package size={14} color="#64748b" />
                        <Text style={styles.periodOrderCountText}>
                          {weeklySales.order_count} commande{weeklySales.order_count > 1 ? 's' : ''} livrée{weeklySales.order_count > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Monthly Sales */}
                  {monthlySales && monthlySales.total_sales > 0 && (
                    <View style={styles.periodSalesCard}>
                      <View style={styles.periodSalesHeader}>
                        <Text style={styles.periodSalesTitle}>Ce mois-ci</Text>
                        <Text style={styles.periodSalesSubtitle}>
                          {new Date(monthlySales.start_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </Text>
                      </View>

                      <View style={styles.periodSalesRow}>
                        <Text style={styles.dailySalesLabel}>Chiffre d'affaires</Text>
                        <Text style={styles.dailySalesValue}>
                          {monthlySales.total_sales.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.merchantShareContainer}>
                        <View style={styles.splitLabelContainer}>
                          <Wallet size={16} color="#10b981" />
                          <Text style={styles.splitLabel}>Votre part (90%)</Text>
                        </View>
                        <Text style={styles.merchantAmount}>
                          {monthlySales.merchant_amount.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.dailySalesRow}>
                        <Text style={styles.platformLabel}>Commission ORDERS (10%)</Text>
                        <Text style={styles.platformAmount}>
                          {monthlySales.platform_commission.toLocaleString()} F CFA
                        </Text>
                      </View>

                      <View style={styles.periodOrderCount}>
                        <Package size={14} color="#64748b" />
                        <Text style={styles.periodOrderCountText}>
                          {monthlySales.order_count} commande{monthlySales.order_count > 1 ? 's' : ''} livrée{monthlySales.order_count > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Category Report */}
            {categoryStats.length > 0 && (
              <View style={styles.reportSection}>
                <View style={styles.reportHeader}>
                  <Text style={styles.reportTitle}>Ventes par catégorie</Text>
                  <Text style={styles.reportSubtitle}>Top 10 des catégories les plus vendues</Text>
                </View>

                <View style={styles.chartContainer}>
                  {categoryStats.map((item, index) => (
                    <View key={index} style={styles.chartRow}>
                      <View style={styles.chartLabelContainer}>
                        <Text style={styles.chartLabel} numberOfLines={1}>
                          {item.category}
                        </Text>
                        <Text style={styles.chartCount}>({item.orderCount})</Text>
                      </View>

                      <View style={styles.chartBarContainer}>
                        <View
                          style={[
                            styles.chartBar,
                            { width: `${(item.revenue / maxRevenue) * 100}%` }
                          ]}
                        />
                      </View>

                      <View style={styles.chartValueContainer}>
                        <Text style={styles.chartValue}>
                          {item.revenue.toLocaleString()}
                        </Text>
                        <Text style={styles.chartCurrency}>F CFA</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.legendContainer}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#2563eb' }]} />
                    <Text style={styles.legendText}>Les barres représentent le chiffre d'affaires par catégorie</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <Text style={styles.legendText}>Les chiffres entre parenthèses indiquent le nombre d'articles vendus</Text>
                  </View>
                </View>
              </View>
            )}

            {/* All Orders Section */}
            <View
              ref={allOrdersSectionRef}
              style={styles.allOrdersSection}
            >
              <View style={styles.allOrdersHeader}>
                <View>
                  <Text style={styles.reportTitle}>Toutes les commandes</Text>
                  <Text style={styles.reportSubtitle}>
                    {filteredOrders.length} commande{filteredOrders.length > 1 ? 's' : ''} au total
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => {
                    loadAllOrders();
                    loadOrdersData();
                    loadDailySales();
                    loadPeriodSales();
                  }}
                  disabled={ordersLoading}
                >
                  <Package size={20} color={ordersLoading ? '#94a3b8' : '#2563eb'} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={20} color="#64748b" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher par code ou nom du chauffeur..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              {/* Active Filter Indicator */}
              {statusFilter !== 'all' && (
                <View style={styles.filterIndicator}>
                  <Text style={styles.filterIndicatorText}>
                    Filtre actif: {statusFilter === 'pending' ? 'En attente' : statusFilter === 'preparing' ? 'En cours' : 'Livrées'}
                  </Text>
                  <TouchableOpacity onPress={() => handleStatusFilter('all')}>
                    <Text style={styles.filterIndicatorClear}>Tout afficher</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Orders List */}
              {ordersLoading ? (
                <View style={styles.ordersLoadingContainer}>
                  <ActivityIndicator size="large" color="#2563eb" />
                </View>
              ) : filteredOrders.length === 0 ? (
                <View style={styles.emptyOrdersContainer}>
                  <Text style={styles.emptyOrdersText}>
                    {searchQuery ? 'Aucune commande trouvée' : 'Aucune commande pour le moment'}
                  </Text>
                  {!searchQuery && (
                    <Text style={styles.emptyOrdersSubtext}>
                      Vos commandes apparaîtront ici dès que les clients passeront commande.
                    </Text>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.ordersListContainer}>
                    {(showAllOrders ? filteredOrders : filteredOrders.slice(0, 20)).map((order) => (
                      <TouchableOpacity
                        key={order.id}
                        style={styles.orderListCard}
                        onPress={() => router.push(`/(merchant)/order-details?id=${order.id}`)}
                      >
                        <View style={styles.orderListHeader}>
                          <Text style={styles.orderListNumber}>{order.order_number}</Text>
                          <View style={[styles.orderListStatusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                            <Text style={styles.orderListStatusText}>{getStatusLabel(order.status)}</Text>
                          </View>
                        </View>

                        <View style={styles.orderListInfo}>
                          <Text style={styles.orderListDate}>{formatDate(order.created_at)}</Text>
                          <Text style={styles.orderListTotal}>{order.total.toLocaleString('fr-FR')} F CFA</Text>
                        </View>

                        {order.driver_id && (
                          <View style={styles.driverInfo}>
                            <Text style={styles.driverLabel}>Chauffeur:</Text>
                            <Text style={styles.driverName}>
                              {order.driver_first_name} {order.driver_last_name}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {filteredOrders.length > 20 && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => setShowAllOrders(!showAllOrders)}
                    >
                      {showAllOrders ? (
                        <>
                          <ChevronUp size={20} color="#2563eb" />
                          <Text style={styles.expandButtonText}>
                            Réduire (Afficher 20 commandes)
                          </Text>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={20} color="#2563eb" />
                          <Text style={styles.expandButtonText}>
                            Voir toutes les {filteredOrders.length} commandes
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Floating Scroll Arrows */}
      {filteredOrders.length > 5 && !ordersLoading && (
        <View style={styles.floatingScrollButtons}>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={scrollToTop}
            activeOpacity={0.7}
          >
            <ArrowUp size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.floatingButton, { marginTop: 12 }]}
            onPress={scrollToBottom}
            activeOpacity={0.7}
          >
            <ArrowDown size={24} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      )}
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
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 60,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statsCardActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
    marginBottom: 4,
  },
  statsValueActive: {
    color: '#ffffff',
  },
  statsLabel: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  statsLabelActive: {
    color: '#dbeafe',
  },
  revenueCard: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  revenueLabel: {
    fontSize: 14,
    color: '#dbeafe',
    marginBottom: 4,
    fontWeight: '500',
  },
  revenuePeriod: {
    fontSize: 12,
    color: '#bfdbfe',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  reportSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reportHeader: {
    marginBottom: 20,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  chartContainer: {
    gap: 16,
  },
  chartRow: {
    gap: 8,
  },
  chartLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  chartCount: {
    fontSize: 12,
    color: '#64748b',
  },
  chartBarContainer: {
    height: 32,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  chartBar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    minWidth: 2,
  },
  chartValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  chartValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  chartCurrency: {
    fontSize: 12,
    color: '#64748b',
  },
  legendContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  dailySalesContainer: {
    gap: 16,
  },
  dailySalesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dailySalesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailySalesDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paidBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#10b981',
  },
  todayBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  todayBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  dailySalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  merchantShareContainer: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  dailySalesLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  dailySalesValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  splitLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  splitLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
  },
  merchantAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 4,
  },
  platformLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  platformAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  pendingNotice: {
    marginTop: 12,
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  pendingNoticeText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
  },
  todayNotice: {
    marginTop: 12,
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  todayNoticeText: {
    fontSize: 13,
    color: '#1e40af',
    textAlign: 'center',
    fontWeight: '500',
  },
  periodSalesContainer: {
    gap: 16,
  },
  periodSalesCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  periodSalesHeader: {
    marginBottom: 16,
  },
  periodSalesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  periodSalesSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  periodSalesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodOrderCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  periodOrderCountText: {
    fontSize: 12,
    color: '#64748b',
  },
  allOrdersSection: {
    marginTop: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  allOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  filterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  filterIndicatorText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '600',
  },
  filterIndicatorClear: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  floatingScrollButtons: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    zIndex: 1000,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ordersLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyOrdersContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyOrdersText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptyOrdersSubtext: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
  },
  ordersListContainer: {
    gap: 12,
  },
  orderListCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderListNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  orderListStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderListStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  orderListInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderListDate: {
    fontSize: 13,
    color: '#64748b',
  },
  orderListTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  driverLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  driverName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
});
