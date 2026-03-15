import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

interface DriverMessageIconWithBadgeProps {
  size: number;
  color: string;
}

export default function DriverMessageIconWithBadge({ size, color }: DriverMessageIconWithBadgeProps) {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [driverId, setDriverId] = useState<string | null>(null);
  const previousUnreadCount = useRef(0);

  useEffect(() => {
    if (profile?.id) {
      loadDriverId();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (driverId) {
      loadUnreadCount();
      const unsubscribe = subscribeToMessages();
      return unsubscribe;
    }
  }, [driverId]);

  const loadDriverId = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setDriverId(data.id);
      }
    } catch (error) {
      console.error('Error loading driver ID:', error);
    }
  };

  const playNotificationSound = async () => {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        allowsRecordingIOS: false,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/sfx/click/2568.mp3' },
        { shouldPlay: true, volume: 0.6 }
      );
      await sound.playAsync();
      setTimeout(async () => {
        await sound.unloadAsync();
      }, 800);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  const triggerNotificationAlert = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error('Error triggering haptic feedback:', error);
      }
    }

    try {
      await playNotificationSound();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const loadUnreadCount = async () => {
    if (!driverId) return;

    try {
      const { data: conversations, error: convoError } = await supabase
        .from('order_conversations')
        .select('id')
        .eq('driver_id', driverId);

      if (convoError) throw convoError;

      if (!conversations || conversations.length === 0) {
        setUnreadCount(0);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      const { count, error } = await supabase
        .from('order_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', profile.id);

      if (error) throw error;

      const newCount = count || 0;

      if (newCount > previousUnreadCount.current && previousUnreadCount.current >= 0) {
        triggerNotificationAlert();
      }

      previousUnreadCount.current = newCount;
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('driver-unread-messages-badge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_messages',
        },
        (payload) => {
          console.log('Driver message event received:', payload);
          loadUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_conversations',
        },
        (payload) => {
          console.log('Driver conversation event received:', payload);
          loadUnreadCount();
        }
      )
      .subscribe((status) => {
        console.log('Driver badge subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to driver message notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Driver badge channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <View style={styles.container}>
      <MessageCircle size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});
