import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { colors } from '@/lib/theme';

// rnf-01: organiza las rutas y comparte sesión y establecimiento en toda la app.
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrganizationProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </OrganizationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// rf-01: decide qué pantalla mostrar según exista o no una sesión activa.
function RootNavigator() {
  const { session, initializing } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // al cambiar la sesión, envía al ingreso o a las pestañas principales.
  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) router.replace('/(auth)/login');
    if (session && inAuthGroup) router.replace('/(tabs)');
  }, [initializing, router, segments, session]);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerTintColor: colors.ink, headerShadowVisible: false, headerStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="plot/[id]" options={{ title: 'Detalle del lote' }} />
      <Stack.Screen name="diagnostics" options={{ title: 'Diagnóstico' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
