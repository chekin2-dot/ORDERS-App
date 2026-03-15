import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Bell } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  target_user_type: string;
  created_at: string;
}

interface SystemNotificationBannerProps {
  onDismiss?: () => void;
}

export default function SystemNotificationBanner({ onDismiss }: SystemNotificationBannerProps) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotifications();

    const subscription = supabase
      .channel('system_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'system_notifications',
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await supabase
        .from('system_notifications')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleDismiss = async (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));

    if (profile?.id) {
      try {
        await supabase.from('user_notifications').upsert({
          user_id: profile.id,
          notification_id: id,
          dismissed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,notification_id'
        });
      } catch (error) {
        console.error('Error saving dismissed notification:', error);
      }
    }

    if (onDismiss) {
      onDismiss();
    }
  };

  const visibleNotifications = notifications.filter(n => !dismissedIds.has(n.id));

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {visibleNotifications.map((notification) => (
        <View key={notification.id} style={styles.notificationCard}>
          <View style={styles.iconContainer}>
            <Bell size={20} color="#2563eb" />
          </View>
          <View style={styles.contentContainer}>
            <Text style={styles.title}>{notification.title}</Text>
            <Text style={styles.message}>{notification.message}</Text>
            <Text style={styles.date}>
              {new Date(notification.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDismiss(notification.id)}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
    color: '#64748b',
  },
  dismissButton: {
    padding: 4,
  },
});
