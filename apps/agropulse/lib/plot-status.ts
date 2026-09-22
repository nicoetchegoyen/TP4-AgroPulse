import type { PlotStatus } from '@/types/domain';

export const STALE_AFTER_MS = 15 * 60 * 1000;

interface StatusInput {
  measuredAt: string | Date | null;
  moisturePct: number | null;
  thresholdMin?: number;
  thresholdMax?: number;
  now?: Date;
}

export function computePlotStatus({
  measuredAt,
  moisturePct,
  thresholdMin = 25,
  thresholdMax = 45,
  now = new Date(),
}: StatusInput): PlotStatus {
  if (!measuredAt || moisturePct === null) return 'stale';

  const measured = new Date(measuredAt);
  if (Number.isNaN(measured.getTime()) || now.getTime() - measured.getTime() > STALE_AFTER_MS) {
    return 'stale';
  }
  if (moisturePct < thresholdMin) return 'dry';
  if (moisturePct <= thresholdMax) return 'optimal';
  return 'wet';
}

export function formatAge(value: string | null, now = new Date()): string {
  if (!value) return 'sin lecturas';
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}
