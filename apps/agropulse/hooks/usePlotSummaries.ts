import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlotSummary } from '@/types/domain';

export function usePlotSummaries(organizationId?: string) {
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRealtimeAt, setLastRealtimeAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!organizationId) {
      setPlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from('plot_summaries')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');
    if (queryError) setError(queryError.message);
    else {
      setPlots((data ?? []) as PlotSummary[]);
      setError(null);
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void refresh();
    if (!organizationId) return;

    const channel = supabase
      .channel(`plot-dashboard-${organizationId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'readings' }, () => {
        setLastRealtimeAt(new Date().toISOString());
        void refresh();
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'plots', filter: `organization_id=eq.${organizationId}` },
        () => void refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, refresh]);

  return { plots, loading, error, lastRealtimeAt, refresh };
}
