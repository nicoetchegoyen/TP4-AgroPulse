import type { GeoJsonPolygon } from '@/types/domain';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export function polygonCoordinates(geometry: GeoJsonPolygon): Coordinate[] {
  return (geometry.coordinates[0] ?? []).map(([longitude = 0, latitude = 0]) => ({
    latitude,
    longitude,
  }));
}

export function isPointInsidePolygon(point: Coordinate, geometry: GeoJsonPolygon): boolean {
  const ring = polygonCoordinates(geometry);
  if (ring.length < 3) return false;

  let inside = false;
  for (let current = 0, previous = ring.length - 1; current < ring.length; previous = current++) {
    const a = ring[current];
    const b = ring[previous];
    if (!a || !b) continue;

    const crossesLatitude = a.latitude > point.latitude !== b.latitude > point.latitude;
    const boundaryLongitude =
      ((b.longitude - a.longitude) * (point.latitude - a.latitude)) /
        (b.latitude - a.latitude || Number.EPSILON) +
      a.longitude;

    if (crossesLatitude && point.longitude < boundaryLongitude) inside = !inside;
  }
  return inside;
}
