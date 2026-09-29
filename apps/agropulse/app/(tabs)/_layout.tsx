import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

// rnf-01: organiza mapa, lotes, alertas y cuenta en la barra inferior.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { borderTopColor: colors.border, backgroundColor: colors.surface, height: 66, paddingBottom: 8 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Mapa', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="map-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="plots" options={{ title: 'Lotes', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="sprout-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alertas', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bell-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Cuenta', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
