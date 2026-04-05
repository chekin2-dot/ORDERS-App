import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  AppState,
  AppStateStatus,
  Vibration,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageCircle, X, ChevronRight } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { playNotificationSound, initializeAudio } from '@/lib/notificationSound';
import { registerForPushNotificationsAsync, scheduleNotification } from '@/lib/pushNotifications';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState<MessageNotification | null>(null);
  const [processedMessages] = useState<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (profile?.id) {
      initializeAudio();
      registerForPushNotificationsAsync();
    }

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      appState.current = nextState;
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
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
      responseListener.remove();
    };
  }, [profile?.id]);

  const startPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    glowAnim.setValue(0);

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoopRef.current.start();
  }, []);

  const stopPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    glowAnim.setValue(0);
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

    const userType = profile.user_type;
    if (userType !== 'client' && userType !== 'driver' && userType !== 'merchant') return;

    const channel = supabase
      .channel(`msg_notif_v2_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;

          if (processedMessages.has(newMessage.id)) return;
          if (newMessage.sender_id === profile.id) return;

          const isOnConversationScreen = pathname?.includes('/conversation');
          const isInForeground = appState.current === 'active';

          processedMessages.add(newMessage.id);

          const { data: conversationData } = await supabase
            .from('order_conversations')
            .select('order_id, client_id, driver_id')
            .eq('id', newMessage.conversation_id)
            .maybeSingle();

          if (!conversationData) return;

          const isRelevantMessage =
            (userType === 'client' && conversationData.client_id === profile.id) ||
            (userType === 'driver' && conversationData.driver_id === profile.id) ||
            (userType === 'merchant');

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
            : 'Nouveau message';

          const notificationData: MessageNotification = {
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

          if (Platform.OS === 'android' && !isInForeground) {
            Vibration.vibrate([0, 400, 100, 400, 100, 400]);
          }

          if (!isOnConversationScreen || !isInForeground) {
            setNotification(notificationData);
          } else if (isOnConversationScreen && !isInForeground) {
            setNotification(notificationData);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id, profile?.user_type, pathname]);

  useEffect(() => {
    if (notification) {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start(() => {
        startPulse();
      });

      dismissTimerRef.current = setTimeout(() => {
        dismissNotification();
      }, 12000);

      return () => {
        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      };
    } else {
      stopPulse();
      fadeAnim.setValue(0);
      slideAnim.setValue(-120);
    }
  }, [notification]);

  const dismissNotification = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    stopPulse();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification(null);
    });
  }, []);

  const handlePress = useCallback(() => {
    if (notification) {
      dismissNotification();
      const userType = profile?.user_type;
      const route = userType === 'driver' ? '/(driver)/conversation' : '/(client)/conversation';
      router.push({
        pathname: route as any,
        params: { orderId: notification.orderId },
      });
    }
  }, [notification, profile?.user_type]);

  if (!notification) return null;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const topOffset = insets.top > 0 ? insets.top + 8 : Platform.OS === 'ios' ? 54 : 12;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topOffset,
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.glowRing,
          { opacity: glowOpacity },
        ]}
      />
      <TouchableOpacity
        style={styles.notification}
        onPress={handlePress}
        activeOpacity={0.92}
      >
        <View style={styles.iconWrapper}>
          <View style={styles.iconContainer}>
            <MessageCircle size={22} color="#fff" strokeWidth={2.5} />
          </View>
          <View style={styles.iconPulse} />
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.appLabel}>Nouveau message</Text>
            <View style={styles.liveDot} />
          </View>
          <Text style={styles.senderName} numberOfLines={1}>
            {notification.senderName}
          </Text>
          <Text style={styles.orderTag}>
            {notification.orderNumber}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>

        <View style={styles.rightActions}>
          <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              dismissNotification();
            }}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 9999,
  },
  glowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 14,
    gap: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    overflow: 'hidden',
  },
  iconWrapper: {
    position: 'relative',
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  iconPulse: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3b82f6',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  senderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  orderTag: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  message: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
    marginTop: 1,
  },
  rightActions: {
    alignItems: 'center',
    gap: 8,
  },
  closeButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
