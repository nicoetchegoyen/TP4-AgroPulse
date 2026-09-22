# AgroPulse - Informe de arquitectura

## 1. Resumen

AgroPulse es una demostración académica de agricultura de precisión construida con React Native y Expo. Permite consultar lotes georreferenciados, observar telemetría simulada, configurar umbrales de humedad y emitir órdenes de riego con confirmación asíncrona. No se presenta como un sistema productivo ni utiliza mediciones reales.

La solución separa explícitamente tres fronteras: el dispositivo móvil, Supabase como fuente de verdad y el bus de eventos de backend. Esa separación permite demostrar autenticación, autorización con Row Level Security, datos geográficos, series temporales, Realtime y procesamiento event-driven sin exponer Kafka al cliente móvil.

## 2. Arquitectura

```text
┌──────────────┐       Auth / REST / Realtime       ┌──────────────┐
│ App Expo     │ ◄─────────────────────────────────► │ Supabase     │
│ Android/iOS  │                                     │ Auth + PG    │
└──────────────┘                                     └──────▲───────┘
                                                               │ service role
┌──────────────┐       soil.moisture       ┌──────────────┐     │
│ Simulador    │ ─────────────────────────► │ Redpanda     │ ─► Worker
└──────────────┘                            └──────────────┘
```

La app utiliza la clave pública de Supabase y el JWT del usuario. El worker y la herramienta de seed usan la service role exclusivamente en backend. El simulador publica eventos `soil.moisture`; el worker valida la estación y escribe la lectura en Postgres. Supabase Realtime distribuye el cambio a los clientes autorizados.

Los comandos siguen un patrón de bandeja de salida simplificado. La app inserta una fila `pending`, protegida por RLS e idempotencia. El worker consulta comandos pendientes, espera entre uno y cuatro segundos, modifica la válvula y marca el comando como `applied` o `failed`. Este camino satisface el requisito obligatorio sin convertir el topic opcional `irrigation.commands` en una dependencia para la demo.

## 3. Modelo y seguridad

`organizations` representa el establecimiento y `memberships` vincula usuarios con roles. Cada lote pertenece a una organización; estaciones y válvulas heredan ese perímetro a través del lote. Las lecturas pertenecen a una estación y los comandos a una válvula.

Las funciones `has_membership` y `has_role` centralizan las decisiones de autorización. Todas las tablas de dominio tienen RLS habilitado:

- Todo miembro puede leer los datos de su organización.
- Productores y operadores pueden modificar umbrales y emitir comandos.
- El asesor solo puede leer.
- Las lecturas `sensor` se escriben únicamente con service role.
- Las lecturas manuales, cuando se implemente el flujo offline, solo podrán usar `source = manual`.

La UI deshabilita acciones no permitidas para mejorar la experiencia, pero no se la considera un control de seguridad. Un asesor que intente insertar directamente recibe un rechazo de Postgres.

La unicidad de `client_request_id` hace idempotentes los comandos. Un índice parcial único sobre `valve_id where status = 'pending'` impide que dos clientes creen simultáneamente comandos pendientes para la misma válvula.

## 4. Semáforo y datos temporales

El estado se calcula con la misma prioridad documentada por el PRD:

1. `stale`: no existe lectura o tiene más de quince minutos.
2. `dry`: la humedad es menor al mínimo.
3. `optimal`: se encuentra entre mínimo y máximo, ambos inclusive.
4. `wet`: supera el máximo.

La vista `plot_summaries` ejecuta el cálculo en Postgres y selecciona la última lectura mediante un lateral join. El cliente contiene la misma función pura para pruebas y comportamiento local coherente. El índice `(station_id, measured_at desc)` evita recorrer toda la serie para recuperar el último dato.

El detalle obtiene seis horas de lecturas, las ordena cronológicamente y dibuja una línea con los umbrales mínimo y máximo. Cada inserción en `readings` genera un evento Realtime y actualiza mapa, tarjeta y gráfico sin reiniciar la aplicación.

## 5. Por qué el móvil no usa Kafka

Un broker está optimizado para consumidores administrados y conexiones relativamente estables. En una red móvil aparecen reconexiones frecuentes, cambios de IP, suspensión de procesos y consumo de batería. Entregar credenciales del broker a cada teléfono amplía la superficie de ataque y dificulta revocación y rotación. También obliga a que la app gestione offsets, backpressure, compatibilidad de esquemas y errores de consumo.

Supabase ofrece una frontera más adecuada para el dispositivo: JWT por usuario, RLS en la fuente de verdad, consultas HTTP y Realtime. Redpanda conserva su función de desacoplar productores y consumidores dentro del backend. El worker absorbe diferencias de protocolo, valida contratos y decide cómo persistir cada evento.

## 6. Estados de interfaz y accesibilidad

Las pantallas incluyen carga inicial, estado vacío, error recuperable y comando en vuelo. El semáforo no depende únicamente del color: cada estado muestra texto y símbolo. Los botones respetan el rol y el comando pendiente. La denegación del permiso GPS no bloquea ni cierra la app.

La navegación principal usa las pestañas Mapa, Lotes, Alertas y Cuenta. Desde mapa o lista se accede al detalle. Cuenta expone el rol, establecimiento y pantalla de diagnóstico. La pantalla Diagnóstico muestra usuario, organización, último tick y lag aparente.

## 7. Reproducción y pruebas

El repositorio incluye migración, seed estable, tres usuarios de demostración, Docker Compose, simulador y worker. Las pruebas unitarias cubren los límites del semáforo, la prioridad stale y la función punto-en-polígono. Las restricciones SQL cubren duración de riego, idempotencia y exclusión de comandos pendientes duplicados.

Para la defensa se mantiene Monte A fuera de la lista de estaciones activas. Costa 1 permanece en rango óptimo y Costa 2 por debajo del umbral. Esto vuelve determinista el happy path sin depender del azar del simulador.

## 8. Limitaciones y próximos pasos

La lectura manual offline, la edición de polígonos y la cancelación de comandos son requisitos Should que quedan documentados, pero fuera del camino crítico. Para una versión productiva también serían necesarios gestión formal de secretos, observabilidad centralizada, retención por particiones, alertas derivadas automáticamente, cierre programado del riego temporizado y calibración por tipo de suelo y sensor.

Antes de entregar el informe final debe agregarse una captura propia del recorrido H1 ejecutado contra el proyecto Supabase elegido. No se incluye una captura artificial porque sería evidencia inválida.
