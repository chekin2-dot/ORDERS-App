import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertCircle, Info, X, MessageCircle } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'message';
  duration?: number;
  onDismiss: () => void;
}

export function Toast({ visible, message, type = 'info', duration = 3000, onDismiss }: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 9,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        dismissToast();
      }, duration);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [visible, duration]);

  const dismissToast = () => {
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
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getIcon = () => {
    const iconProps = { size: 22, strokeWidth: 2.5 };
    switch (type) {
      case 'success':
        return <CheckCircle2 {...iconProps} color="#10b981" />;
      case 'error':
        return <AlertCircle {...iconProps} color="#ef4444" />;
      case 'message':
        return <MessageCircle {...iconProps} color="#3b82f6" />;
      default:
        return <Info {...iconProps} color="#3b82f6" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(16, 185, 129, 0.1)';
      case 'error':
        return 'rgba(239, 68, 68, 0.1)';
      case 'message':
        return 'rgba(59, 130, 246, 0.1)';
      default:
        return 'rgba(59, 130, 246, 0.1)';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(16, 185, 129, 0.3)';
      case 'error':
        return 'rgba(239, 68, 68, 0.3)';
      case 'message':
        return 'rgba(59, 130, 246, 0.3)';
      default:
        return 'rgba(59, 130, 246, 0.3)';
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <BlurView intensity={90} tint="light" style={styles.blurContainer}>
          <View style={[styles.toast, { backgroundColor: getBackgroundColor(), borderColor: getBorderColor() }]}>
            <View style={styles.iconContainer}>
              {getIcon()}
            </View>
            <Text style={styles.message} numberOfLines={3}>
              {message}
            </Text>
            <TouchableOpacity
              onPress={dismissToast}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        </BlurView>
      ) : (
        <View style={[styles.toast, styles.androidToast, { backgroundColor: getBackgroundColor(), borderColor: getBorderColor() }]}>
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
          <TouchableOpacity
            onPress={dismissToast}
            style={styles.closeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 80,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 1000,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  androidToast: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
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
