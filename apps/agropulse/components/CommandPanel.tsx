import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { IrrigationCommand, UserRole, Valve } from '@/types/domain';

interface Props {
  plotName: string;
  valves: Valve[];
  commands: IrrigationCommand[];
  role: UserRole;
  onChanged: () => Promise<void>;
}

export function CommandPanel({ plotName, valves, commands, role, onChanged }: Props) {
  const { session } = useAuth();
  const [duration, setDuration] = useState(30);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const canCommand = role === 'producer' || role === 'operator';

  const submit = async (valve: Valve, action: 'open' | 'close' | 'timed') => {
    if (!session || !canCommand || submitting) return;
    const pending = commands.some((command) => command.valve_id === valve.id && command.status === 'pending');
    if (pending) {
      Alert.alert('Comando pendiente', 'Esperá el acuse del comando actual antes de enviar otro.');
      return;
    }

    Alert.alert(
      'Confirmar comando',
      `${plotName} · ${valve.name}\n${action === 'timed' ? `Abrir durante ${duration} minutos` : action === 'open' ? 'Abrir válvula' : 'Cerrar válvula'}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setSubmitting(valve.id);
            const { error } = await supabase.from('irrigation_commands').insert({
              valve_id: valve.id,
              requested_by: session.user.id,
              action,
              duration_min: action === 'timed' ? duration : null,
              status: 'pending',
              client_request_id: Crypto.randomUUID(),
            });
            setSubmitting(null);
            if (error) Alert.alert('No se pudo enviar', error.message);
            else await onChanged();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.stack}>
      {!canCommand ? <Text style={styles.readOnly}>Tu rol de asesor es de solo lectura.</Text> : null}
      {valves.map((valve) => {
        const pending = commands.find((command) => command.valve_id === valve.id && command.status === 'pending');
        return (
          <View key={valve.id} style={styles.card}>
            <View style={styles.topRow}>
              <View>
                <Text style={styles.valveName}>{valve.name}</Text>
                <Text style={styles.valveStatus}>Estado: {valve.status === 'open' ? 'abierta' : 'cerrada'}</Text>
              </View>
              {pending ? <Text style={styles.pending}>EN PROCESO</Text> : null}
            </View>
            <View style={styles.durationRow}>
              {[15, 30, 60].map((value) => (
                <Pressable key={value} onPress={() => setDuration(value)} style={[styles.duration, duration === value && styles.durationSelected]}>
                  <Text style={[styles.durationText, duration === value && styles.durationTextSelected]}>{value} min</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.actions}>
              <Action label="Abrir" disabled={!canCommand || Boolean(pending)} onPress={() => void submit(valve, 'open')} />
              <Action label={`Regar ${duration} min`} primary disabled={!canCommand || Boolean(pending)} onPress={() => void submit(valve, 'timed')} />
              <Action label="Cerrar" disabled={!canCommand || Boolean(pending)} onPress={() => void submit(valve, 'close')} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Action({ label, onPress, disabled, primary }: { label: string; onPress: () => void; disabled: boolean; primary?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.action, primary && styles.actionPrimary, disabled && styles.disabled]}>
      <Text style={[styles.actionText, primary && styles.actionPrimaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  readOnly: { backgroundColor: '#FFF4E5', color: colors.warning, padding: 12, borderRadius: 12, fontWeight: '600' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, gap: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  valveName: { fontSize: 17, fontWeight: '800', color: colors.ink },
  valveStatus: { color: colors.muted, marginTop: 3 },
  pending: { color: colors.warning, fontWeight: '800', fontSize: 11 },
  durationRow: { flexDirection: 'row', gap: 8 },
  duration: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  durationSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  durationText: { color: colors.ink, fontWeight: '600' },
  durationTextSelected: { color: 'white' },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  actionPrimary: { backgroundColor: colors.primary },
  actionText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
  actionPrimaryText: { color: 'white' },
  disabled: { opacity: 0.4 },
});
