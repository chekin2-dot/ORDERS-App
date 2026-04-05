import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { X, UserPlus, UserMinus, Shield, Bell, Database, Download, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { exportDatabaseBackupToExcel } from '@/lib/excelExport';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  user_profiles: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  target_user_type: string;
  created_at: string;
  is_active: boolean;
}

export default function AdminToolsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'admins' | 'notifications' | 'backup'>(
    (params.tab as 'admins' | 'notifications' | 'backup') || 'admins'
  );

  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showAddNotificationModal, setShowAddNotificationModal] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'moderator'>('admin');

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<'all' | 'client' | 'merchant' | 'driver'>('all');
  const [sendingNotification, setSendingNotification] = useState(false);

  const [backupInProgress, setBackupInProgress] = useState(false);
  const [currentAdminRole, setCurrentAdminRole] = useState<string>('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ visible: boolean; notificationId: string | null }>({
    visible: false,
    notificationId: null,
  });
  const [deletingNotification, setDeletingNotification] = useState(false);

  useEffect(() => {
    loadData();
    checkCurrentAdminRole();
  }, []);

  const checkCurrentAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found when checking admin role');
        return;
      }

      const { data, error } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching admin role:', error);
        return;
      }

      if (data) {
        console.log('Admin role loaded:', data.role);
        setCurrentAdminRole(data.role);
      } else {
        console.error('No admin data found for user');
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  const loadData = async () => {
    try {
      console.log('[Admin Tools] Loading data...');
      const { data: adminsData, error: adminsError } = await supabase
        .from('admin_users')
        .select('*, user_profiles(first_name, last_name, phone)')
        .order('created_at', { ascending: false });

      if (adminsError) {
        console.error('[Admin Tools] Error loading admins:', adminsError);
      } else {
        console.log('[Admin Tools] Loaded admins:', adminsData?.length || 0);
      }

      const { data: notificationsData, error: notificationsError } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (notificationsError) {
        console.error('[Admin Tools] Error loading notifications:', notificationsError);
      } else {
        console.log('[Admin Tools] Loaded notifications:', notificationsData?.length || 0);
      }

      setAdmins(adminsData || []);
      setNotifications(notificationsData || []);
      console.log('[Admin Tools] Data loaded successfully');
    } catch (error) {
      console.error('[Admin Tools] Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminPhone.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone');
      return;
    }

    if (currentAdminRole !== 'super_admin') {
      Alert.alert('Permission refusée', 'Seuls les super administrateurs peuvent ajouter des admins');
      return;
    }

    setAddingAdmin(true);
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('phone', newAdminPhone.trim())
        .single();

      if (!userProfile) {
        Alert.alert('Erreur', 'Aucun utilisateur trouvé avec ce numéro de téléphone');
        return;
      }

      const { data: existingAdmin } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (existingAdmin) {
        Alert.alert('Erreur', 'Cet utilisateur est déjà administrateur');
        return;
      }

      const { error } = await supabase
        .from('admin_users')
        .insert({
          user_id: userProfile.id,
          role: newAdminRole,
          is_active: true,
        });

      if (error) throw error;

      Alert.alert('Succès', `${userProfile.first_name} ${userProfile.last_name} a été ajouté comme ${newAdminRole === 'admin' ? 'administrateur' : 'modérateur'}`);
      setShowAddAdminModal(false);
      setNewAdminPhone('');
      setNewAdminRole('admin');
      loadData();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'ajouter l\'administrateur');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string, adminName: string) => {
    console.log('[Delete Admin] Attempting to remove admin');
    console.log('[Delete Admin] Admin ID:', adminId);
    console.log('[Delete Admin] Admin Name:', adminName);
    console.log('[Delete Admin] Current role:', currentAdminRole);

    if (!currentAdminRole) {
      Alert.alert('Erreur', 'Votre rôle admin n\'est pas chargé. Veuillez rafraîchir la page.');
      return;
    }

    if (currentAdminRole !== 'super_admin') {
      Alert.alert(
        'Permission refusée',
        `Seuls les super administrateurs peuvent supprimer des admins.\n\nVotre rôle: ${currentAdminRole}`
      );
      return;
    }

    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer ${adminName} des administrateurs?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Delete Admin] Executing delete query...');
              console.log('[Delete Admin] Target ID:', adminId);

              const { data: { user } } = await supabase.auth.getUser();
              console.log('[Delete Admin] Current user ID:', user?.id);
              console.log('[Delete Admin] Current session exists:', !!user);

              const { data: adminCheck } = await supabase
                .from('admin_users')
                .select('role, is_active')
                .eq('user_id', user?.id)
                .maybeSingle();

              console.log('[Delete Admin] Current user admin status:', adminCheck);

              const { error, data, status, statusText } = await supabase
                .from('admin_users')
                .delete()
                .eq('id', adminId)
                .select();

              console.log('[Delete Admin] Response status:', status, statusText);
              console.log('[Delete Admin] Response data:', data);
              console.log('[Delete Admin] Response error:', error);

              if (error) {
                console.error('[Delete Admin] Delete error:', error);
                Alert.alert(
                  'Erreur de suppression',
                  `Message: ${error.message}\nCode: ${error.code}\nDetails: ${error.details}\n\nVotre role: ${adminCheck?.role}\nActif: ${adminCheck?.is_active}`
                );
                throw error;
              }

              if (!data || data.length === 0) {
                console.warn('[Delete Admin] No rows were deleted - might be an RLS issue');
                Alert.alert(
                  'Attention',
                  'Aucune ligne supprimée. Cela peut être un problème de permissions RLS.\n\nVérifiez que vous êtes bien super_admin et actif.'
                );
                return;
              }

              console.log('[Delete Admin] Admin deleted successfully');
              Alert.alert('Succès', 'Administrateur supprimé avec succès');
              await loadData();
            } catch (error: any) {
              console.error('[Delete Admin] Exception:', error);
              Alert.alert(
                'Erreur',
                `Impossible de supprimer l'administrateur.\n\n${error.message || error.toString()}`
              );
            }
          },
        },
      ]
    );
  };

  const handleToggleAdminStatus = async (adminId: string, currentStatus: boolean) => {
    if (currentAdminRole !== 'super_admin') {
      Alert.alert('Permission refusée', 'Seuls les super administrateurs peuvent modifier le statut des admins');
      return;
    }

    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ is_active: !currentStatus })
        .eq('id', adminId);

      if (error) throw error;

      Alert.alert('Succès', `Statut mis à jour avec succès`);
      loadData();
    } catch (error: any) {
      console.error('Error toggling admin status:', error);
      Alert.alert('Erreur', error.message || 'Impossible de modifier le statut');
    }
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setSendingNotification(true);
    try {
      const { error } = await supabase
        .from('system_notifications')
        .insert({
          title: notificationTitle.trim(),
          message: notificationMessage.trim(),
          target_user_type: notificationTarget,
          is_active: true,
        });

      if (error) throw error;

      Alert.alert('Succès', 'Notification envoyée avec succès');
      setShowAddNotificationModal(false);
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationTarget('all');
      loadData();
    } catch (error: any) {
      console.error('Error sending notification:', error);
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer la notification');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleDeleteNotification = (notificationId: string) => {
    setDeleteConfirmModal({ visible: true, notificationId });
  };

  const confirmDeleteNotification = async () => {
    if (!deleteConfirmModal.notificationId) return;

    setDeletingNotification(true);
    try {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .eq('id', deleteConfirmModal.notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }

      setDeleteConfirmModal({ visible: false, notificationId: null });
      loadData();
    } catch (error: any) {
      console.error('Failed to delete notification:', error);
    } finally {
      setDeletingNotification(false);
    }
  };

  const handleBackupData = async (format: 'json' | 'excel') => {
    console.log('Starting backup with format:', format);
    setBackupInProgress(true);
    try {
      if (format === 'excel') {
        console.log('Calling exportDatabaseBackupToExcel...');
        await exportDatabaseBackupToExcel();
        console.log('Excel backup completed');
      } else {
        console.log('Starting JSON backup...');
        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `Database_Backup_${timestamp}.json`;

        const { data: orders } = await supabase.from('orders').select('*').limit(1000);
        const { data: users } = await supabase.from('user_profiles').select('*').limit(1000);
        const { data: merchants } = await supabase.from('merchants').select('*').limit(1000);
        const { data: drivers } = await supabase.from('drivers').select('*').limit(1000);
        const { data: products } = await supabase.from('products').select('*').limit(1000);

        const backupData = {
          metadata: {
            backup_date: new Date().toISOString(),
            version: '1.0.0',
            tables: ['orders', 'user_profiles', 'merchants', 'drivers', 'products'],
          },
          data: {
            orders: orders || [],
            user_profiles: users || [],
            merchants: merchants || [],
            drivers: drivers || [],
            products: products || [],
          },
          stats: {
            total_orders: orders?.length || 0,
            total_users: users?.length || 0,
            total_merchants: merchants?.length || 0,
            total_drivers: drivers?.length || 0,
            total_products: products?.length || 0,
          },
        };

        const jsonString = JSON.stringify(backupData, null, 2);

        if (Platform.OS === 'web') {
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        } else {
          const FileSystem = await import('expo-file-system');
          const Sharing = await import('expo-sharing');
          const fileUri = FileSystem.documentDirectory + fileName;
          await FileSystem.writeAsStringAsync(fileUri, jsonString, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: 'Exporter la sauvegarde JSON',
              UTI: 'public.json',
            });
          } else {
            Alert.alert('Succès', `Sauvegarde enregistrée dans: ${fileUri}`);
          }
        }
      }
    } catch (error: any) {
      console.error('Error backing up data:', error);
      Alert.alert('Erreur', error.message || 'Impossible de créer la sauvegarde');
    } finally {
      setBackupInProgress(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return '#dc2626';
      case 'admin':
        return '#2563eb';
      case 'moderator':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Administrateur';
      case 'moderator':
        return 'Modérateur';
      default:
        return role;
    }
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'all':
        return 'Tous';
      case 'client':
        return 'Clients';
      case 'merchant':
        return 'Commerçants';
      case 'driver':
        return 'Livreurs';
      default:
        return target;
    }
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Outils Admin</Text>
          {currentAdminRole && (
            <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
              Role: {currentAdminRole}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'admins' && styles.tabActive]}
          onPress={() => setActiveTab('admins')}
        >
          <Shield size={20} color={activeTab === 'admins' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'admins' && styles.tabTextActive]}>
            Admins
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Bell size={20} color={activeTab === 'notifications' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            Notifications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'backup' && styles.tabActive]}
          onPress={() => setActiveTab('backup')}
        >
          <Database size={20} color={activeTab === 'backup' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'backup' && styles.tabTextActive]}>
            Sauvegarde
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'admins' && (
          <>
            <View style={styles.actionBar}>
              <View>
                <Text style={styles.sectionTitle}>Gérer les Administrateurs</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Votre rôle: {currentAdminRole || 'Chargement...'}
                </Text>
              </View>
              {currentAdminRole === 'super_admin' ? (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddAdminModal(true)}
                >
                  <UserPlus size={20} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={{ padding: 8, backgroundColor: '#fef3c7', borderRadius: 4 }}>
                  <Text style={{ fontSize: 11, color: '#92400e' }}>Super Admin requis</Text>
                </View>
              )}
            </View>

            {admins.map((admin) => (
              <View key={admin.id} style={styles.adminCard}>
                <View style={styles.adminHeader}>
                  <View style={styles.adminInfo}>
                    <Text style={styles.adminName}>
                      {admin.user_profiles?.first_name} {admin.user_profiles?.last_name}
                    </Text>
                    <Text style={styles.adminPhone}>{admin.user_profiles?.phone}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(admin.role) + '20' }]}>
                      <Text style={[styles.roleText, { color: getRoleBadgeColor(admin.role) }]}>
                        {getRoleLabel(admin.role)}
                      </Text>
                    </View>
                  </View>
                  {currentAdminRole === 'super_admin' && admin.role !== 'super_admin' ? (
                    <View style={styles.adminActions}>
                      <TouchableOpacity
                        onPress={() => handleToggleAdminStatus(admin.id, admin.is_active)}
                        style={[styles.statusButton, { backgroundColor: admin.is_active ? '#10b981' : '#64748b' }]}
                      >
                        <Text style={styles.statusButtonText}>
                          {admin.is_active ? 'Actif' : 'Inactif'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveAdmin(admin.id, `${admin.user_profiles?.first_name} ${admin.user_profiles?.last_name}`)}
                        style={styles.deleteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                      >
                        <UserMinus size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ padding: 6, backgroundColor: '#f1f5f9', borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#64748b' }}>
                        {admin.role === 'super_admin' ? 'Super Admin' : 'Pas autorisé'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {admins.length === 0 && (
              <View style={styles.emptyState}>
                <Shield size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>Aucun administrateur trouvé</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'notifications' && (
          <>
            <View style={styles.actionBar}>
              <Text style={styles.sectionTitle}>Notifications Système</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddNotificationModal(true)}
              >
                <Bell size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {notifications.map((notification) => (
              <View key={notification.id} style={styles.notificationCard}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteNotification(notification.id)}
                    style={styles.deleteIconButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <View style={styles.notificationFooter}>
                  <View style={styles.targetBadge}>
                    <Text style={styles.targetText}>{getTargetLabel(notification.target_user_type)}</Text>
                  </View>
                  <Text style={styles.notificationDate}>
                    {new Date(notification.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
            ))}

            {notifications.length === 0 && (
              <View style={styles.emptyState}>
                <Bell size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>Aucune notification</Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'backup' && (
          <>
            <Text style={styles.sectionTitle}>Sauvegarde & Restauration</Text>

            <View style={styles.backupCard}>
              <View style={styles.backupIcon}>
                <Download size={32} color="#2563eb" />
              </View>
              <Text style={styles.backupTitle}>Créer une Sauvegarde</Text>
              <Text style={styles.backupDescription}>
                Exporter toutes les données de la base de données en JSON ou Excel
              </Text>
              <View style={styles.backupButtonsContainer}>
                <TouchableOpacity
                  style={[styles.backupButton, styles.backupButtonPrimary]}
                  onPress={() => handleBackupData('excel')}
                  disabled={backupInProgress}
                >
                  {backupInProgress ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Download size={18} color="#fff" />
                      <Text style={styles.backupButtonText}>Excel (.xlsx)</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.backupButton, styles.backupButtonSecondary]}
                  onPress={() => handleBackupData('json')}
                  disabled={backupInProgress}
                >
                  {backupInProgress ? (
                    <ActivityIndicator size="small" color="#64748b" />
                  ) : (
                    <>
                      <Download size={18} color="#64748b" />
                      <Text style={styles.backupButtonTextSecondary}>JSON</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>À propos des Sauvegardes</Text>
              <Text style={styles.infoText}>
                • Les sauvegardes incluent les commandes, utilisateurs, commerçants, livreurs et produits{'\n'}
                • Limite de 1000 enregistrements par table{'\n'}
                • Format Excel (.xlsx) pour l'analyse et les rapports{'\n'}
                • Format JSON pour la restauration et l'intégration{'\n'}
                • Les fichiers sont partagés via le système de partage natif{'\n'}
                • Sauvegardez régulièrement vos données importantes
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={showAddAdminModal}
        transparent
        animationType="slide"
        onRequestClose={() => !addingAdmin && setShowAddAdminModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un Administrateur</Text>
              {!addingAdmin && (
                <TouchableOpacity onPress={() => setShowAddAdminModal(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numéro de Téléphone</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: +225 07 12 34 56 78"
                value={newAdminPhone}
                onChangeText={setNewAdminPhone}
                keyboardType="phone-pad"
                editable={!addingAdmin}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rôle</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, newAdminRole === 'admin' && styles.roleOptionActive]}
                  onPress={() => setNewAdminRole('admin')}
                  disabled={addingAdmin}
                >
                  <Text style={[styles.roleOptionText, newAdminRole === 'admin' && styles.roleOptionTextActive]}>
                    Administrateur
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, newAdminRole === 'moderator' && styles.roleOptionActive]}
                  onPress={() => setNewAdminRole('moderator')}
                  disabled={addingAdmin}
                >
                  <Text style={[styles.roleOptionText, newAdminRole === 'moderator' && styles.roleOptionTextActive]}>
                    Modérateur
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, addingAdmin && styles.submitButtonDisabled]}
              onPress={handleAddAdmin}
              disabled={addingAdmin}
            >
              {addingAdmin ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <UserPlus size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Ajouter l'Administrateur</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAddNotificationModal}
        transparent
        animationType="slide"
        onRequestClose={() => !sendingNotification && setShowAddNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle Notification</Text>
              {!sendingNotification && (
                <TouchableOpacity onPress={() => setShowAddNotificationModal(false)}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Titre</Text>
              <TextInput
                style={styles.input}
                placeholder="Titre de la notification"
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                editable={!sendingNotification}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Message</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Message de la notification"
                value={notificationMessage}
                onChangeText={setNotificationMessage}
                multiline
                numberOfLines={4}
                editable={!sendingNotification}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Destinataires</Text>
              <View style={styles.targetSelector}>
                {['all', 'client', 'merchant', 'driver'].map((target) => (
                  <TouchableOpacity
                    key={target}
                    style={[styles.targetOption, notificationTarget === target && styles.targetOptionActive]}
                    onPress={() => setNotificationTarget(target as any)}
                    disabled={sendingNotification}
                  >
                    <Text style={[styles.targetOptionText, notificationTarget === target && styles.targetOptionTextActive]}>
                      {getTargetLabel(target)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, sendingNotification && styles.submitButtonDisabled]}
              onPress={handleSendNotification}
              disabled={sendingNotification}
            >
              {sendingNotification ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Bell size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Envoyer la Notification</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingNotification && setDeleteConfirmModal({ visible: false, notificationId: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Trash2 size={32} color="#ef4444" />
              <Text style={styles.deleteModalTitle}>Confirmer la suppression</Text>
            </View>

            <Text style={styles.deleteModalMessage}>
              Êtes-vous sûr de vouloir supprimer cette notification? Cette action est irréversible.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalButton, styles.cancelButton]}
                onPress={() => setDeleteConfirmModal({ visible: false, notificationId: null })}
                disabled={deletingNotification}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteModalButton, styles.confirmDeleteButton]}
                onPress={confirmDeleteNotification}
                disabled={deletingNotification}
              >
                {deletingNotification ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={18} color="#fff" />
                    <Text style={styles.confirmDeleteButtonText}>Supprimer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
  },
  tabActive: {
    backgroundColor: '#dbeafe',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#2563eb',
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
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  adminCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  adminPhone: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  adminActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  targetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  notificationDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  backupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  backupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  backupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  backupDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  backupButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  backupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backupButtonPrimary: {
    backgroundColor: '#2563eb',
  },
  backupButtonSecondary: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  backupButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  backupButtonTextSecondary: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  roleOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  roleOptionTextActive: {
    color: '#2563eb',
  },
  targetSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  targetOptionActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  targetOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  targetOptionTextActive: {
    color: '#2563eb',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  deleteModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
