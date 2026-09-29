// rf-02 y rf-12: estos tipos limitan los roles y estados a los valores permitidos por el sistema.
export type UserRole = 'producer' | 'operator' | 'advisor';
export type PlotStatus = 'stale' | 'dry' | 'optimal' | 'wet';
export type ValveStatus = 'open' | 'closed';
export type CommandStatus = 'pending' | 'applied' | 'failed' | 'cancelled';

// rf-05: el polígono sigue el formato geojson que usa el mapa.
export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

// rf-02 y rf-03: la membresía une a un usuario con un establecimiento y un rol.
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

// rf-04 y rf-09: el resumen combina datos del lote con su última medición y estado.
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

// rf-08 y rf-10: cada lectura guarda humedad, temperatura, lluvia y origen.
export interface Reading {
  id: string;
  station_id: string;
  measured_at: string;
  moisture_pct: number;
  temp_c: number;
  rain_mm: number | null;
  source: 'sensor' | 'manual';
}

// rf-13 a rf-16: las válvulas y los comandos representan el ciclo de riego.
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

// rf-19 y rf-20: las alertas registran sequía o falta de datos recientes.
export interface AlertItem {
  id: string;
  plot_id: string;
  type: 'dry' | 'stale';
  payload: Record<string, unknown>;
  created_at: string;
  read_at: string | null;
  plots?: { name: string } | null;
}
