import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '@/lib/theme';
import type { Reading } from '@/types/domain';

interface Props {
  readings: Reading[];
  thresholdMin: number;
  thresholdMax: number;
}

// rf-10: dibuja las lecturas recientes y marca los umbrales de humedad del lote.
export function MoistureChart({ readings, thresholdMin, thresholdMax }: Props) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(260, Math.min(width - 64, 680));
  const chartHeight = 180;
  const padding = 24;

  if (readings.length < 2) {
    return <Text style={styles.empty}>Todavía no hay suficientes puntos para graficar.</Text>;
  }

  // los datos y umbrales definen la escala vertical para aprovechar el espacio.
  const values = readings.map((reading) => reading.moisture_pct);
  const minY = Math.max(0, Math.min(...values, thresholdMin) - 5);
  const maxY = Math.min(100, Math.max(...values, thresholdMax) + 5);
  const span = Math.max(1, maxY - minY);
  // estas funciones convierten cada lectura a una posición dentro del gráfico.
  const x = (index: number) => padding + (index / (readings.length - 1)) * (chartWidth - padding * 2);
  const y = (value: number) => chartHeight - padding - ((value - minY) / span) * (chartHeight - padding * 2);
  const path = readings
    .map((reading, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(reading.moisture_pct)}`)
    .join(' ');

  return (
    <View style={styles.container} accessible accessibilityLabel={`Gráfico con ${readings.length} lecturas de humedad`}>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="line" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.wet} />
            <Stop offset="1" stopColor={colors.primary} />
          </LinearGradient>
        </Defs>
        <Line x1={padding} x2={chartWidth - padding} y1={y(thresholdMin)} y2={y(thresholdMin)} stroke={colors.dry} strokeDasharray="5 4" />
        <Line x1={padding} x2={chartWidth - padding} y1={y(thresholdMax)} y2={y(thresholdMax)} stroke={colors.wet} strokeDasharray="5 4" />
        <Path d={path} fill="none" stroke="url(#line)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <SvgText x={padding} y={y(thresholdMin) - 5} fill={colors.dry} fontSize="10">mín {thresholdMin}%</SvgText>
        <SvgText x={padding} y={y(thresholdMax) - 5} fill={colors.wet} fontSize="10">máx {thresholdMax}%</SvgText>
      </Svg>
      <View style={styles.axis}>
        <Text style={styles.axisText}>Hace 6 h</Text>
        <Text style={styles.axisText}>Ahora</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', overflow: 'hidden' },
  axis: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  axisText: { color: colors.muted, fontSize: 11 },
  empty: { color: colors.muted, paddingVertical: 28, textAlign: 'center' },
});
