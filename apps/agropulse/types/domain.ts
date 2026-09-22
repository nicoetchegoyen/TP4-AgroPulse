export type UserRole = 'producer' | 'operator' | 'advisor';
export type PlotStatus = 'stale' | 'dry' | 'optimal' | 'wet';
export type ValveStatus = 'open' | 'closed';
export type CommandStatus = 'pending' | 'applied' | 'failed' | 'cancelled';

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface Organization {
  id: string;
  name: string;
  region: string;
}

export interface Membership {
  organization_id: string;
  role: UserRole;
  organizations: Organization;
}

export interface PlotSummary {
  id: string;
  organization_id: string;
  name: string;
  crop: string | null;
  geom: GeoJsonPolygon;
  threshold_min: number;
  threshold_max: number;
  station_id: string | null;
  measured_at: string | null;
  moisture_pct: number | null;
  temp_c: number | null;
  rain_mm: number | null;
  status: PlotStatus;
}

export interface Reading {
  id: string;
  station_id: string;
  measured_at: string;
  moisture_pct: number;
  temp_c: number;
  rain_mm: number | null;
  source: 'sensor' | 'manual';
}

export interface Valve {
  id: string;
  plot_id: string;
  name: string;
  status: ValveStatus;
}

export interface IrrigationCommand {
  id: string;
  valve_id: string;
  requested_by: string;
  action: 'open' | 'close' | 'timed';
  duration_min: number | null;
  status: CommandStatus;
  failure_reason: string | null;
  client_request_id: string;
  created_at: string;
  applied_at: string | null;
}

export interface AlertItem {
  id: string;
  plot_id: string;
  type: 'dry' | 'stale';
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  plots?: { name: string } | null;
}
