import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MessageCircle, Send, ArrowLeft, User, ChevronRight, Trash2, Bell, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

interface Conversation {
  id: string;
  order_id: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  order_status?: string;
  created_at: string;
}

interface GroupedConversation {
  client_id: string;
  client_name: string;
  conversations: Conversation[];
  total_unread: number;
  latest_message: string;
  latest_message_at: string;
  can_delete: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
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

export default function DriverMessagesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupedConversations, setGroupedConversations] = useState<GroupedConversation[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user?.id) {
      loadDriverId();
    }
  }, [user?.id]);

  useEffect(() => {
    if (driverId) {
      loadConversations();
      loadSystemNotifications();

      const channel = supabase
        .channel('driver-conversations-realtime', {
          config: {
            broadcast: { self: true },
          },
        })
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_conversations',
            filter: `driver_id=eq.${driverId}`,
          },
          (payload) => {
            console.log('New conversation for driver:', payload);
            loadConversations();
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'order_conversations',
            filter: `driver_id=eq.${driverId}`,
          },
          (payload) => {
            console.log('Conversation updated for driver:', payload);
            loadConversations();
          }
        )
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'order_messages' },
          (payload) => {
            console.log('New message for driver:', payload);
            if (selectedConversation) {
              loadMessages(selectedConversation.id);
            }
            loadConversations();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'order_messages' },
          (payload) => {
            console.log('Message updated for driver:', payload);
            if (selectedConversation) {
              loadMessages(selectedConversation.id);
            }
            loadConversations();
          }
        )
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user?.id}`,
          },
          (payload) => {
            console.log('System notification updated:', payload);
            loadSystemNotifications();
          }
        )
        .subscribe((status) => {
          console.log('Driver subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('Successfully subscribed to driver conversations');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Channel error - retrying subscription');
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [driverId, selectedConversation]);

  const loadDriverId = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setDriverId(data.id);
    }
  };

  const loadConversations = async () => {
    if (!driverId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('order_conversations')
        .select(`
          id,
          order_id,
          client_id,
          last_message,
          last_message_at,
          created_at,
          orders!order_id (
            status
          )
        `)
        .eq('driver_id', driverId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const conversationsWithDetails = await Promise.all(
          data.map(async (conv: any) => {
            const { data: clientData } = await supabase
              .from('user_profiles')
              .select('first_name, last_name, phone')
              .eq('id', conv.client_id)
              .maybeSingle();

            const { count } = await supabase
              .from('order_messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_read', false)
              .neq('sender_id', user?.id);

            return {
              id: conv.id,
              order_id: conv.order_id,
              client_id: conv.client_id,
              last_message: conv.last_message,
              last_message_at: conv.last_message_at,
              created_at: conv.created_at,
              client_name: clientData ? `${clientData.first_name} ${clientData.last_name}` : 'Client',
              client_phone: clientData?.phone || '',
              unread_count: count || 0,
              order_status: conv.orders?.status,
            };
          })
        );

        setConversations(conversationsWithDetails);
        groupConversationsByClient(conversationsWithDetails);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemNotifications = async () => {
    if (!user?.id) return;

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
        .eq('user_id', user.id)
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

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('order_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setMessages(data);
        markAsRead(conversationId);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    await supabase
      .from('order_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user?.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('order_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          message: newMessage.trim(),
        });

      if (error) throw error;

      setNewMessage('');
      await loadMessages(selectedConversation.id);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const groupConversationsByClient = (convs: Conversation[]) => {
    const grouped = new Map<string, GroupedConversation>();

    convs.forEach((conv) => {
      const existing = grouped.get(conv.client_id);

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
        grouped.set(conv.client_id, {
          client_id: conv.client_id,
          client_name: conv.client_name,
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

  const toggleClientExpanded = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const handleDeleteConversation = async (conversationId: string, clientName: string) => {
    const confirmMessage = `Supprimer la conversation avec ${clientName}?`;

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

  const handleDeleteAllForClient = async (clientId: string, clientName: string) => {
    const group = groupedConversations.find(g => g.client_id === clientId);
    if (!group) return;

    const confirmMessage = `Supprimer toutes les conversations (${group.conversations.length}) avec ${clientName}?`;

    if (Platform.OS === 'web') {
      if (!window.confirm(confirmMessage)) return;
    } else {
      Alert.alert(
        'Supprimer toutes les conversations',
        confirmMessage,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer tout', style: 'destructive', onPress: () => performDeleteAllForClient(group) },
        ]
      );
      return;
    }
    await performDeleteAllForClient(group);
  };

  const performDeleteAllForClient = async (group: GroupedConversation) => {
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

  const selectConversation = (conv: Conversation) => {
    router.push({
      pathname: '/(driver)/conversation',
      params: { conversationId: conv.id },
    });
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

  if (!selectedConversation) {
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
              Les conversations démarrent automatiquement quand vous acceptez une livraison
            </Text>
          </View>
        ) : (
          <FlatList
            data={groupedConversations}
            keyExtractor={(item) => item.client_id}
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
                      selectConversation(item.conversations[0]);
                    } else {
                      toggleClientExpanded(item.client_id);
                    }
                  }}
                >
                  <View style={styles.conversationAvatar}>
                    <User size={24} color="#2563eb" />
                  </View>
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                      <Text style={styles.conversationName} numberOfLines={1} ellipsizeMode="tail">
                        {item.client_name}
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
                      style={expandedClients.has(item.client_id) ? styles.chevronExpanded : undefined}
                    />
                  )}
                  {item.can_delete && item.conversations.length > 1 && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteAllForClient(item.client_id, item.client_name);
                      }}
                    >
                      <Trash2 size={18} color="#f44336" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {expandedClients.has(item.client_id) && item.conversations.length > 1 && (
                  <View style={styles.subConversations}>
                    {item.conversations.map((conv) => (
                      <TouchableOpacity
                        key={conv.id}
                        style={styles.subConversationItem}
                        onPress={() => selectConversation(conv)}
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
                              handleDeleteConversation(conv.id, item.client_name);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.chatHeader, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => setSelectedConversation(null)} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{selectedConversation.client_name}</Text>
          <Text style={styles.chatHeaderPhone}>{selectedConversation.client_phone}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isMe = item.sender_id === user?.id;
          return (
            <View style={[styles.messageContainer, isMe && styles.messageContainerMe]}>
              <View style={[styles.messageBubble, isMe && styles.messageBubbleMe]}>
                <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                  {item.message}
                </Text>
                <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
                  {formatTime(item.created_at)}
                </Text>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Votre message..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    backgroundColor: '#f0f0f0',
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
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  chatHeaderPhone: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageContainerMe: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '75%',
  },
  messageBubbleMe: {
    backgroundColor: '#2563eb',
  },
  messageText: {
    fontSize: 15,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  messageTextMe: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#1a1a1a',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
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
