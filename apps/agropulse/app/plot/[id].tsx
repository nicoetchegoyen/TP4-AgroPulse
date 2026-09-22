import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CommandPanel } from '@/components/CommandPanel';
import { MoistureChart } from '@/components/MoistureChart';
import { ScreenState } from '@/components/ScreenState';
import { StatusBadge } from '@/components/StatusBadge';
import { useOrganization } from '@/contexts/OrganizationContext';
import { formatAge } from '@/lib/plot-status';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { IrrigationCommand, PlotSummary, Reading, Valve } from '@/types/domain';

export default function PlotDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeMembership } = useOrganization();
  const [plot, setPlot] = useState<PlotSummary | null>(null);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [valves, setValves] = useState<Valve[]>([]);
  const [commands, setCommands] = useState<IrrigationCommand[]>([]);
  const [thresholdMin, setThresholdMin] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingThreshold, setSavingThreshold] = useState(false);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: plotData, error: plotError } = await supabase.from('plot_summaries').select('*').eq('id', id).maybeSingle();
    if (plotError || !plotData) {
      setError(plotError?.message ?? 'El lote no existe o no está autorizado.');
      setLoading(false);
      return;
    }
    const nextPlot = plotData as PlotSummary;
    setPlot(nextPlot);
    setThresholdMin(nextPlot.threshold_min);

    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const [readingResult, valveResult] = await Promise.all([
      nextPlot.station_id
        ? supabase.from('readings').select('*').eq('station_id', nextPlot.station_id).gte('measured_at', since).order('measured_at')
        : Promise.resolve({ data: [], error: null }),
      supabase.from('valves').select('*').eq('plot_id', id).order('name'),
    ]);

    if (readingResult.error || valveResult.error) {
      setError(readingResult.error?.message ?? valveResult.error?.message ?? 'Error de lectura');
    } else {
      const nextValves = (valveResult.data ?? []) as Valve[];
      setReadings((readingResult.data ?? []) as Reading[]);
      setValves(nextValves);
      if (nextValves.length > 0) {
        const commandResult = await supabase
          .from('irrigation_commands')
          .select('*')
          .in('valve_id', nextValves.map((valve) => valve.id))
          .order('created_at', { ascending: false })
          .limit(20);
        if (commandResult.error) setError(commandResult.error.message);
        else setCommands((commandResult.data ?? []) as IrrigationCommand[]);
      } else setCommands([]);
      setError(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel(`plot-detail-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'valves' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'irrigation_commands' }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [id, refresh]);

  const saveThreshold = async () => {
    if (!plot) return;
    if (thresholdMin < 0 || thresholdMin >= plot.threshold_max) {
      Alert.alert('Umbral inválido', `La humedad mínima debe ser menor que ${plot.threshold_max} %.`);
      return;
    }
    setSavingThreshold(true);
    const { error: updateError } = await supabase.from('plots').update({ threshold_min: thresholdMin }).eq('id', plot.id);
    setSavingThreshold(false);
    if (updateError) Alert.alert('No se pudo guardar', updateError.message);
    else await refresh();
  };

  if (loading && !plot) return <ScreenState loading title="Cargando detalle…" />;
  if (error && !plot) return <ScreenState title="No pudimos abrir el lote" message={error} onRetry={() => void refresh()} />;
  if (!plot || !activeMembership) return <ScreenState title="Lote no disponible" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>{plot.crop ?? 'Sin cultivo'}</Text><Text style={styles.title}>{plot.name}</Text><Text style={styles.age}>{formatAge(plot.measured_at)}</Text></View>
        <StatusBadge status={plot.status} />
      </View>

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
      {plot.status === 'dry' ? <Text style={styles.suggestion}>Humedad bajo umbral: considerar riego.</Text> : null}

      <View style={styles.metrics}>
        <Metric label="Humedad" value={plot.moisture_pct === null ? '—' : `${plot.moisture_pct.toFixed(1)} %`} />
        <Metric label="Temperatura" value={plot.temp_c === null ? '—' : `${plot.temp_c.toFixed(1)} °C`} />
        <Metric label="Lluvia" value={plot.rain_mm === null ? '—' : `${plot.rain_mm.toFixed(1)} mm`} />
      </View>

      <Section title="Humedad · últimas 6 horas">
        <MoistureChart readings={readings} thresholdMin={plot.threshold_min} thresholdMax={plot.threshold_max} />
        <Text style={styles.points}>{readings.length} puntos recibidos</Text>
      </Section>

      <Section title="Umbral de riego">
        <View style={styles.thresholdRow}>
          <Pressable style={styles.stepper} onPress={() => setThresholdMin((value) => Math.max(0, value - 1))}><Text style={styles.stepperText}>−</Text></Pressable>
          <View style={styles.thresholdValue}><Text style={styles.thresholdNumber}>{thresholdMin}</Text><Text style={styles.thresholdUnit}>% mínimo</Text></View>
          <Pressable style={styles.stepper} onPress={() => setThresholdMin((value) => Math.min(plot.threshold_max - 1, value + 1))}><Text style={styles.stepperText}>+</Text></Pressable>
        </View>
        <Pressable disabled={savingThreshold || activeMembership.role === 'advisor'} onPress={() => void saveThreshold()} style={[styles.saveButton, (savingThreshold || activeMembership.role === 'advisor') && styles.disabled]}><Text style={styles.saveButtonText}>{activeMembership.role === 'advisor' ? 'Solo lectura' : savingThreshold ? 'Guardando…' : 'Guardar umbral'}</Text></Pressable>
      </Section>

      <Section title="Riego">
        {valves.length === 0 ? <Text style={styles.empty}>No hay válvulas configuradas.</Text> : <CommandPanel plotName={plot.name} valves={valves} commands={commands} role={activeMembership.role} onChanged={refresh} />}
      </Section>

      <Section title="Últimos comandos">
        {commands.length === 0 ? <Text style={styles.empty}>Todavía no se enviaron comandos.</Text> : commands.map((command) => <CommandRow key={command.id} command={command} />)}
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function CommandRow({ command }: { command: IrrigationCommand }) {
  const statusColor = command.status === 'applied' ? colors.optimal : command.status === 'failed' ? colors.dry : command.status === 'pending' ? colors.warning : colors.stale;
  const actionLabel = command.action === 'timed' ? `Regar ${command.duration_min} min` : command.action === 'open' ? 'Abrir' : 'Cerrar';
  return <View style={styles.commandRow}><View><Text style={styles.commandAction}>{actionLabel}</Text><Text style={styles.commandDate}>{new Date(command.created_at).toLocaleString('es-AR')}</Text>{command.failure_reason ? <Text style={styles.failure}>{command.failure_reason}</Text> : null}</View><Text style={[styles.commandStatus, { color: statusColor }]}>{command.status.toUpperCase()}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 42, gap: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: colors.ink, fontSize: 30, fontWeight: '900', marginTop: 2 },
  age: { color: colors.muted, marginTop: 4 },
  inlineError: { color: colors.dry, backgroundColor: colors.dangerSurface, borderRadius: 12, padding: 12 },
  suggestion: { color: colors.dry, backgroundColor: colors.dangerSurface, borderRadius: 12, padding: 12, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12 },
  metricValue: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 4 },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, gap: 12 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  points: { color: colors.muted, fontSize: 11, textAlign: 'right' },
  thresholdRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18 },
  stepper: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepperText: { color: colors.primary, fontSize: 27, fontWeight: '500' },
  thresholdValue: { alignItems: 'center', minWidth: 80 },
  thresholdNumber: { color: colors.ink, fontSize: 30, fontWeight: '900' },
  thresholdUnit: { color: colors.muted, fontSize: 11 },
  saveButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveButtonText: { color: 'white', fontWeight: '800' },
  disabled: { opacity: 0.45 },
  empty: { color: colors.muted, paddingVertical: 8 },
  commandRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 12 },
  commandAction: { color: colors.ink, fontWeight: '700' },
  commandDate: { color: colors.muted, fontSize: 11, marginTop: 3 },
  failure: { color: colors.dry, fontSize: 11, marginTop: 3 },
  commandStatus: { fontSize: 11, fontWeight: '900' },
});
