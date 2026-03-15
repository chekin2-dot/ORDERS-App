import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { MessageCircle, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface MessageAlertProps {
  visible: boolean;
  message: string;
  senderName: string;
  onDismiss: () => void;
}

export function MessageAlert({ visible, message, senderName, onDismiss }: MessageAlertProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        dismissAlert();
      }, 5000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [visible]);

  const dismissAlert = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
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
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
          <View style={styles.alert}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <MessageCircle size={24} color="#fff" strokeWidth={2.5} />
              </View>
            </View>
            <View style={styles.content}>
              <Text style={styles.sender} numberOfLines={1}>{senderName}</Text>
              <Text style={styles.message} numberOfLines={2}>
                {message}
              </Text>
            </View>
            <TouchableOpacity
              onPress={dismissAlert}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </BlurView>
      ) : (
        <View style={[styles.alert, styles.androidAlert]}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <MessageCircle size={24} color="#fff" strokeWidth={2.5} />
            </View>
          </View>
          <View style={styles.content}>
            <Text style={styles.sender} numberOfLines={1}>{senderName}</Text>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          </View>
          <TouchableOpacity
            onPress={dismissAlert}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 1000,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  androidAlert: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  sender: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
