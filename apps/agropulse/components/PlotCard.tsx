import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBadge } from '@/components/StatusBadge';
import { formatAge } from '@/lib/plot-status';
import { colors } from '@/lib/theme';
import type { PlotSummary } from '@/types/domain';

// rf-04 y rf-09: resume cultivo, estado y última lectura; al tocar abre el detalle.
export function PlotCard({ plot }: { plot: PlotSummary }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${plot.name}, estado ${plot.status}`}
      onPress={() => router.push({ pathname: '/plot/[id]', params: { id: plot.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={styles.name}>{plot.name}</Text>
          <Text style={styles.crop}>{plot.crop ?? 'Cultivo sin especificar'}</Text>
        </View>
        <StatusBadge status={plot.status} />
      </View>
      <View style={styles.metrics}>
        <View>
          <Text style={styles.metricValue}>
            {plot.moisture_pct === null ? '—' : `${plot.moisture_pct.toFixed(1)} %`}
          </Text>
          <Text style={styles.metricLabel}>Humedad</Text>
        </View>
        <View>
          <Text style={styles.metricValue}>
            {plot.temp_c === null ? '—' : `${plot.temp_c.toFixed(1)} °C`}
          </Text>
          <Text style={styles.metricLabel}>Temperatura</Text>
        </View>
        <View style={styles.ageBlock}>
          <Text style={styles.age}>{formatAge(plot.measured_at)}</Text>
          <Text style={styles.metricLabel}>Último dato</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border, gap: 18 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  name: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  crop: { color: colors.muted, marginTop: 3 },
  metrics: { flexDirection: 'row', gap: 24, alignItems: 'flex-end' },
  metricValue: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 3 },
  ageBlock: { flex: 1, alignItems: 'flex-end' },
  age: { color: colors.muted, fontSize: 14, fontWeight: '600' },
});
