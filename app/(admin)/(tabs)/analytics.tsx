import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Truck, Download, Store, Award, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { exportAnalyticsToExcel } from '@/lib/excelExport';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;
const BAR_MAX_WIDTH = CHART_WIDTH - 180;

interface AnalyticsData {
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  daily_orders: number;
  weekly_orders: number;
  monthly_orders: number;
  avg_order_value: number;
  total_clients: number;
  total_merchants: number;
  total_drivers: number;
}

interface TopPerformer {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  phone?: string;
}

interface CategoryPerformance {
  category_id: string;
  category_name: string;
  merchants: {
    id: string;
    name: string;
    revenue: number;
    orders: number;
  }[];
}

export default function AnalyticsScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [topMerchants, setTopMerchants] = useState<TopPerformer[]>([]);
  const [topDrivers, setTopDrivers] = useState<TopPerformer[]>([]);
  const [topClients, setTopClients] = useState<TopPerformer[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const dayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now.setDate(now.getDate() - 7));
      const monthStart = new Date(now.setMonth(now.getMonth() - 1));

      const periodStart = period === 'day' ? dayStart : period === 'week' ? weekStart : monthStart;

      const { data: dailyStats } = await supabase
        .from('orders')
        .select('total, status')
        .gte('created_at', dayStart.toISOString())
        .eq('status', 'delivered');

      const { data: weeklyStats } = await supabase
        .from('orders')
        .select('total, status')
        .gte('created_at', weekStart.toISOString())
        .eq('status', 'delivered');

      const { data: monthlyStats } = await supabase
        .from('orders')
        .select('total, status')
        .gte('created_at', monthStart.toISOString())
        .eq('status', 'delivered');

      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_type');

      const analytics: AnalyticsData = {
        daily_revenue: dailyStats?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
        weekly_revenue: weeklyStats?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
        monthly_revenue: monthlyStats?.reduce((sum, o) => sum + Number(o.total), 0) || 0,
        daily_orders: dailyStats?.length || 0,
        weekly_orders: weeklyStats?.length || 0,
        monthly_orders: monthlyStats?.length || 0,
        avg_order_value: monthlyStats?.length ? (monthlyStats.reduce((sum, o) => sum + Number(o.total), 0) / monthlyStats.length) : 0,
        total_clients: users?.filter(u => u.user_type === 'client').length || 0,
        total_merchants: users?.filter(u => u.user_type === 'merchant').length || 0,
        total_drivers: users?.filter(u => u.user_type === 'driver').length || 0,
      };

      setData(analytics);

      const { data: ordersWithDetails } = await supabase
        .from('orders')
        .select(`
          id,
          total,
          delivery_fee,
          status,
          client_id,
          merchant_id,
          driver_id,
          created_at
        `)
        .gte('created_at', periodStart.toISOString())
        .eq('status', 'delivered');

      if (ordersWithDetails) {
        const merchantRevenue = new Map<string, { revenue: number; orders: number }>();
        const driverEarnings = new Map<string, { revenue: number; orders: number }>();
        const clientSpending = new Map<string, { revenue: number; orders: number }>();

        ordersWithDetails.forEach(order => {
          if (order.merchant_id) {
            const current = merchantRevenue.get(order.merchant_id) || { revenue: 0, orders: 0 };
            merchantRevenue.set(order.merchant_id, {
              revenue: current.revenue + Number(order.total),
              orders: current.orders + 1,
            });
          }

          if (order.driver_id) {
            const current = driverEarnings.get(order.driver_id) || { revenue: 0, orders: 0 };
            driverEarnings.set(order.driver_id, {
              revenue: current.revenue + Number(order.delivery_fee || 0),
              orders: current.orders + 1,
            });
          }

          if (order.client_id) {
            const current = clientSpending.get(order.client_id) || { revenue: 0, orders: 0 };
            clientSpending.set(order.client_id, {
              revenue: current.revenue + Number(order.total),
              orders: current.orders + 1,
            });
          }
        });

        const topMerchantIds = Array.from(merchantRevenue.entries())
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5);

        const topMerchantsData: TopPerformer[] = [];
        for (const [merchantId, stats] of topMerchantIds) {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('shop_name, user_id')
            .eq('id', merchantId)
            .single();

          if (merchant) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('phone')
              .eq('id', merchant.user_id)
              .single();

            topMerchantsData.push({
              id: merchantId,
              name: merchant.shop_name,
              revenue: stats.revenue,
              orders: stats.orders,
              phone: profile?.phone,
            });
          }
        }
        setTopMerchants(topMerchantsData);

        const topDriverIds = Array.from(driverEarnings.entries())
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5);

        const topDriversData: TopPerformer[] = [];
        for (const [driverId, stats] of topDriverIds) {
          const { data: driver } = await supabase
            .from('drivers')
            .select('user_id')
            .eq('id', driverId)
            .single();

          if (driver) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, phone')
              .eq('id', driver.user_id)
              .single();

            if (profile) {
              topDriversData.push({
                id: driverId,
                name: `${profile.first_name} ${profile.last_name}`,
                revenue: stats.revenue,
                orders: stats.orders,
                phone: profile.phone,
              });
            }
          }
        }
        setTopDrivers(topDriversData);

        const topClientIds = Array.from(clientSpending.entries())
          .sort((a, b) => b[1].revenue - a[1].revenue)
          .slice(0, 5);

        const topClientsData: TopPerformer[] = [];
        for (const [clientId, stats] of topClientIds) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, phone')
            .eq('id', clientId)
            .single();

          if (profile) {
            topClientsData.push({
              id: clientId,
              name: `${profile.first_name} ${profile.last_name}`,
              revenue: stats.revenue,
              orders: stats.orders,
              phone: profile.phone,
            });
          }
        }
        setTopClients(topClientsData);

        const { data: categories } = await supabase
          .from('categories')
          .select('id, name_fr')
          .order('name_fr');

        if (categories) {
          const categoryPerf: CategoryPerformance[] = [];

          for (const category of categories) {
            const { data: categoryMerchants } = await supabase
              .from('merchants')
              .select('id, shop_name')
              .eq('category_id', category.id);

            if (categoryMerchants && categoryMerchants.length > 0) {
              const merchantsInCategory = categoryMerchants
                .map(m => {
                  const stats = merchantRevenue.get(m.id);
                  return stats ? {
                    id: m.id,
                    name: m.shop_name,
                    revenue: stats.revenue,
                    orders: stats.orders,
                  } : null;
                })
                .filter(m => m !== null)
                .sort((a, b) => b!.revenue - a!.revenue)
                .slice(0, 10) as any[];

              if (merchantsInCategory.length > 0) {
                categoryPerf.push({
                  category_id: category.id,
                  category_name: category.name_fr,
                  merchants: merchantsInCategory,
                });
              }
            }
          }

          setCategoryPerformance(categoryPerf);
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!data) {
      Alert.alert('Aucune donnée', 'Aucune donnée à exporter');
      return;
    }

    Alert.alert(
      'Exporter les Analytiques',
      'Le rapport sera créé en Excel. Vous pourrez choisir où l\'enregistrer (Téléchargements, Drive, Email, etc.)',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Exporter',
          onPress: async () => {
            setExporting(true);
            try {
              const revenue = period === 'day' ? data.daily_revenue : period === 'week' ? data.weekly_revenue : data.monthly_revenue;
              const orders = period === 'day' ? data.daily_orders : period === 'week' ? data.weekly_orders : data.monthly_orders;

              await exportAnalyticsToExcel({
                period,
                revenue,
                orders,
                avgOrderValue: data.avg_order_value,
                totalClients: data.total_clients,
                totalMerchants: data.total_merchants,
                totalDrivers: data.total_drivers,
                topMerchants,
                topDrivers,
                topClients,
              });
            } catch (error: any) {
              console.error('Export error:', error);
              Alert.alert('Erreur', 'Échec de l\'exportation: ' + error.message);
            } finally {
              setExporting(false);
            }
          },
        },
      ]
    );
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

  const MetricCard = ({ icon: Icon, title, value, trend, color }: any) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        {trend && (
          <View style={styles.metricTrend}>
            {trend > 0 ? (
              <TrendingUp size={14} color="#10b981" />
            ) : (
              <TrendingDown size={14} color="#ef4444" />
            )}
            <Text style={[styles.trendText, { color: trend > 0 ? '#10b981' : '#ef4444' }]}>
              {Math.abs(trend)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const CategoryChart = ({ category }: { category: CategoryPerformance }) => {
    const maxRevenue = Math.max(...category.merchants.map(m => m.revenue));
    const maxOrders = Math.max(...category.merchants.map(m => m.orders));

    return (
      <View style={styles.categoryChartContainer}>
        <Text style={styles.categoryChartTitle}>{category.category_name}</Text>

        <View style={styles.chartSection}>
          <Text style={styles.chartSectionTitle}>Top 10 - Revenu</Text>
          {category.merchants.map((merchant, index) => {
            const barWidth = (merchant.revenue / maxRevenue) * BAR_MAX_WIDTH;
            return (
              <View key={`rev-${merchant.id}`} style={styles.barContainer}>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {index + 1}. {merchant.name.length > 15 ? merchant.name.substring(0, 15) + '...' : merchant.name}
                </Text>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { width: barWidth, backgroundColor: '#10b981' }]} />
                  <Text style={styles.barValue}>{merchant.revenue.toLocaleString()} F</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.chartSection}>
          <Text style={styles.chartSectionTitle}>Top 10 - Commandes</Text>
          {category.merchants.map((merchant, index) => {
            const barWidth = (merchant.orders / maxOrders) * BAR_MAX_WIDTH;
            return (
              <View key={`ord-${merchant.id}`} style={styles.barContainer}>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {index + 1}. {merchant.name.length > 15 ? merchant.name.substring(0, 15) + '...' : merchant.name}
                </Text>
                <View style={styles.barWrapper}>
                  <View style={[styles.bar, { width: barWidth, backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.barValue}>{merchant.orders}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const revenue = period === 'day' ? data?.daily_revenue : period === 'week' ? data?.weekly_revenue : data?.monthly_revenue;
  const orders = period === 'day' ? data?.daily_orders : period === 'week' ? data?.weekly_orders : data?.monthly_orders;

  const getPeriodLabel = (p: string) => {
    const labels: { [key: string]: string } = {
      day: 'Jour',
      week: 'Semaine',
      month: 'Mois',
    };
    return labels[p] || p;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytiques & Performance</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>Insights de la plateforme</Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            disabled={exporting || loading}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Download size={18} color="#fff" />
                <Text style={styles.exportButtonText}>Exporter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.periodSelector}>
        {['day', 'week', 'month'].map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodButtonActive]}
            onPress={() => setPeriod(p as any)}
          >
            <Text style={[styles.periodButtonText, period === p && styles.periodButtonTextActive]}>
              {getPeriodLabel(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Text style={styles.sectionTitle}>Métriques de Revenu</Text>

        <MetricCard
          icon={DollarSign}
          title={`Revenu ${period === 'day' ? 'Journalier' : period === 'week' ? 'Hebdomadaire' : 'Mensuel'}`}
          value={`${revenue?.toLocaleString() || 0} F CFA`}
          color="#10b981"
        />

        <MetricCard
          icon={ShoppingCart}
          title={`Commandes ${period === 'day' ? 'Journalières' : period === 'week' ? 'Hebdomadaires' : 'Mensuelles'}`}
          value={orders?.toLocaleString() || 0}
          color="#3b82f6"
        />

        <MetricCard
          icon={TrendingUp}
          title="Valeur Moyenne par Commande"
          value={`${data?.avg_order_value?.toLocaleString() || 0} F CFA`}
          color="#8b5cf6"
        />

        <Text style={styles.sectionTitle}>Base d'Utilisateurs</Text>

        <View style={styles.userMetricsGrid}>
          <View style={styles.userMetricCard}>
            <Users size={32} color="#3b82f6" />
            <Text style={styles.userMetricValue}>{data?.total_clients}</Text>
            <Text style={styles.userMetricLabel}>Clients</Text>
          </View>

          <View style={styles.userMetricCard}>
            <ShoppingCart size={32} color="#f59e0b" />
            <Text style={styles.userMetricValue}>{data?.total_merchants}</Text>
            <Text style={styles.userMetricLabel}>Commerçants</Text>
          </View>

          <View style={styles.userMetricCard}>
            <Truck size={32} color="#10b981" />
            <Text style={styles.userMetricValue}>{data?.total_drivers}</Text>
            <Text style={styles.userMetricLabel}>Livreurs</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Performance par Catégorie</Text>
        <Text style={styles.sectionSubtitle}>Top 10 commerçants dans chaque catégorie</Text>

        {categoryPerformance.map(category => (
          <CategoryChart key={category.category_id} category={category} />
        ))}

        {categoryPerformance.length === 0 && (
          <View style={styles.emptyPerformers}>
            <Text style={styles.emptyText}>Aucune donnée de catégorie pour cette période</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Top Commerçants (Boostant les Affaires)</Text>
        {topMerchants.length > 0 ? (
          <View style={styles.topPerformersContainer}>
            {topMerchants.map((merchant, index) => (
              <View key={merchant.id} style={styles.performerCard}>
                <View style={styles.performerRank}>
                  {index === 0 ? (
                    <Award size={24} color="#f59e0b" />
                  ) : (
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  )}
                </View>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{merchant.name}</Text>
                  <Text style={styles.performerPhone}>{merchant.phone}</Text>
                  <View style={styles.performerStats}>
                    <Text style={styles.performerRevenue}>{merchant.revenue.toLocaleString()} F CFA</Text>
                    <Text style={styles.performerOrders}>{merchant.orders} commandes</Text>
                  </View>
                </View>
                <View style={[styles.performerBadge, { backgroundColor: '#f59e0b20' }]}>
                  <Store size={20} color="#f59e0b" />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPerformers}>
            <Text style={styles.emptyText}>Aucune donnée commerçant pour cette période</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Top Livreurs (Boostant les Affaires)</Text>
        {topDrivers.length > 0 ? (
          <View style={styles.topPerformersContainer}>
            {topDrivers.map((driver, index) => (
              <View key={driver.id} style={styles.performerCard}>
                <View style={styles.performerRank}>
                  {index === 0 ? (
                    <Award size={24} color="#10b981" />
                  ) : (
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  )}
                </View>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{driver.name}</Text>
                  <Text style={styles.performerPhone}>{driver.phone}</Text>
                  <View style={styles.performerStats}>
                    <Text style={styles.performerRevenue}>{driver.revenue.toLocaleString()} F CFA</Text>
                    <Text style={styles.performerOrders}>{driver.orders} livraisons</Text>
                  </View>
                </View>
                <View style={[styles.performerBadge, { backgroundColor: '#10b98120' }]}>
                  <Truck size={20} color="#10b981" />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPerformers}>
            <Text style={styles.emptyText}>Aucune donnée livreur pour cette période</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Top Clients (Boostant les Affaires)</Text>
        {topClients.length > 0 ? (
          <View style={styles.topPerformersContainer}>
            {topClients.map((client, index) => (
              <View key={client.id} style={styles.performerCard}>
                <View style={styles.performerRank}>
                  {index === 0 ? (
                    <Award size={24} color="#3b82f6" />
                  ) : (
                    <Text style={styles.rankNumber}>#{index + 1}</Text>
                  )}
                </View>
                <View style={styles.performerInfo}>
                  <Text style={styles.performerName}>{client.name}</Text>
                  <Text style={styles.performerPhone}>{client.phone}</Text>
                  <View style={styles.performerStats}>
                    <Text style={styles.performerRevenue}>{client.revenue.toLocaleString()} F CFA</Text>
                    <Text style={styles.performerOrders}>{client.orders} commandes</Text>
                  </View>
                </View>
                <View style={[styles.performerBadge, { backgroundColor: '#3b82f620' }]}>
                  <Users size={20} color="#3b82f6" />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPerformers}>
            <Text style={styles.emptyText}>Aucune donnée client pour cette période</Text>
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
    marginBottom: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2563eb',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 12,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: -4,
    marginBottom: 12,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userMetricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  userMetricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userMetricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
  },
  userMetricLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 4,
  },
  categoryChartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryChartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartSection: {
    marginBottom: 24,
  },
  chartSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  barContainer: {
    marginBottom: 10,
  },
  barLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    height: 28,
    borderRadius: 6,
    minWidth: 20,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  topPerformersContainer: {
    gap: 12,
  },
  performerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  performerRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
  },
  performerInfo: {
    flex: 1,
  },
  performerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  performerPhone: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  performerStats: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  performerRevenue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  performerOrders: {
    fontSize: 12,
    color: '#64748b',
  },
  performerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPerformers: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
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
