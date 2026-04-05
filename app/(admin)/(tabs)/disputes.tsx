import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { TriangleAlert as AlertTriangle, Eye, CircleCheck as CheckCircle, X, Download, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { exportDisputesToExcel } from '@/lib/excelExport';

interface Dispute {
  id: string;
  report_type: string;
  description: string;
  status: string;
  created_at: string;
  reporter: { first_name: string; last_name: string };
  reported_user: { first_name: string; last_name: string };
  order: { order_number: string } | null;
}

export default function DisputesScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    try {
      const { data, error } = await supabase
        .from('app_reports')
        .select(`
          id,
          report_type,
          description,
          status,
          created_at,
          reporter:user_profiles!app_reports_reporter_id_fkey(first_name, last_name),
          reported_user:user_profiles!app_reports_reported_user_id_fkey(first_name, last_name),
          order:orders(order_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDisputes(data as any || []);
    } catch (error) {
      console.error('Error loading disputes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExport = async () => {
    if (disputes.length === 0) return;
    setExporting(true);
    try {
      await exportDisputesToExcel();
    } catch (error: any) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
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

  const filteredDisputes = disputes.filter(d =>
    filter === 'all' ? true : d.status === filter
  );

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: '#f59e0b',
      investigating: '#3b82f6',
      resolved: '#10b981',
      dismissed: '#64748b',
    };
    return colors[status] || '#64748b';
  };

  const getReportTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      inappropriate_behavior: '#f59e0b',
      suspected_fraud: '#ef4444',
      theft_assault: '#dc2626',
      non_compliant_delivery: '#f59e0b',
      other: '#64748b',
    };
    return colors[type] || '#64748b';
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      all: 'Tous',
      pending: 'En attente',
      investigating: 'En enquête',
      resolved: 'Résolu',
      dismissed: 'Rejeté',
    };
    return labels[status] || status;
  };

  const getReportTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      inappropriate_behavior: 'Comportement inapproprié',
      suspected_fraud: 'Fraude suspectée',
      theft_assault: 'Vol/Agression',
      non_compliant_delivery: 'Livraison non conforme',
      other: 'Autre',
    };
    return labels[type] || type;
  };

  const getStatusCount = (status: string) => {
    if (status === 'all') return disputes.length;
    return disputes.filter(d => d.status === status).length;
  };

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
        <Text style={styles.title}>Litiges & Rapports</Text>
        <View style={styles.headerContent}>
          <Text style={styles.subtitle}>{filteredDisputes.length} rapports</Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExport}
            disabled={exporting || loading}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Download size={16} color="#fff" />
                <Text style={styles.exportButtonText}>Exporter</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[styles.filterChipFull, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            {getStatusLabel('all')} ({getStatusCount('all')})
          </Text>
        </TouchableOpacity>

        <View style={styles.filterRow}>
          {['pending', 'investigating', 'resolved'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filter === status && styles.filterChipActive]}
              onPress={() => setFilter(status)}
            >
              <Text style={[styles.filterChipText, filter === status && styles.filterChipTextActive]}>
                {getStatusLabel(status)}
              </Text>
              <View style={[styles.countBadge, { backgroundColor: filter === status ? '#fff' : getStatusColor(status) }]}>
                <Text style={[styles.countText, { color: filter === status ? '#2563eb' : '#fff' }]}>
                  {getStatusCount(status)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollContainer}
          contentContainerStyle={styles.filterScrollContent}
        >
          {disputes
            .map(d => d.status)
            .filter((status, index, self) =>
              self.indexOf(status) === index &&
              !['pending', 'investigating', 'resolved'].includes(status)
            )
            .map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.filterChipSmall, filter === status && styles.filterChipActive]}
                onPress={() => setFilter(status)}
              >
                <Text style={[styles.filterChipTextSmall, filter === status && styles.filterChipTextActive]}>
                  {getStatusLabel(status)} ({getStatusCount(status)})
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadDisputes} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {filteredDisputes.map((dispute) => (
          <TouchableOpacity
            key={dispute.id}
            style={styles.disputeCard}
            onPress={() => router.push(`/(admin)/dispute-details?id=${dispute.id}`)}
          >
            <View style={styles.disputeHeader}>
              <View style={[styles.typeBadge, { backgroundColor: getReportTypeColor(dispute.report_type) + '20' }]}>
                <Text style={[styles.typeBadgeText, { color: getReportTypeColor(dispute.report_type) }]}>
                  {getReportTypeLabel(dispute.report_type)}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(dispute.status) }]}>
                  {getStatusLabel(dispute.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.disputeDescription} numberOfLines={2}>
              {dispute.description}
            </Text>

            <View style={styles.disputeInfo}>
              <Text style={styles.disputeInfoLabel}>Rapporteur:</Text>
              <Text style={styles.disputeInfoValue}>
                {dispute.reporter?.first_name} {dispute.reporter?.last_name}
              </Text>
            </View>

            <View style={styles.disputeInfo}>
              <Text style={styles.disputeInfoLabel}>Rapporté:</Text>
              <Text style={styles.disputeInfoValue}>
                {dispute.reported_user?.first_name} {dispute.reported_user?.last_name}
              </Text>
            </View>

            {dispute.order && (
              <View style={styles.disputeInfo}>
                <Text style={styles.disputeInfoLabel}>Commande:</Text>
                <Text style={styles.disputeInfoValue}>{dispute.order.order_number}</Text>
              </View>
            )}

            <Text style={styles.disputeTime}>
              {new Date(dispute.created_at).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        ))}

        {filteredDisputes.length === 0 && (
          <View style={styles.emptyState}>
            <AlertTriangle size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Aucun litige trouvé</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.scrollButton, styles.scrollButtonBottom]}
        onPress={scrollToBottom}
      >
        <ChevronDown size={24} color="#fff" />
      </TouchableOpacity>

      {showScrollTop && (
        <TouchableOpacity
          style={[styles.scrollButton, styles.scrollButtonTop]}
          onPress={scrollToTop}
        >
          <ChevronUp size={24} color="#fff" />
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  filterChipFull: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterScrollContainer: {
    maxHeight: 50,
  },
  filterScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChipSmall: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  disputeCard: {
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
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  disputeDescription: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 12,
    lineHeight: 20,
  },
  disputeInfo: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  disputeInfoLabel: {
    fontSize: 13,
    color: '#64748b',
    width: 90,
    fontWeight: '600',
  },
  disputeInfoValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  disputeTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
    width: 56,
    height: 56,
    borderRadius: 28,
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
    bottom: 170,
  },
});
