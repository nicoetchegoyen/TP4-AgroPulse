import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PlotSummary } from '@/types/domain';

// rf-04 y rf-10: entrega lotes de un establecimiento y los actualiza con realtime.
export function usePlotSummaries(organizationId?: string, screenKey = 'default') {
  const [plots, setPlots] = useState<PlotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRealtimeAt, setLastRealtimeAt] = useState<string | null>(null);

  // rnf-03: la vista ya trae la última lectura y el estado calculado de cada lote.
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

  // rnf-04: cada pantalla usa su propio canal y lo libera al desmontarse.
  useEffect(() => {
    void refresh();
    if (!organizationId) return;

    const channel = supabase
      .channel(`plot-dashboard-${organizationId}-${screenKey}`)
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
