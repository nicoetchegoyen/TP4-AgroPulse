import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ScreenState } from '@/components/ScreenState';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { AlertItem } from '@/types/domain';

export default function AlertsScreen() {
  const { activeMembership } = useOrganization();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!activeMembership) return setLoading(false);
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('alerts')
      .select('*, plots!inner(name, organization_id)')
      .eq('plots.organization_id', activeMembership.organization_id)
      .order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else {
      setAlerts((data ?? []) as AlertItem[]);
      setError(null);
    }
    setLoading(false);
  }, [activeMembership]);

  useEffect(() => {
    void refresh();
    const channel = supabase.channel('alerts-inbox').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => void refresh()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  if (loading && alerts.length === 0) return <ScreenState loading title="Cargando alertas…" />;
  if (error && alerts.length === 0) return <ScreenState title="No pudimos cargar las alertas" message={error} onRetry={() => void refresh()} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={alerts}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.primary} />}
      ListHeaderComponent={<View style={styles.header}><Text style={styles.title}>Novedades del campo</Text><Text style={styles.subtitle}>Sequía y estaciones sin reportar, diferenciadas.</Text></View>}
      ListEmptyComponent={<ScreenState title="Todo en orden" message="No hay alertas activas para este establecimiento." />}
      renderItem={({ item }) => (
        <View style={[styles.card, { borderLeftColor: item.type === 'dry' ? colors.dry : colors.stale }]}>
          <Text style={styles.type}>{item.type === 'dry' ? 'HUMEDAD BAJA' : 'ESTACIÓN SIN DATOS'}</Text>
          <Text style={styles.plot}>{item.plots?.name ?? 'Lote'}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString('es-AR')}</Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900' },
  subtitle: { color: colors.muted, marginTop: 5 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 5, padding: 16 },
  type: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  plot: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 5 },
  date: { color: colors.muted, fontSize: 12, marginTop: 8 },
});
