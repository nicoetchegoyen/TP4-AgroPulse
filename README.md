# AgroPulse

Demo académica de agricultura de precisión: Expo + TypeScript + Supabase + Redpanda.

## Incluye

- Login persistente y tres roles.
- RLS por establecimiento.
- Mapa de polígonos, GPS y semáforo accesible.
- Lecturas Realtime y gráfico de seis horas.
- Umbrales por lote.
- Válvulas y comandos `pending → applied/failed`.
- Idempotencia y exclusión de comandos simultáneos.
- Alertas, historial y diagnóstico.
- Simulador y worker en Docker Compose.

## Requisitos

- Node.js 22.13 o superior.
- Docker Desktop.
- Un proyecto Supabase o Supabase CLI para ejecución local.
- Expo Go en Android, o un emulador Android.

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar Supabase

Crear un proyecto y copiar `.env.example` a `.env`. Completar:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_PASSWORD`

La service role es exclusiva de los procesos backend. Nunca debe copiarse dentro de `apps/agropulse`.

Para un proyecto remoto:

```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

Después ejecutar el contenido de `supabase/seed.sql` desde el SQL Editor, o usar el flujo local de Supabase:

```bash
npx supabase start
npx supabase db reset
```

Crear/actualizar los usuarios de prueba y sus membresías:

```bash
npm run seed:users
```

Usuarios:

- `productor@agropulse.test`
- `operador@agropulse.test`
- `asesor@agropulse.test`

Los tres usan el valor `DEMO_PASSWORD` definido localmente. No se versiona ninguna contraseña.

## 3. Configurar la app

Copiar `apps/agropulse/.env.example` a `apps/agropulse/.env` y completar:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
```

La clave publicable/anon puede vivir en el binario porque la autorización real está en RLS.

## 4. Iniciar telemetría y comandos

```bash
npm run infra:up
```

Servicios:

- Redpanda Kafka API: `localhost:19092`
- Redpanda Console: `http://localhost:8080`
- Simulador: publica cada 3 a 8 segundos.
- Worker: consume lecturas, procesa comandos cada medio segundo y revisa cada cinco segundos si terminó un riego temporizado. El plazo queda en Supabase y se recupera después de reiniciar el worker.

Ver los logs requeridos por RF-24:

```bash
docker compose --env-file .env -f infra/docker-compose.yml logs -f simulator worker
```

## 5. Iniciar la aplicación

```bash
npm run app
```

Escanear el QR con Expo Go o ejecutar:

```bash
npm run app:android
```

## Verificación

```bash
npm run check
```

El comando ejecuta TypeScript strict y los tests unitarios de la app y del cierre temporizado del worker.

## Datos de demostración

- Costa 1: óptimo.
- Costa 2: seco, para demostrar riego.
- Monte A: stale, porque el simulador no publica para esa estación por defecto.

Las coordenadas, los lotes y todas las mediciones son ficticios.

## Decisión de arquitectura

El móvil no consume Kafka. Usa Supabase Auth/Data API/Realtime. Redpanda permanece en backend para evitar credenciales de broker en el dispositivo, consumo persistente de red/batería, gestión de offsets, backpressure y problemas de conectividad móvil.

## Documentación de entrega

- `CONTINUAR.md`: memoria de continuidad y pasos para otra computadora.
- `AGENTS.md`: contexto técnico para continuar con Codex u otro agente.
- `docs/informe.md`: informe de arquitectura.
- `docs/checklist.md`: cumplimiento requisito por requisito.
- `docs/demo-script.md`: guion de defensa H1, H2, RF-16 y sensor stale.

## Detener infraestructura

```bash
npm run infra:down
```
