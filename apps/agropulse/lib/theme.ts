// rf-12: estos colores mantienen el mismo significado de estado en toda la app.
export const colors = {
  background: '#F4F7F2',
  surface: '#FFFFFF',
  ink: '#173123',
  muted: '#607267',
  primary: '#176B45',
  primaryDark: '#0D4A30',
  border: '#D8E2DA',
  dry: '#C63C32',
  optimal: '#26834B',
  wet: '#2476B8',
  stale: '#667078',
  warning: '#B66A13',
  dangerSurface: '#FDECEA',
  successSurface: '#E6F5EB',
};

// rf-12: cada estado tiene un texto, un color y un símbolo para no depender solo del color.
export const statusMeta = {
  stale: { label: 'Sin datos', color: colors.stale, symbol: '—' },
  dry: { label: 'Seco', color: colors.dry, symbol: '!' },
  optimal: { label: 'Óptimo', color: colors.optimal, symbol: '✓' },
  wet: { label: 'Húmedo', color: colors.wet, symbol: '≈' },
} as const;
