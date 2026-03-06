import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { MessageCircle, Truck, ChevronRight, Trash2, Bell, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

interface Conversation {
  id: string;
  order_id: string;
  driver_id: string;
  driver_name: string;
  driver_phone: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  order_status?: string;
  created_at: string;
}

interface GroupedConversation {
  driver_id: string;
  driver_name: string;
  conversations: Conversation[];
  total_unread: number;
  latest_message: string;
  latest_message_at: string;
  can_delete: boolean;
}

interface SystemNotification {
  id: string;
  user_notification_id: string;
  notification_id: string;
  title: string;
  message: string;
  created_at: string;
  dismissed_at: string;
  is_read: boolean;
}

export default function ClientMessagesScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupedConversations, setGroupedConversations] = useState<GroupedConversation[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (profile?.id) {
      loadConversations();
      loadSystemNotifications();
      const unsubscribe = subscribeToConversations();
      return unsubscribe;
    }
  }, [profile?.id]);

  const loadConversations = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      console.log('Loading conversations for client:', profile.id);

      const { data, error } = await supabase
        .from('order_conversations')
        .select(`
          id,
          order_id,
          driver_id,
          last_message,
          last_message_at,
          created_at,
          orders!order_id (
            status
          ),
          drivers!driver_id (
            user_profiles (
              first_name,
              last_name,
              phone
            )
          )
        `)
        .eq('client_id', profile.id)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      console.log('Conversations loaded:', data?.length || 0);

      if (data) {
        const conversationsWithDetails = await Promise.all(
          data.map(async (conv: any) => {
            const driverData = conv.drivers?.user_profiles;
            const orderStatus = conv.orders?.status;

            const { count } = await supabase
              .from('order_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_read', false)
              .neq('sender_id', profile.id);

            return {
              id: conv.id,
              order_id: conv.order_id,
              driver_id: conv.driver_id,
              last_message: conv.last_message,
              last_message_at: conv.last_message_at,
              created_at: conv.created_at,
              driver_name: driverData ? `${driverData.first_name} ${driverData.last_name}` : 'Livreur',
              driver_phone: driverData?.phone || '',
              unread_count: count || 0,
              order_status: orderStatus,
            };
          })
        );

        console.log('Processed conversations:', conversationsWithDetails.length);
        setConversations(conversationsWithDetails);
        groupConversationsByDriver(conversationsWithDetails);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemNotifications = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select(`
          id,
          notification_id,
          is_read,
          dismissed_at,
          system_notifications!notification_id (
            id,
            title,
            message,
            created_at
          )
        `)
        .eq('user_id', profile.id)
        .not('dismissed_at', 'is', null)
        .order('dismissed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        const notifications = data
          .filter((item: any) => item.system_notifications)
          .map((item: any) => ({
            id: item.system_notifications.id,
            user_notification_id: item.id,
            notification_id: item.notification_id,
            title: item.system_notifications.title,
            message: item.system_notifications.message,
            created_at: item.system_notifications.created_at,
            dismissed_at: item.dismissed_at,
            is_read: item.is_read,
          }));
        setSystemNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading system notifications:', error);
    }
  };

  const subscribeToConversations = () => {
    console.log('Setting up realtime subscription for client:', profile?.id);

    const channel = supabase
      .channel('client-conversations-realtime', {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_conversations',
          filter: `client_id=eq.${profile?.id}`,
        },
        (payload) => {
          console.log('New conversation:', payload);
          loadConversations();
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_conversations',
          filter: `client_id=eq.${profile?.id}`,
        },
        (payload) => {
          console.log('Conversation updated:', payload);
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
        },
        (payload) => {
          console.log('New message received:', payload);
          loadConversations();
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_messages',
        },
        (payload) => {
          console.log('Message updated:', payload);
          loadConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${profile?.id}`,
        },
        (payload) => {
          console.log('System notification updated:', payload);
          loadSystemNotifications();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to conversations');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel error - retrying subscription');
        } else if (status === 'TIMED_OUT') {
          console.error('Subscription timed out');
        }
      });

    return () => {
      console.log('Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  };

  const groupConversationsByDriver = (convs: Conversation[]) => {
    const grouped = new Map<string, GroupedConversation>();

    convs.forEach((conv) => {
      const existing = grouped.get(conv.driver_id);

      const isOldOrCompleted =
        conv.order_status === 'delivered' ||
        conv.order_status === 'cancelled' ||
        isConversationOlderThanOneMonth(conv.created_at);

      if (existing) {
        existing.conversations.push(conv);
        existing.total_unread += conv.unread_count;

        if (new Date(conv.last_message_at) > new Date(existing.latest_message_at)) {
          existing.latest_message = conv.last_message;
          existing.latest_message_at = conv.last_message_at;
        }

        existing.can_delete = existing.can_delete && isOldOrCompleted;
      } else {
        grouped.set(conv.driver_id, {
          driver_id: conv.driver_id,
          driver_name: conv.driver_name,
          conversations: [conv],
          total_unread: conv.unread_count,
          latest_message: conv.last_message,
          latest_message_at: conv.last_message_at,
          can_delete: isOldOrCompleted,
        });
      }
    });

    const sortedGroups = Array.from(grouped.values()).sort(
      (a, b) => new Date(b.latest_message_at).getTime() - new Date(a.latest_message_at).getTime()
    );

    setGroupedConversations(sortedGroups);
  };

  const isConversationOlderThanOneMonth = (createdAt: string) => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return new Date(createdAt) < oneMonthAgo;
  };

  const toggleDriverExpanded = (driverId: string) => {
    const newExpanded = new Set(expandedDrivers);
    if (newExpanded.has(driverId)) {
      newExpanded.delete(driverId);
    } else {
      newExpanded.add(driverId);
    }
    setExpandedDrivers(newExpanded);
  };

  const handleDeleteConversation = async (conversationId: string, driverName: string) => {
    const confirmMessage = `Supprimer la conversation avec ${driverName}?`;

    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    } else {
      Alert.alert(
        'Supprimer la conversation',
        confirmMessage,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: () => performDeleteConversation(conversationId) },
        ]
      );
      return;
    }
    await performDeleteConversation(conversationId);
  };

  const performDeleteConversation = async (conversationId: string) => {
    try {
      await supabase.from('order_messages').delete().eq('conversation_id', conversationId);

      const { error } = await supabase
        .from('order_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      loadConversations();

      if (Platform.OS === 'web') {
        window.alert('Conversation supprimée');
      } else {
        Alert.alert('Succès', 'Conversation supprimée');
      }
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible de supprimer'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de supprimer');
      }
    }
  };

  const handleDeleteAllForDriver = async (driverId: string, driverName: string) => {
    const group = groupedConversations.find(g => g.driver_id === driverId);
    if (!group) return;

    const confirmMessage = `Supprimer toutes les conversations (${group.conversations.length}) avec ${driverName}?`;

    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    } else {
      Alert.alert(
        'Supprimer toutes les conversations',
        confirmMessage,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer tout', style: 'destructive', onPress: () => performDeleteAllForDriver(group) },
        ]
      );
      return;
    }
    await performDeleteAllForDriver(group);
  };

  const performDeleteAllForDriver = async (group: GroupedConversation) => {
    try {
      const conversationIds = group.conversations.map(c => c.id);

      await supabase.from('order_messages').delete().in('conversation_id', conversationIds);

      const { error } = await supabase
        .from('order_conversations')
        .delete()
        .in('id', conversationIds);

      if (error) throw error;

      loadConversations();

      if (Platform.OS === 'web') {
        window.alert(`${group.conversations.length} conversations supprimées`);
      } else {
        Alert.alert('Succès', `${group.conversations.length} conversations supprimées`);
      }
    } catch (error: any) {
      console.error('Error deleting conversations:', error);
      if (Platform.OS === 'web') {
        window.alert('Erreur: ' + (error.message || 'Impossible de supprimer'));
      } else {
        Alert.alert('Erreur', error.message || 'Impossible de supprimer');
      }
    }
  };

  const handleDismissNotification = async (userNotificationId: string) => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('id', userNotificationId);

      if (error) throw error;

      setSystemNotifications(prev =>
        prev.filter(n => n.user_notification_id !== userNotificationId)
      );
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes === 0 ? 'À l\'instant' : `Il y a ${minutes}min`;
    }
    if (hours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'accepted': return 'Acceptée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'in_delivery': return 'En livraison';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'delivered': return { backgroundColor: '#dcfce7' };
      case 'cancelled': return { backgroundColor: '#fee2e2' };
      case 'in_delivery': return { backgroundColor: '#ffedd5' };
      default: return { backgroundColor: '#e0e7ff' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : groupedConversations.length === 0 && systemNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle size={64} color="#ccc" />
          <Text style={styles.emptyText}>Aucune conversation</Text>
          <Text style={styles.emptySubtext}>
            Vos conversations avec les livreurs apparaîtront ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedConversations}
          keyExtractor={(item) => item.driver_id}
          ListHeaderComponent={
            systemNotifications.length > 0 ? (
              <View style={styles.notificationsSection}>
                <Text style={styles.notificationsSectionTitle}>Notifications du système</Text>
                {systemNotifications.map((notification) => (
                  <View key={notification.id} style={styles.notificationCard}>
                    <View style={styles.notificationIcon}>
                      <Bell size={20} color="#2563eb" />
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                      <Text style={styles.notificationDate}>
                        {new Date(notification.dismissed_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDismissNotification(notification.user_notification_id)}
                      style={styles.notificationDismissButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <X size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.groupContainer}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => {
                  if (item.conversations.length === 1) {
                    router.push(`/(client)/conversation?conversationId=${item.conversations[0].id}`);
                  } else {
                    toggleDriverExpanded(item.driver_id);
                  }
                }}
              >
                <View style={styles.conversationAvatar}>
                  <Truck size={24} color="#2563eb" />
                </View>
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationName} numberOfLines={1} ellipsizeMode="tail">
                      {item.driver_name}
                      {item.conversations.length > 1 && (
                        <Text style={styles.conversationCount}> ({item.conversations.length})</Text>
                      )}
                    </Text>
                    <Text style={styles.conversationTime} numberOfLines={1}>
                      {formatTime(item.latest_message_at)}
                    </Text>
                  </View>
                  <View style={styles.conversationFooter}>
                    <Text style={styles.conversationLastMessage} numberOfLines={1} ellipsizeMode="tail">
                      {item.latest_message || 'Nouvelle conversation'}
                    </Text>
                    {item.total_unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.total_unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {item.conversations.length > 1 && (
                  <ChevronRight
                    size={20}
                    color="#999"
                    style={expandedDrivers.has(item.driver_id) ? styles.chevronExpanded : undefined}
                  />
                )}
                {item.can_delete && item.conversations.length > 1 && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteAllForDriver(item.driver_id, item.driver_name);
                    }}
                  >
                    <Trash2 size={18} color="#f44336" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {expandedDrivers.has(item.driver_id) && item.conversations.length > 1 && (
                <View style={styles.subConversations}>
                  {item.conversations.map((conv) => (
                    <TouchableOpacity
                      key={conv.id}
                      style={styles.subConversationItem}
                      onPress={() => router.push(`/(client)/conversation?conversationId=${conv.id}`)}
                    >
                      <View style={styles.subConversationContent}>
                        <Text style={styles.subConversationOrder} numberOfLines={1}>
                          Commande #{conv.order_id.slice(0, 8)}
                        </Text>
                        <Text style={styles.subConversationMessage} numberOfLines={1} ellipsizeMode="tail">
                          {conv.last_message || 'Nouvelle conversation'}
                        </Text>
                        <View style={styles.subConversationFooter}>
                          <Text style={styles.subConversationTime} numberOfLines={1}>
                            {formatTime(conv.last_message_at)}
                          </Text>
                          {conv.order_status && (
                            <View style={[styles.statusBadge, getStatusBadgeColor(conv.order_status)]}>
                              <Text style={styles.statusBadgeText}>{getStatusText(conv.order_status)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {conv.unread_count > 0 && (
                        <View style={styles.unreadBadgeSmall}>
                          <Text style={styles.unreadTextSmall}>{conv.unread_count}</Text>
                        </View>
                      )}
                      {(conv.order_status === 'delivered' ||
                        conv.order_status === 'cancelled' ||
                        isConversationOlderThanOneMonth(conv.created_at)) && (
                        <TouchableOpacity
                          style={styles.deleteButtonSmall}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv.id, item.driver_name);
                          }}
                        >
                          <Trash2 size={16} color="#f44336" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
          contentContainerStyle={styles.conversationsList}
        />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  conversationsList: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationLastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  orderInfo: {
    fontSize: 12,
    color: '#999',
  },
  groupContainer: {
    backgroundColor: '#fff',
  },
  groupHeader: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conversationCount: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteButtonSmall: {
    padding: 6,
    marginLeft: 8,
  },
  subConversations: {
    backgroundColor: '#f9fafb',
    paddingLeft: 78,
  },
  subConversationItem: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  subConversationContent: {
    flex: 1,
    gap: 4,
  },
  subConversationOrder: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  subConversationMessage: {
    fontSize: 13,
    color: '#666',
  },
  subConversationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  subConversationTime: {
    fontSize: 11,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  unreadBadgeSmall: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadTextSmall: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  notificationsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f9fafb',
  },
  notificationsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  notificationDismissButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
});
