import { describe, expect, it } from 'vitest';
import { computePlotStatus } from '../lib/plot-status';

// rnf-08: verifica la prioridad entre datos viejos, humedad baja, normal y alta.
const now = new Date('2026-09-22T12:00:00.000Z');

describe('computePlotStatus', () => {
  it('prioritizes stale over the moisture value', () => {
    expect(computePlotStatus({ measuredAt: '2026-09-22T11:44:59.000Z', moisturePct: 10, now })).toBe('stale');
  });

  it('marks missing readings as stale', () => {
    expect(computePlotStatus({ measuredAt: null, moisturePct: null, now })).toBe('stale');
  });

  it('marks moisture below minimum as dry', () => {
    expect(computePlotStatus({ measuredAt: '2026-09-22T11:59:00.000Z', moisturePct: 24.9, now })).toBe('dry');
  });

  it('includes threshold bounds in optimal', () => {
    expect(computePlotStatus({ measuredAt: '2026-09-22T11:59:00.000Z', moisturePct: 25, now })).toBe('optimal');
    expect(computePlotStatus({ measuredAt: '2026-09-22T11:59:00.000Z', moisturePct: 45, now })).toBe('optimal');
  });

  it('marks moisture over maximum as wet', () => {
    expect(computePlotStatus({ measuredAt: '2026-09-22T11:59:00.000Z', moisturePct: 45.1, now })).toBe('wet');
  });
});
