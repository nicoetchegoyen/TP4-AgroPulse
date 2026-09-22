import { Kafka, logLevel } from 'kafkajs';
import { createClient } from '@supabase/supabase-js';

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

async function stationExists(stationId) {
  if (knownStations.has(stationId)) return true;
  const { data, error } = await supabase.from('stations').select('id').eq('id', stationId).maybeSingle();
  if (error) throw error;
  if (data) knownStations.add(stationId);
  return Boolean(data);
}

async function ingestReading(message) {
  let payload;
  try {
    payload = JSON.parse(message.value?.toString() ?? '{}');
  } catch {
    console.warn('[consumer] discarded invalid JSON');
    return;
  }

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

async function processCommand(command) {
  if (processingCommands.has(command.id)) return;
  processingCommands.add(command.id);
  try {
    const delayMs = 1000 + Math.floor(Math.random() * 3001);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
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
  }
}

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

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'soil.moisture', fromBeginning: false });
  console.info(`[worker] connected brokers=${brokers.join(',')}`);
  const commandTimer = setInterval(() => void pollCommands(), 500);

  const stop = async () => {
    clearInterval(commandTimer);
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
