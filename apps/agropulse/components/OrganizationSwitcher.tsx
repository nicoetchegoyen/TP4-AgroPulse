import { ScrollView, Pressable, StyleSheet, Text } from 'react-native';
import { useOrganization } from '@/contexts/OrganizationContext';
import { colors } from '@/lib/theme';

export function OrganizationSwitcher() {
  const { memberships, activeMembership, selectOrganization } = useOrganization();
  if (memberships.length <= 1) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {memberships.map((membership) => {
        const selected = membership.organization_id === activeMembership?.organization_id;
        return (
          <Pressable
            key={membership.organization_id}
            onPress={() => selectOrganization(membership.organization_id)}
            style={[styles.pill, selected && styles.selected]}
          >
            <Text style={[styles.text, selected && styles.selectedText]}>{membership.organizations.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.surface },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.ink, fontWeight: '600' },
  selectedText: { color: 'white' },
});
