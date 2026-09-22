# Continuar AgroPulse en otra computadora

Este archivo es el punto de entrada para retomar el trabajo sin depender del historial del chat.

## Estado actual

El proyecto implementa el camino obligatorio del PRD:

- Expo SDK 57, React Native, TypeScript strict y Expo Router.
- Supabase Auth, Postgres, RLS y Realtime.
- Mapa con tres lotes, semáforo, GPS y punto-en-polígono.
- Lecturas, antigüedad, gráfico de seis horas y umbrales.
- Válvulas y comandos `pending → applied/failed`.
- Redpanda, simulador y worker.
- Alertas, historial y pantalla de diagnóstico.
- Seed, informe, checklist y guion de defensa.

Validaciones realizadas al 22 de septiembre de 2026:

- `npm run check`: correcto.
- 7 pruebas unitarias aprobadas.
- `npx expo install --check`: dependencias compatibles.
- Bundle Android/Hermes: generado correctamente.
- Docker Compose: configuración válida.
- Las imágenes Docker no se construyeron en la computadora original porque Docker Desktop no estaba iniciado.
- La integración real con Supabase queda pendiente hasta cargar credenciales propias.

## Clonar en la notebook

```bash
git clone https://github.com/nicoetchegoyen/TP4-AgroPulse.git
cd TP4-AgroPulse
npm install
```

Verificar inmediatamente:

```bash
npm run check
npx expo install --check
```

## Configuración privada

Los secretos no están en Git. Crear dos archivos locales.

### `.env`

Copiar `.env.example` a `.env` y completar:

```dotenv
SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
DEMO_PASSWORD=UNA_CONTRASEÑA_DEMO
KAFKA_BROKERS=redpanda-0:9092
KAFKA_GROUP_ID=agropulse-readings-worker
COMMAND_FAILURE_RATE=0.10
SIMULATOR_STATION_IDS=30000000-0000-4000-8000-000000000001,30000000-0000-4000-8000-000000000002
```

### `apps/agropulse/.env`

Copiar `apps/agropulse/.env.example` a `apps/agropulse/.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

Nunca colocar `SUPABASE_SERVICE_ROLE_KEY` dentro de `apps/agropulse`.

## Primera puesta en marcha

1. Crear o elegir un proyecto en Supabase.
2. Ejecutar `supabase/migrations/202609220001_initial_schema.sql`.
3. Ejecutar `supabase/seed.sql`.
4. Crear usuarios y membresías con `npm run seed:users`.
5. Iniciar Docker Desktop.
6. Ejecutar `npm run infra:up`.
7. Ejecutar `npm run app` o `npm run app:android`.

Los usuarios son:

- `productor@agropulse.test`
- `operador@agropulse.test`
- `asesor@agropulse.test`

La contraseña es el valor local de `DEMO_PASSWORD`.

## Qué hacer a continuación

Prioridad recomendada:

1. Conectar un proyecto real de Supabase y validar H1 de punta a punta.
2. Tomar una captura propia del flujo H1 y agregarla al informe.
3. Probar RLS con productor, operador y asesor.
4. Implementar lectura manual offline con `client_request_id`.
5. Implementar cancelación de comandos pending.
6. Implementar alta o edición simplificada de lotes.
7. Grabar el video de tres a cinco minutos.

## Comandos cotidianos

```bash
npm run check
npm run app
npm run infra:up
docker compose --env-file .env -f infra/docker-compose.yml logs -f simulator worker
npm run infra:down
```

## Flujo Git recomendado

Antes de trabajar:

```bash
git pull
```

Después de cada cambio estable:

```bash
git add .
git commit -m "Descripción breve del cambio"
git push
```

## Prompt para otro Codex

Copiar este texto en una nueva tarea desde la notebook:

> Leé `AGENTS.md`, `CONTINUAR.md`, `README.md` y `docs/checklist.md`. Continuá el proyecto AgroPulse respetando el PRD. Antes de cambiar código ejecutá `npm run check`. No coloques la service role en la app móvil. Trabajá sobre el próximo punto pendiente del checklist y verificá TypeScript, tests y bundle Android antes de terminar.
