# Checklist de cumplimiento

## Must funcionales

- [x] RF-01: login, logout y persistencia de sesión con Supabase Auth.
- [x] RF-02: aislamiento por organización mediante RLS.
- [x] RF-03: selector cuando existe más de una membresía.
- [x] RF-04: lista de lotes con cultivo y estado; seed con tres lotes.
- [x] RF-05: mapa con polígonos y acceso al detalle.
- [x] RF-06: GPS y prueba punto-en-polígono, con manejo de permiso denegado.
- [x] RF-08: al menos una estación por lote y telemetría simulada.
- [x] RF-09: última lectura, antigüedad y estado stale después de 15 minutos.
- [x] RF-10: gráfico de seis horas y actualización por Realtime.
- [x] RF-11: umbral mínimo editable y persistente.
- [x] RF-12: semáforo según prioridad stale, dry, optimal, wet.
- [x] RF-13: válvulas por lote.
- [x] RF-14: comandos abrir, cerrar y riego temporizado de 1 a 120 minutos.
- [x] RF-15: worker aplica o falla comandos en uno a cuatro segundos; UI por Realtime.
- [x] RF-16: índice parcial evita dos comandos pending para una válvula.
- [x] RF-23: pantalla Diagnóstico.
- [x] RF-24: logs produced, consumed y upsert reading.

## Should implementados

- [x] RF-18: últimos veinte comandos en el detalle.
- [x] RF-19 y RF-20: inbox de alertas dry y stale.
- [x] RF-22: sugerencia fija cuando la humedad está bajo el umbral.
- [x] RNF-08: tests unitarios de semáforo y geometría.

## Should pendientes

- [ ] RF-07: alta o edición de polígonos.
- [ ] RF-17: cancelación de comandos pending.
- [ ] RF-21: lectura manual offline con sincronización idempotente.
- [ ] RNF-07: cola offline de 30 segundos.

## No funcionales obligatorios

- [x] RNF-01: Expo SDK 57, TypeScript strict y Expo Router.
- [x] RNF-02: solo clave pública en el móvil; service role exclusiva de worker/admin.
- [x] RNF-03: vista `plot_summaries`, índices y seed pequeño para arranque rápido.
- [x] RNF-04: Realtime sobre readings, valves y irrigation_commands.
- [x] RNF-05: errores y 401/403 terminan el estado de carga.
- [x] RNF-06: ejemplos de entorno, Compose, seed y usuarios de prueba.
- [x] RNF-10: aviso visible de datos ficticios.
