import { describe, expect, it } from 'vitest';
import { isPointInsidePolygon } from '../lib/geo';

const square = {
  type: 'Polygon' as const,
  coordinates: [[
    [-58.02, -31.4],
    [-58.01, -31.4],
    [-58.01, -31.39],
    [-58.02, -31.39],
    [-58.02, -31.4],
  ]],
};

describe('isPointInsidePolygon', () => {
  it('detects a point inside the plot', () => {
    expect(isPointInsidePolygon({ longitude: -58.015, latitude: -31.395 }, square)).toBe(true);
  });

  it('rejects a point outside the plot', () => {
    expect(isPointInsidePolygon({ longitude: -58.05, latitude: -31.395 }, square)).toBe(false);
  });
});
