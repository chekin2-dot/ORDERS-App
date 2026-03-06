import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <View style={styles.webContainer}>
        <View style={styles.contentWrapper}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth/phone" />
            <Stack.Screen name="auth/register-client" />
            <Stack.Screen name="auth/register-merchant" />
            <Stack.Screen name="auth/register-driver" />
            <Stack.Screen name="(client)" />
            <Stack.Screen name="(merchant)" />
            <Stack.Screen name="(driver)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </View>
      </View>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    ...(Platform.OS === 'web' && {
      alignItems: 'center',
      justifyContent: 'center',
    }),
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 480,
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
      backgroundColor: '#ffffff',
    }),
  },
});
