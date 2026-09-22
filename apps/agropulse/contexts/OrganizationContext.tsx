import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Membership } from '@/types/domain';

interface OrganizationValue {
  memberships: Membership[];
  activeMembership: Membership | null;
  loading: boolean;
  error: string | null;
  selectOrganization: (organizationId: string) => void;
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationValue | null>(null);

export function OrganizationProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!session) {
      setMemberships([]);
      setActiveOrganizationId(null);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('memberships')
      .select('organization_id, role, organizations(id, name, region)')
      .eq('user_id', session.user.id);

    if (queryError) setError(queryError.message);
    else {
      const next = (data ?? []).map((item) => ({
        ...item,
        organizations: Array.isArray(item.organizations)
          ? item.organizations[0]
          : item.organizations,
      })) as Membership[];
      setMemberships(next);
      setActiveOrganizationId((current) => current ?? next[0]?.organization_id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, [session?.user.id]);

  const activeMembership =
    memberships.find((membership) => membership.organization_id === activeOrganizationId) ?? null;

  const value = useMemo<OrganizationValue>(
    () => ({
      memberships,
      activeMembership,
      loading,
      error,
      selectOrganization: setActiveOrganizationId,
      refresh,
    }),
    [activeMembership, error, loading, memberships],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used inside OrganizationProvider');
  return context;
}
