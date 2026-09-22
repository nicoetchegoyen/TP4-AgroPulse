import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { colors } from '@/lib/theme';

const demoUsers = ['productor@agropulse.test', 'operador@agropulse.test', 'asesor@agropulse.test'];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState(demoUsers[0] ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const message = await signIn(email, password);
    setError(message);
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.brandBlock}>
          <View style={styles.logo}><Text style={styles.logoText}>AP</Text></View>
          <Text style={styles.title}>AgroPulse</Text>
          <Text style={styles.subtitle}>Decisiones de riego con datos claros.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ingresar</Text>
          {!isSupabaseConfigured ? (
            <Text style={styles.configurationError}>Configurá la URL y la clave pública de Supabase en apps/agropulse/.env.</Text>
          ) : null}
          <Text style={styles.label}>Correo</Text>
          <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input} placeholder="nombre@agropulse.test" />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} style={styles.input} placeholder="••••••••" />
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <Pressable disabled={submitting || !email || !password} onPress={() => void submit()} style={[styles.button, (submitting || !email || !password) && styles.disabled]}>
            <Text style={styles.buttonText}>{submitting ? 'Ingresando…' : 'Ingresar'}</Text>
          </Pressable>
        </View>

        <View>
          <Text style={styles.demoTitle}>Usuarios de demostración</Text>
          <View style={styles.demoRow}>
            {demoUsers.map((user) => (
              <Pressable key={user} onPress={() => setEmail(user)} style={styles.demoPill}>
                <Text style={styles.demoText}>{user.split('@')[0]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Text style={styles.disclaimer}>Todos los datos de humedad y GPS de esta demo son ficticios.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 26 },
  brandBlock: { alignItems: 'center' },
  logo: { width: 64, height: 64, backgroundColor: colors.primary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  logoText: { color: 'white', fontSize: 24, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 32, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: colors.border, gap: 10 },
  cardTitle: { color: colors.ink, fontSize: 21, fontWeight: '800', marginBottom: 4 },
  label: { color: colors.ink, fontWeight: '700', fontSize: 13, marginTop: 4 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: colors.ink, fontSize: 16 },
  button: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.45 },
  error: { color: colors.dry, backgroundColor: colors.dangerSurface, padding: 10, borderRadius: 10 },
  configurationError: { color: colors.warning, backgroundColor: '#FFF4E5', padding: 10, borderRadius: 10 },
  demoTitle: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7, textAlign: 'center' },
  demoRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 },
  demoPill: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 },
  demoText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  disclaimer: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});
