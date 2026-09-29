import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatAge } from '@/lib/plot-status';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

// rf-23: resume conexión, usuario, rol y antigüedad de la última lectura.
export default function DiagnosticsScreen() {
  const { session } = useAuth();
  const { activeMembership } = useOrganization();
  const [lastTick, setLastTick] = useState<string | null>(null);
  const [connection, setConnection] = useState<'checking' | 'connected' | 'error'>('checking');
  const [message, setMessage] = useState<string | null>(null);

  // rnf-05: una consulta simple distingue conexión correcta de error de datos.
  const check = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setConnection('error');
      setMessage('Variables EXPO_PUBLIC_SUPABASE_* sin configurar.');
      return;
    }
    setConnection('checking');
    const { data, error } = await supabase.from('readings').select('measured_at').order('measured_at', { ascending: false }).limit(1).maybeSingle();
    if (error) {
      setConnection('error');
      setMessage(error.message);
    } else {
      setConnection('connected');
      setMessage(null);
      setLastTick(data?.measured_at ?? null);
    }
  }, []);

  useEffect(() => { void check(); }, [check]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.dot, { backgroundColor: connection === 'connected' ? colors.optimal : connection === 'checking' ? colors.warning : colors.dry }]} />
        <View><Text style={styles.heroTitle}>{connection === 'connected' ? 'Servicios conectados' : connection === 'checking' ? 'Comprobando…' : 'Hay un problema'}</Text><Text style={styles.heroSubtitle}>{message ?? 'La consulta a Supabase respondió correctamente.'}</Text></View>
      </View>

      <View style={styles.card}>
        <DiagnosticRow label="Usuario ID" value={session?.user.id ?? '—'} />
        <DiagnosticRow label="Establecimiento" value={activeMembership?.organizations.name ?? '—'} />
        <DiagnosticRow label="Organización ID" value={activeMembership?.organization_id ?? '—'} />
        <DiagnosticRow label="Rol" value={activeMembership?.role ?? '—'} />
        <DiagnosticRow label="Último tick" value={lastTick ? new Date(lastTick).toLocaleString('es-AR') : 'Sin lecturas'} />
        <DiagnosticRow label="Lag aparente" value={formatAge(lastTick)} />
      </View>

      <Pressable style={styles.button} onPress={() => void check()}><Text style={styles.buttonText}>Actualizar diagnóstico</Text></Pressable>
      <Text style={styles.note}>El worker debe registrar “produced”, “consumed” y “upsert reading” en Docker Compose.</Text>
    </ScrollView>
  );
}

// presenta cada dato del diagnóstico con el mismo formato.
function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, gap: 16 },
  hero: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  heroTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  heroSubtitle: { color: colors.muted, marginTop: 4, maxWidth: 290 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, gap: 15 },
  row: { gap: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 12 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  value: { color: colors.ink, fontWeight: '600' },
  button: { backgroundColor: colors.primary, borderRadius: 13, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '800' },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
