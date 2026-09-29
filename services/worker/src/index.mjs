import { Kafka, logLevel } from 'kafkajs';
import { createClient } from '@supabase/supabase-js';
import { isTimedIrrigationExpired } from './timed-irrigation.mjs';

// rnf-02: el worker usa la clave secreta solo en el servidor para escribir datos.
const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(',');
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID ?? 'agropulse-worker',
  brokers,
  logLevel: logLevel.WARN,
  retry: { initialRetryTime: 1000, retries: 20 },
});
const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID ?? 'agropulse-readings-worker' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const failureRate = Math.min(1, Math.max(0, Number(process.env.COMMAND_FAILURE_RATE ?? 0.1)));
const knownStations = new Set();
const processingCommands = new Set();
const processingValves = new Set();

// evita consultar la misma estación en la base por cada mensaje recibido.
async function stationExists(stationId) {
  if (knownStations.has(stationId)) return true;
  const { data, error } = await supabase.from('stations').select('id').eq('id', stationId).maybeSingle();
  if (error) throw error;
  if (data) knownStations.add(stationId);
  return Boolean(data);
}

// rf-08 y rf-24: valida una lectura del broker y la guarda en supabase.
async function ingestReading(message) {
  let payload;
  try {
    payload = JSON.parse(message.value?.toString() ?? '{}');
  } catch {
    console.warn('[consumer] discarded invalid JSON');
    return;
  }

  // descarta mensajes incompletos o de estaciones desconocidas.
  const { station_id: stationId, moisture_pct: moisture, temp_c: temperature, rain_mm: rain = 0, ts } = payload;
  if (!stationId || typeof moisture !== 'number' || typeof temperature !== 'number' || !ts) {
    console.warn('[consumer] discarded payload with missing fields', payload);
    return;
  }
  if (!(await stationExists(stationId))) {
    console.warn(`[consumer] unknown station ${stationId}; discarded`);
    return;
  }

  console.info(`[consumer] consumed station=${stationId} moisture=${moisture}`);
  const { error } = await supabase.from('readings').insert({
    station_id: stationId,
    measured_at: ts,
    moisture_pct: moisture,
    temp_c: temperature,
    rain_mm: rain,
    source: 'sensor',
  });
  if (error) throw error;
  console.info(`[consumer] upsert reading station=${stationId} ts=${ts}`);
}

// rf-15: simula el acuse de una orden y la marca como aplicada o fallida.
async function processCommand(command) {
  if (processingCommands.has(command.id) || processingValves.has(command.valve_id)) return;
  processingCommands.add(command.id);
  processingValves.add(command.valve_id);
  try {
    const delayMs = 1000 + Math.floor(Math.random() * 3001);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    // la falla simulada permite mostrar ambos resultados sin hardware real.
    const failed = Math.random() < failureRate;

    if (failed) {
      const { error } = await supabase
        .from('irrigation_commands')
        .update({ status: 'failed', failure_reason: 'valve_timeout', applied_at: new Date().toISOString() })
        .eq('id', command.id)
        .eq('status', 'pending');
      if (error) throw error;
      console.warn(`[commands] failed command=${command.id} reason=valve_timeout`);
      return;
    }

    // rf-14: una orden temporizada abre ahora; el sondeo la cierra al vencer.
    const nextValveStatus = command.action === 'close' ? 'closed' : 'open';
    const { error: valveError } = await supabase
      .from('valves')
      .update({ status: nextValveStatus })
      .eq('id', command.valve_id);
    if (valveError) throw valveError;

    const { error: commandError } = await supabase
      .from('irrigation_commands')
      .update({ status: 'applied', applied_at: new Date().toISOString(), failure_reason: null })
      .eq('id', command.id)
      .eq('status', 'pending');
    if (commandError) throw commandError;
    console.info(`[commands] applied command=${command.id} valve=${command.valve_id} status=${nextValveStatus}`);
  } catch (error) {
    console.error('[commands] processing error', error);
  } finally {
    processingCommands.delete(command.id);
    processingValves.delete(command.valve_id);
  }
}

// rf-14: consulta el último comando aplicado, así una orden nueva reemplaza el plazo anterior.
async function closeExpiredTimedValve(valve) {
  if (processingValves.has(valve.id)) return;
  processingValves.add(valve.id);
  try {
    const { data: latest, error: commandError } = await supabase
      .from('irrigation_commands')
      .select('id, action, status, duration_min, applied_at')
      .eq('valve_id', valve.id)
      .eq('status', 'applied')
      .order('applied_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (commandError) throw commandError;
    if (!isTimedIrrigationExpired(latest)) return;

    // la orden temporizada vive en postgres y permite retomar el plazo tras reiniciar.
    const { error: valveError } = await supabase
      .from('valves')
      .update({ status: 'closed' })
      .eq('id', valve.id)
      .eq('status', 'open');
    if (valveError) throw valveError;
    console.info(`[commands] timed irrigation ended command=${latest.id} valve=${valve.id}`);
  } catch (error) {
    console.error(`[commands] timed close error valve=${valve.id}`, error);
  } finally {
    processingValves.delete(valve.id);
  }
}

// rf-14: revisa válvulas abiertas cada cinco segundos y recupera plazos tras reiniciar.
async function pollTimedIrrigation() {
  const { data, error } = await supabase.from('valves').select('id').eq('status', 'open');
  if (error) {
    console.error('[commands] timed poll error', error.message);
    return;
  }
  for (const valve of data ?? []) void closeExpiredTimedValve(valve);
}

// rf-15: revisa órdenes pendientes y evita procesar dos veces la misma id.
async function pollCommands() {
  const { data, error } = await supabase
    .from('irrigation_commands')
    .select('id, valve_id, action, duration_min, status')
    .eq('status', 'pending')
    .order('created_at')
    .limit(10);
  if (error) {
    console.error('[commands] poll error', error.message);
    return;
  }
  for (const command of data ?? []) void processCommand(command);
}

// conecta el consumidor, inicia el sondeo de órdenes y cierra con limpieza.
async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'soil.moisture', fromBeginning: false });
  console.info(`[worker] connected brokers=${brokers.join(',')}`);
  const commandTimer = setInterval(() => void pollCommands(), 500);
  const timedTimer = setInterval(() => void pollTimedIrrigation(), 5000);
  void pollTimedIrrigation();

  const stop = async () => {
    clearInterval(commandTimer);
    clearInterval(timedTimer);
    await consumer.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void stop());
  process.on('SIGINT', () => void stop());

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        await ingestReading(message);
      } catch (error) {
        console.error('[consumer] insert failed', error);
        throw error;
      }
    },
  });
}

start().catch((error) => {
  console.error('[worker] fatal', error);
  process.exit(1);
});
