import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { colors } from '@/lib/theme';

const roleLabel = { producer: 'Productor', operator: 'Operador de riego', advisor: 'Asesor' } as const;

export default function AccountScreen() {
  const { session, signOut } = useAuth();
  const { activeMembership } = useOrganization();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{session?.user.email?.slice(0, 1).toUpperCase() ?? 'U'}</Text></View>
      <Text style={styles.email}>{session?.user.email}</Text>
      <Text style={styles.role}>{activeMembership ? roleLabel[activeMembership.role] : 'Sin rol'}</Text>

      <View style={styles.card}>
        <Row label="Establecimiento" value={activeMembership?.organizations.name ?? 'Sin asignar'} />
        <Row label="Región" value={activeMembership?.organizations.region ?? '—'} />
        <Row label="Usuario ID" value={session?.user.id.slice(0, 13) ? `${session.user.id.slice(0, 13)}…` : '—'} />
      </View>

      <Pressable style={styles.menuItem} onPress={() => router.push('/diagnostics')}>
        <MaterialCommunityIcons name="stethoscope" color={colors.primary} size={24} />
        <View style={styles.menuText}><Text style={styles.menuTitle}>Diagnóstico</Text><Text style={styles.menuSubtitle}>Conexión, último tick y lag aparente</Text></View>
        <MaterialCommunityIcons name="chevron-right" color={colors.muted} size={24} />
      </Pressable>

      <Pressable style={styles.logout} onPress={() => void signOut()}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
      <Text style={styles.disclaimer}>Demo académica. Los datos de humedad y las ubicaciones son ficticios.</Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  avatarText: { color: 'white', fontSize: 28, fontWeight: '900' },
  email: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  role: { color: colors.primary, fontWeight: '700' },
  card: { width: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 16, gap: 15, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  rowLabel: { color: colors.muted },
  rowValue: { color: colors.ink, fontWeight: '700', flex: 1, textAlign: 'right' },
  menuItem: { width: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { flex: 1 },
  menuTitle: { color: colors.ink, fontWeight: '800' },
  menuSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  logout: { width: '100%', borderWidth: 1, borderColor: colors.dry, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  logoutText: { color: colors.dry, fontWeight: '800' },
  disclaimer: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
