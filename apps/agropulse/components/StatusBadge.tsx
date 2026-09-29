import { StyleSheet, Text, View } from 'react-native';
import { statusMeta } from '@/lib/theme';
import type { PlotStatus } from '@/types/domain';

// rf-12: muestra el semáforo del lote con color, símbolo y texto.
export function StatusBadge({ status }: { status: PlotStatus }) {
  const meta = statusMeta[status];
  return (
    <View style={[styles.badge, { borderColor: meta.color, backgroundColor: `${meta.color}16` }]}>
      <Text style={[styles.symbol, { color: meta.color }]}>{meta.symbol}</Text>
      <Text style={[styles.label, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderRadius: 99, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  symbol: { fontSize: 13, fontWeight: '900' },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
});
