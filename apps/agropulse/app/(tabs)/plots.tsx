import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { OrganizationSwitcher } from '@/components/OrganizationSwitcher';
import { PlotCard } from '@/components/PlotCard';
import { ScreenState } from '@/components/ScreenState';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePlotSummaries } from '@/hooks/usePlotSummaries';
import { colors } from '@/lib/theme';

export default function PlotsScreen() {
  const { activeMembership, loading: organizationLoading } = useOrganization();
  const { plots, loading, error, refresh } = usePlotSummaries(activeMembership?.organization_id);

  if (organizationLoading || (loading && plots.length === 0)) return <ScreenState loading title="Cargando lotes…" />;
  if (error && plots.length === 0) return <ScreenState title="No pudimos cargar los lotes" message={error} onRetry={() => void refresh()} />;
  if (!activeMembership) return <ScreenState title="Sin establecimiento" message="No hay una membresía activa." />;

  return (
    <View style={styles.container}>
      <OrganizationSwitcher />
      <FlatList
        data={plots}
        keyExtractor={(plot) => plot.id}
        renderItem={({ item }) => <PlotCard plot={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.primary} />}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.eyebrow}>{activeMembership.organizations.region}</Text><Text style={styles.title}>{activeMembership.organizations.name}</Text><Text style={styles.subtitle}>{plots.length} lotes monitoreados</Text></View>}
        ListEmptyComponent={<ScreenState title="No hay lotes" message="Ejecutá el seed de Supabase para cargar los lotes de demostración." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, paddingBottom: 32 },
  separator: { height: 12 },
  header: { marginBottom: 20 },
  eyebrow: { color: colors.primary, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 11 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.muted, marginTop: 5 },
});
