import { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity, Vibration } from 'react-native';
import { MessageCircle, X, ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MessageAlertProps {
  visible: boolean;
  message: string;
  senderName: string;
  onDismiss: () => void;
  onPress?: () => void;
}

export function MessageAlert({ visible, message, senderName, onDismiss, onPress }: MessageAlertProps) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-130)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const stopPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    glowAnim.setValue(0);
  }, []);

  const startPulse = useCallback(() => {
    stopPulse();
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 420, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoopRef.current.start();
  }, []);

  const dismissAlert = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stopPulse();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -130, duration: 250, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [onDismiss]);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start(() => startPulse());

      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 400, 100, 400]);
      }

      timerRef.current = setTimeout(dismissAlert, 12000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [visible]);

  if (!visible) return null;

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const topOffset = insets.top > 0 ? insets.top + 8 : Platform.OS === 'ios' ? 54 : 12;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: topOffset,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: pulseAnim }],
        },
      ]}
    >
      <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
      <TouchableOpacity
        style={styles.alert}
        onPress={() => { dismissAlert(); onPress?.(); }}
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
          <Text style={styles.senderName} numberOfLines={1}>{senderName}</Text>
          <Text style={styles.message} numberOfLines={2}>{message}</Text>
        </View>

        <View style={styles.rightActions}>
          <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); dismissAlert(); }}
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
  alert: {
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
