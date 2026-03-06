import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Users, ShoppingCart, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, Ban, ChevronUp, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import SystemNotificationBanner from '@/components/SystemNotificationBanner';

interface PlatformStats {
  total_users: number;
  total_clients: number;
  total_merchants: number;
  total_drivers: number;
  active_orders: number;
  completed_orders: number;
  total_revenue: number;
  blocked_users: number;
  pending_verifications: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: string;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [activityLimit, setActivityLimit] = useState(10);
  const [hasMoreActivity, setHasMoreActivity] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: admin } = await supabase
        .from('admin_users')
        .select('*, user_profiles(first_name, last_name)')
        .eq('user_id', user.id)
        .single();

      setAdminInfo(admin);

      const { data: statsData, error: statsError } = await supabase
        .rpc('get_platform_stats');

      if (statsError) throw statsError;
      setStats(statsData);

      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          created_at,
          user_profiles:client_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
        .limit(activityLimit);

      if (ordersData) {
        const activity: RecentActivity[] = ordersData.map(order => ({
          id: order.id,
          type: 'order',
          description: `Commande ${order.order_number} - ${order.total?.toLocaleString()} FCFA`,
          timestamp: order.created_at,
          status: order.status,
        }));
        setRecentActivity(activity);
        setHasMoreActivity(ordersData.length >= activityLimit && activityLimit < 1000);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const toggleActivityLimit = () => {
    if (activityLimit === 10) {
      setActivityLimit(1000);
    } else {
      setActivityLimit(10);
    }
  };

  useEffect(() => {
    if (activityLimit > 10) {
      loadDashboardData();
    }
  }, [activityLimit]);

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

  const StatCard = ({ icon: Icon, title, value, color, onPress }: any) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value?.toLocaleString() || '0'}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tableau de Bord Admin</Text>
          <Text style={styles.subtitle}>
            Bienvenue, {adminInfo?.user_profiles?.first_name || 'Admin'}
          </Text>
        </View>
        <View style={[styles.roleBadge,
          adminInfo?.role === 'super_admin' ? styles.superAdminBadge :
          adminInfo?.role === 'admin' ? styles.adminBadge :
          styles.moderatorBadge
        ]}>
          <Text style={styles.roleText}>
            {adminInfo?.role === 'super_admin' ? 'Super Admin' :
             adminInfo?.role === 'admin' ? 'Admin' : 'Modérateur'}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <SystemNotificationBanner />
        <Text style={styles.sectionTitle}>Vue d'ensemble</Text>

        <View style={styles.statsGrid}>
          <StatCard
            icon={Users}
            title="Total Utilisateurs"
            value={stats?.total_users}
            color="#2563eb"
            onPress={() => router.push('/(admin)/(tabs)/users')}
          />
          <StatCard
            icon={ShoppingCart}
            title="Commandes Actives"
            value={stats?.active_orders}
            color="#f59e0b"
            onPress={() => router.push('/(admin)/(tabs)/orders')}
          />
          <StatCard
            icon={CheckCircle}
            title="Commandes Livrées"
            value={stats?.completed_orders}
            color="#8b5cf6"
          />
          <StatCard
            icon={DollarSign}
            title="Revenu Total"
            value={`${(stats?.total_revenue || 0).toLocaleString()} F`}
            color="#10b981"
            onPress={() => router.push('/(admin)/(tabs)/analytics')}
          />
        </View>

        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Users size={18} color="#3b82f6" />
            <Text style={styles.quickStatLabel}>Clients total{'\n'}enregistrés</Text>
            <Text style={styles.quickStatValue}>{stats?.total_clients}</Text>
          </View>
          <View style={styles.quickStat}>
            <ShoppingCart size={18} color="#f59e0b" />
            <Text style={styles.quickStatLabel}>Commerçants total{'\n'}enregistrés</Text>
            <Text style={styles.quickStatValue}>{stats?.total_merchants}</Text>
          </View>
          <View style={styles.quickStat}>
            <TrendingUp size={18} color="#10b981" />
            <Text style={styles.quickStatLabel}>Livreurs total{'\n'}enregistrés</Text>
            <Text style={styles.quickStatValue}>{stats?.total_drivers}</Text>
          </View>
        </View>

        {(stats?.pending_verifications || 0) > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/(admin)/(tabs)/users?filter=pending')}
          >
            <AlertCircle size={24} color="#f59e0b" />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Vérifications en Attente</Text>
              <Text style={styles.alertText}>
                {stats?.pending_verifications} livreur(s) en attente de vérification
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {(stats?.blocked_users || 0) > 0 && (
          <TouchableOpacity
            style={[styles.alertCard, { backgroundColor: '#fef2f2' }]}
            onPress={() => router.push('/(admin)/(tabs)/users?filter=blocked')}
          >
            <Ban size={24} color="#dc2626" />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: '#dc2626' }]}>Utilisateurs Bloqués</Text>
              <Text style={styles.alertText}>
                {stats?.blocked_users} utilisateur(s) actuellement bloqué(s)
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Activité Récente</Text>

        {recentActivity.length > 0 ? (
          <View style={styles.activityList}>
            {recentActivity.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityItem}
                onPress={() => {
                  console.log('[Dashboard] Navigating to order:', activity.id);
                  router.push(`/(admin)/order-details?id=${activity.id}`);
                }}
              >
                <View style={[styles.activityIndicator, {
                  backgroundColor:
                    activity.status === 'delivered' ? '#10b981' :
                    activity.status === 'cancelled' ? '#ef4444' :
                    activity.status === 'pending' ? '#f59e0b' :
                    '#3b82f6'
                }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <View style={styles.activityMeta}>
                    <Clock size={12} color="#64748b" />
                    <Text style={styles.activityTime}>
                      {new Date(activity.timestamp).toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, {
                  backgroundColor:
                    activity.status === 'delivered' ? '#dcfce7' :
                    activity.status === 'cancelled' ? '#fee2e2' :
                    activity.status === 'pending' ? '#fef3c7' :
                    '#dbeafe'
                }]}>
                  <Text style={[styles.statusText, {
                    color:
                      activity.status === 'delivered' ? '#16a34a' :
                      activity.status === 'cancelled' ? '#dc2626' :
                      activity.status === 'pending' ? '#d97706' :
                      '#2563eb'
                  }]}>
                    {activity.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {(hasMoreActivity || activityLimit > 10) && (
              <TouchableOpacity style={styles.loadMoreButton} onPress={toggleActivityLimit}>
                <Text style={styles.loadMoreText}>
                  {activityLimit === 10 ? `Voir plus (${activityLimit}/1000)` : 'Voir moins'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucune activité récente</Text>
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
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  superAdminBadge: {
    backgroundColor: '#fef3c7',
  },
  adminBadge: {
    backgroundColor: '#dbeafe',
  },
  moderatorBadge: {
    backgroundColor: '#e0e7ff',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
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
    marginBottom: 16,
    marginTop: 8,
  },
  statsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
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
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickStat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 110,
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
    flexShrink: 0,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  alertCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#d97706',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 13,
    color: '#92400e',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
  loadMoreButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
