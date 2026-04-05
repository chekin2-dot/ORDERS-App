import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { Search, Ban, CircleCheck as CheckCircle, UserX, Eye, MapPin, Calendar, Download, RefreshCw, ChevronUp, ChevronDown, ShieldCheck, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface User {
  id: string;
  user_type: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  created_at: string;
  address: string;
  latitude: number;
  longitude: number;
  gps_enabled: boolean;
}

export default function UsersManagementScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>(params.filter as string || 'all');
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadUsers();
    loadPendingCount();
    subscribeToUsers();
  }, []);

  const loadPendingCount = async () => {
    try {
      const { data } = await supabase.rpc('get_pending_subscriptions');
      if (data) {
        setPendingCount(Number(data.total) || 0);
      }
    } catch {}
  };

  const subscribeToUsers = () => {
    const channel = supabase
      .channel('users-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
        },
        () => {
          setSyncing(true);
          loadUsers();
          setTimeout(() => setSyncing(false), 1000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleExportUsers = async () => {
    if (filteredUsers.length === 0) {
      alert('Aucun utilisateur à exporter');
      return;
    }
    setExporting(true);
    try {
      await performExport();
    } finally {
      setExporting(false);
    }
  };

  const performExport = async () => {
    try {
      const XLSX = require('xlsx');
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `Users_Report_${timestamp}.xlsx`;

      const exportData = filteredUsers.map((user) => ({
        'Nom': `${user.first_name} ${user.last_name}`,
        'Téléphone': user.phone,
        'Type': user.user_type,
        'Statut': user.status,
        'Adresse': user.address || 'N/A',
        'GPS': user.gps_enabled ? 'Oui' : 'Non',
        'Inscription': new Date(user.created_at).toLocaleDateString(),
      }));

      const summaryData = [
        ['Rapport des Utilisateurs'],
        ['Généré le:', new Date().toLocaleString()],
        ['Filtre:', filterType === 'all' ? 'Tous' : filterType],
        ['Total:', filteredUsers.length.toString()],
        [''],
        ['Par type'],
        ['Clients:', users.filter(u => u.user_type === 'client').length.toString()],
        ['Commerçants:', users.filter(u => u.user_type === 'merchant').length.toString()],
        ['Livreurs:', users.filter(u => u.user_type === 'driver').length.toString()],
        [''],
        ['Par statut'],
        ['Actifs:', users.filter(u => u.status === 'active').length.toString()],
        ['Bloqués:', users.filter(u => u.status === 'banned').length.toString()],
      ];

      const wb = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

      const wsUsers = XLSX.utils.json_to_sheet(exportData);
      wsUsers['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 12 },
        { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, wsUsers, 'Utilisateurs');

      if (Platform.OS === 'web') {
        const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = await import('expo-file-system');
        const Sharing = await import('expo-sharing');
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Exporter le rapport des utilisateurs',
            UTI: 'com.microsoft.excel.xlsx',
          });
        }
      }
    } catch (error: any) {
      console.error('Error exporting users:', error);
      alert(error.message || 'Impossible d\'exporter le rapport des utilisateurs');
      throw error;
    }
  };

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, filterType]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery)
      );
    }

    if (filterType !== 'all') {
      if (filterType === 'blocked') {
        filtered = filtered.filter(u => u.status === 'banned');
      } else {
        filtered = filtered.filter(u => u.user_type === filterType);
      }
    }

    setFilteredUsers(filtered);
  };

  const handleBlockUser = async (user: User) => {
    const confirmed = confirm(`Are you sure you want to block ${user.first_name} ${user.last_name}?`);
    if (!confirmed) return;

    setProcessingUser(user.id);
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
      loadUsers();
    } catch (error: any) {
      console.error('Block exception:', error);
      alert(error.message || 'Failed to block user');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleUnblockUser = async (user: User) => {
    setProcessingUser(user.id);
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
      loadUsers();
    } catch (error: any) {
      console.error('Unblock exception:', error);
      alert(error.message || 'Failed to unblock user');
    } finally {
      setProcessingUser(null);
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

  const getUserStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'banned': return '#ef4444';
      case 'suspended': return '#f59e0b';
      default: return '#64748b';
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
        <View style={styles.titleRow}>
          <Text style={styles.title}>Gestion des Utilisateurs</Text>
          {syncing && (
            <View style={styles.syncIndicator}>
              <RefreshCw size={14} color="#10b981" />
            </View>
          )}
        </View>
        <View style={styles.headerBottom}>
          <Text style={styles.subtitle}>{filteredUsers.length} utilisateurs</Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportUsers}
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

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des utilisateurs..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {pendingCount > 0 && (
        <TouchableOpacity
          style={styles.validationBanner}
          onPress={() => router.push('/(admin)/subscriptions')}
        >
          <View style={styles.validationBannerLeft}>
            <Clock size={20} color="#fff" />
            <View>
              <Text style={styles.validationBannerTitle}>
                {pendingCount} abonnement{pendingCount > 1 ? 's' : ''} en attente
              </Text>
              <Text style={styles.validationBannerSub}>
                Commerçants et livreurs à valider
              </Text>
            </View>
          </View>
          <ShieldCheck size={22} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      )}

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChipFull, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
            Tous ({users.length})
          </Text>
        </TouchableOpacity>
        <View style={styles.filterGrid}>
          <TouchableOpacity
            style={[styles.filterChipGrid, filterType === 'client' && styles.filterChipActive]}
            onPress={() => setFilterType('client')}
          >
            <Text style={[styles.filterChipTextSmall, filterType === 'client' && styles.filterChipTextActive]}>
              Clients ({users.filter(u => u.user_type === 'client').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChipGrid, filterType === 'merchant' && styles.filterChipActive]}
            onPress={() => setFilterType('merchant')}
          >
            <Text style={[styles.filterChipTextSmall, filterType === 'merchant' && styles.filterChipTextActive]}>
              Commerçants ({users.filter(u => u.user_type === 'merchant').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChipGrid, filterType === 'driver' && styles.filterChipActive]}
            onPress={() => setFilterType('driver')}
          >
            <Text style={[styles.filterChipTextSmall, filterType === 'driver' && styles.filterChipTextActive]}>
              Livreurs ({users.filter(u => u.user_type === 'driver').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChipGrid, filterType === 'blocked' && styles.filterChipActive]}
            onPress={() => setFilterType('blocked')}
          >
            <Text style={[styles.filterChipTextSmall, filterType === 'blocked' && styles.filterChipTextActive]}>
              Bloqués ({users.filter(u => u.status === 'banned').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadUsers} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {filteredUsers.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.first_name} {user.last_name}
                </Text>
                <Text style={styles.userPhone}>{user.phone}</Text>
                {user.address && (
                  <View style={styles.userMeta}>
                    <MapPin size={12} color="#94a3b8" />
                    <Text style={styles.userMetaText} numberOfLines={1}>
                      {user.address}
                    </Text>
                  </View>
                )}
                <View style={styles.userMeta}>
                  <Calendar size={12} color="#94a3b8" />
                  <Text style={styles.userMetaText}>
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.userBadges}>
                <View style={[styles.typeBadge, { backgroundColor: getUserTypeColor(user.user_type) + '20' }]}>
                  <Text style={[styles.typeBadgeText, { color: getUserTypeColor(user.user_type) }]}>
                    {user.user_type}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getUserStatusColor(user.status) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: getUserStatusColor(user.status) }]}>
                    {user.status}
                  </Text>
                </View>
                {user.gps_enabled && (
                  <View style={[styles.statusBadge, { backgroundColor: '#3b82f620' }]}>
                    <MapPin size={10} color="#3b82f6" />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push(`/(admin)/user-details?id=${user.id}`)}
              >
                <Eye size={16} color="#2563eb" />
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>

              {user.status === 'banned' ? (
                <TouchableOpacity
                  style={[styles.actionButton, styles.unblockButton]}
                  onPress={() => handleUnblockUser(user)}
                  disabled={processingUser === user.id}
                >
                  {processingUser === user.id ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <>
                      <CheckCircle size={16} color="#10b981" />
                      <Text style={[styles.actionButtonText, { color: '#10b981' }]}>Unblock</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionButton, styles.blockButton]}
                  onPress={() => handleBlockUser(user)}
                  disabled={processingUser === user.id}
                >
                  {processingUser === user.id ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <>
                      <Ban size={16} color="#ef4444" />
                      <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Block</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {filteredUsers.length === 0 && (
          <View style={styles.emptyState}>
            <UserX size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No users found</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  syncIndicator: {
    padding: 4,
  },
  headerBottom: {
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChipFull: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    alignItems: 'center',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChipGrid: {
    flex: 1,
    minWidth: '47%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 14,
    gap: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userHeader: {
    marginBottom: 12,
  },
  userInfo: {
    marginBottom: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  userMetaText: {
    fontSize: 11,
    color: '#94a3b8',
    flex: 1,
  },
  userBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  blockButton: {
    backgroundColor: '#fef2f2',
  },
  unblockButton: {
    backgroundColor: '#f0fdf4',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
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
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f59e0b',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  validationBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  validationBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  validationBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
});
