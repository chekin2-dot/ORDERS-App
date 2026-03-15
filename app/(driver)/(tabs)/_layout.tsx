import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Home, Truck, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DriverMessageIconWithBadge from '@/components/DriverMessageIconWithBadge';
import { MessageNotificationService } from '@/components/MessageNotificationService';

export default function DriverTabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a1a1a',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingBottom: insets.bottom,
          height: 64 + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Livraisons',
          tabBarIcon: ({ size, color }) => <Truck size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ size, color }) => <DriverMessageIconWithBadge size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
      <MessageNotificationService />
    </View>
  );
}
