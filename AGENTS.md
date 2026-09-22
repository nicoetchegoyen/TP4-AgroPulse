# AgroPulse - contexto para agentes

## Objetivo

Implementar el TP4 AgroPulse como demo académica reproducible. La app móvil permite visualizar lotes y telemetría simulada y emitir comandos de riego con acuse asíncrono.

## Arquitectura que debe preservarse

```text
Simulator -> Redpanda -> Worker -> Supabase -> Realtime -> Expo app
                                      ^
                         irrigation_commands pending
```

- El móvil nunca se conecta a Kafka/Redpanda.
- La app usa únicamente URL y clave pública de Supabase.
- La service role solo puede existir en worker, admin y variables backend.
- Supabase/Postgres es la fuente de verdad.
- SQL y nombres internos en inglés; interfaz en español.
- Los datos geográficos y agronómicos son ficticios.

## Reglas del dominio

- Prioridad de estado: `stale`, `dry`, `optimal`, `wet`.
- Stale significa sin lectura o lectura mayor a 15 minutos.
- Defaults de humedad: mínimo 25 %, máximo 45 %.
- Un asesor es estrictamente read-only.
- Solo productor u operador pueden emitir comandos.
- No puede existir más de un comando pending por válvula.
- Cada comando debe llevar `client_request_id` UUID único.
- El worker debe resolver un comando en menos de cinco segundos para la demo.

## Verificación obligatoria

Antes de entregar cambios ejecutar:

```bash
npm run check
npx expo install --check
npx expo export --platform android --output-dir dist
docker compose --env-file .env.example -f infra/docker-compose.yml config --quiet
```

No usar `npm audit fix --force`: actualmente propone bajar Expo a una versión incompatible. Revisar actualizaciones del SDK de manera coordinada.

## Archivos clave

- `README.md`: instalación y operación.
- `CONTINUAR.md`: handoff para otra computadora.
- `docs/checklist.md`: alcance implementado y pendiente.
- `docs/informe.md`: informe académico.
- `supabase/migrations/202609220001_initial_schema.sql`: modelo y RLS.
- `supabase/seed.sql`: datos deterministas.
- `services/worker/src/index.mjs`: ingestión y comandos.
- `services/simulator/src/index.mjs`: telemetría.
- `apps/agropulse`: aplicación Expo.

## Pendientes conocidos

- Conexión y prueba contra un proyecto Supabase real.
- Lectura manual offline y sincronización idempotente.
- Cancelación de comandos pending.
- Alta/edición simplificada de lotes.
- Captura real del flujo H1 para el informe.
- Video o defensa de tres a cinco minutos.
