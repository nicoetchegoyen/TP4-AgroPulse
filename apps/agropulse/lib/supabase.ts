import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// rnf-02: la app usa la url y la clave pública; la clave secreta queda fuera del móvil.
const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const configuredKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// rnf-05: detecta valores faltantes o de ejemplo antes de intentar una consulta real.
export const isSupabaseConfigured = Boolean(
  configuredUrl &&
    configuredKey &&
    !configuredUrl.includes('YOUR_PROJECT') &&
    !configuredKey.includes('YOUR_PUBLISHABLE'),
);

// rf-01: el cliente guarda la sesión en el teléfono para no pedir ingreso en cada apertura.
export const supabase = createClient(
  isSupabaseConfigured ? configuredUrl! : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? configuredKey! : 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// rf-01: la renovación de la sesión funciona solo mientras la app está activa.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
