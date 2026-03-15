import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { LogOut, Shield, Users, Bell, Database, X, Wallet, Receipt } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import AppFooter from '@/components/AppFooter';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    loadAdminInfo();
  }, []);

  const loadAdminInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('admin_users')
        .select('*, user_profiles(first_name, last_name, phone)')
        .eq('user_id', user.id)
        .single();

      setAdminInfo(data);
    } catch (error) {
      console.error('Error loading admin info:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace('/auth/phone');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres Admin</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {adminInfo?.user_profiles?.first_name?.[0]}{adminInfo?.user_profiles?.last_name?.[0]}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {adminInfo?.user_profiles?.first_name} {adminInfo?.user_profiles?.last_name}
              </Text>
              <Text style={styles.profileRole}>
                {adminInfo?.role === 'super_admin' ? 'Super Administrateur' :
                 adminInfo?.role === 'admin' ? 'Administrateur' : 'Modérateur'}
              </Text>
              <Text style={styles.profilePhone}>{adminInfo?.user_profiles?.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outils Admin</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/(admin)/admin-tools')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#dbeafe' }]}>
              <Users size={20} color="#2563eb" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Gérer les Admins</Text>
              <Text style={styles.settingDescription}>Ajouter ou supprimer des administrateurs</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/(admin)/partner-payments')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#dcfce7' }]}>
              <Wallet size={20} color="#10b981" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Paiement des partenaires</Text>
              <Text style={styles.settingDescription}>Gérer les paiements des vendeurs et livreurs</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/(admin)/monthly-expenses')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#fef3c7' }]}>
              <Receipt size={20} color="#f59e0b" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Dépenses mensuelles</Text>
              <Text style={styles.settingDescription}>Gérer les abonnements et dépenses récurrentes</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/(admin)/admin-tools?tab=notifications')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#fef3c7' }]}>
              <Bell size={20} color="#f59e0b" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingDescription}>Configurer les notifications système</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/(admin)/admin-tools?tab=backup')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#e0e7ff' }]}>
              <Database size={20} color="#6366f1" />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Sauvegarde</Text>
              <Text style={styles.settingDescription}>Sauvegarder et restaurer les données</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>

          <TouchableOpacity style={styles.settingItem} onPress={() => setShowLogoutModal(true)}>
            <View style={[styles.settingIcon, { backgroundColor: '#fee2e2' }]}>
              <LogOut size={20} color="#ef4444" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: '#ef4444' }]}>Déconnexion</Text>
              <Text style={styles.settingDescription}>Se déconnecter du panneau admin</Text>
            </View>
          </TouchableOpacity>
        </View>

        <AppFooter />
      </ScrollView>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmer la déconnexion</Text>
              {!isLoggingOut && (
                <TouchableOpacity onPress={() => setShowLogoutModal(false)} style={styles.closeButton}>
                  <X size={24} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.modalMessage}>
              Êtes-vous sûr de vouloir vous déconnecter du panneau d'administration?
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.logoutButton]}
                onPress={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.logoutButtonText}>Déconnexion</Text>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  modalMessage: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
