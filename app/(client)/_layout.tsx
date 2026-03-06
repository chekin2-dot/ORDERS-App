import { Stack } from 'expo-router/stack';

export default function ClientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="subcategories" />
      <Stack.Screen name="merchants" />
      <Stack.Screen name="order-details" />
    </Stack>
  );
}
