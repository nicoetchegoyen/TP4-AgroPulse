# Guion de defensa

## Preparación

1. Iniciar Supabase y ejecutar migraciones/seed.
2. Crear los tres usuarios con `npm run seed:users`.
3. Iniciar `npm run infra:up` y dejar visibles los logs.
4. Iniciar la app en Android con `npm run app:android`.
5. Mantener Monte A fuera de `SIMULATOR_STATION_IDS` para que permanezca stale.

## H1 - Productor

1. Ingresar como `productor@agropulse.test`.
2. Mostrar el mapa: Costa 1 verde, Costa 2 rojo y Monte A gris.
3. Entrar a Costa 2 y señalar humedad menor al umbral.
4. Elegir Válvula Principal y “Regar 30 min”.
5. Confirmar que aparece `pending`.
6. En los logs, señalar el procesamiento del worker.
7. Antes de cinco segundos, confirmar `applied` y válvula abierta sin reiniciar la app.

## H2 - Asesor

1. Cerrar sesión e ingresar como `asesor@agropulse.test`.
2. Mostrar que mapa, lecturas y gráfico son visibles.
3. Mostrar el aviso “solo lectura” y los controles de riego deshabilitados.
4. Explicar que la UI ayuda, pero RLS es la barrera real.

## RF-16 - Duplicado pendiente

1. Volver al usuario productor.
2. Enviar un comando y tocar nuevamente antes del acuse.
3. Mostrar el mensaje de comando pendiente.
4. Explicar que el índice parcial `one_pending_command_per_valve` también impide la carrera desde dos dispositivos.

## Sensor caído

1. Abrir Monte A.
2. Mostrar que la lectura tiene más de quince minutos y el estado es “Sin datos”.
3. Destacar que stale tiene prioridad: el lote no se presenta como seco.

## Arquitectura

Explicar que el teléfono consume Supabase Auth, Data API y Realtime. Redpanda queda en backend porque una conexión Kafka móvil complica autenticación, consumo energético, backpressure, evolución del esquema y operación en redes intermitentes.
