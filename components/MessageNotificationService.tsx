import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageCircle, X } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { playNotificationSound, initializeAudio } from '@/lib/notificationSound';
import { registerForPushNotificationsAsync, scheduleNotification } from '@/lib/pushNotifications';
import * as Notifications from 'expo-notifications';

interface MessageNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  senderName: string;
  message: string;
}

export function MessageNotificationService() {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [notification, setNotification] = useState<MessageNotification | null>(null);
  const [processedMessages, setProcessedMessages] = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (profile?.id) {
      initializeAudio();
      registerForPushNotificationsAsync();
    }

    const subscription = AppState.addEventListener('change', nextAppState => {
      appState.current = nextAppState;
    });

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[Notification] Received:', notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[Notification] Response:', response);
      const data = response.notification.request.content.data as any;
      if (data?.orderId && profile) {
        const userType = profile.user_type;
        const route = userType === 'driver' ? '/(driver)/conversation' : '/(client)/conversation';
        router.push({
          pathname: route as any,
          params: { orderId: data.orderId },
        });
      }
    });

    return () => {
      subscription.remove();
      notificationListener.remove();
      responseListener.remove();
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;

    const userType = profile.user_type;
    if (userType !== 'client' && userType !== 'driver') return;

    console.log('[MessageNotifications] Setting up subscription for:', userType);

    const channel = supabase
      .channel(`message_notifications_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;

          if (processedMessages.has(newMessage.id)) {
            return;
          }

          const isOnConversationScreen = pathname?.includes('/conversation');

          if (isOnConversationScreen) {
            return;
          }

          if (newMessage.sender_id === profile.id) {
            return;
          }

          const { data: conversationData } = await supabase
            .from('order_conversations')
            .select('order_id, client_id, driver_id')
            .eq('id', newMessage.conversation_id)
            .maybeSingle();

          if (!conversationData) return;

          const isRelevantMessage =
            (userType === 'client' && conversationData.client_id === profile.id) ||
            (userType === 'driver' && conversationData.driver_id === profile.id);

          if (!isRelevantMessage) return;

          const { data: orderData } = await supabase
            .from('orders')
            .select('order_number')
            .eq('id', conversationData.order_id)
            .maybeSingle();

          const { data: senderData } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('id', newMessage.sender_id)
            .maybeSingle();

          const senderName = senderData
            ? `${senderData.first_name} ${senderData.last_name}`
            : 'Quelqu\'un';

          console.log('[MessageNotifications] New message received:', {
            from: senderName,
            order: orderData?.order_number,
          });

          setProcessedMessages(prev => new Set(prev).add(newMessage.id));

          const notificationData = {
            id: newMessage.id,
            orderId: conversationData.order_id,
            orderNumber: orderData?.order_number || 'Commande',
            senderName,
            message: newMessage.message,
          };

          playNotificationSound();

          if (Platform.OS !== 'web') {
            await scheduleNotification(
              `${senderName} • ${orderData?.order_number || 'Commande'}`,
              newMessage.message,
              notificationData
            );
          }

          setNotification(notificationData);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id, profile?.user_type, pathname, processedMessages]);

  useEffect(() => {
    if (notification) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        dismissNotification();
      }, 8000);

      return () => clearTimeout(timeout);
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(-100);
    }
  }, [notification]);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  };

  const handlePress = () => {
    if (notification) {
      dismissNotification();
      const userType = profile?.user_type;
      const route = userType === 'driver' ? '/(driver)/conversation' : '/(client)/conversation';
      router.push({
        pathname: route as any,
        params: { orderId: notification.orderId },
      });
    }
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notification}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <MessageCircle size={24} color="#3b82f6" strokeWidth={2.5} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Nouveau message</Text>
          <Text style={styles.subtitle}>
            {notification.senderName} • {notification.orderNumber}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            dismissNotification();
          }}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={18} color="#64748b" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 16,
    right: 16,
    zIndex: 10000,
    elevation: 1000,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
