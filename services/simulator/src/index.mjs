import { Kafka, logLevel } from 'kafkajs';

// rf-08: por defecto se simulan dos estaciones; la tercera queda sin datos recientes.
const defaultStations = [
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
];
const stations = (process.env.SIMULATOR_STATION_IDS ?? defaultStations.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
if (stations.length === 0) throw new Error('SIMULATOR_STATION_IDS must contain at least one station UUID');

// la humedad de cada estación oscila cerca de un valor base conocido.
const baselines = new Map([
  ['30000000-0000-4000-8000-000000000001', 33],
  ['30000000-0000-4000-8000-000000000002', 18],
  ['30000000-0000-4000-8000-000000000003', 31],
]);
const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:19092').split(',');
const kafka = new Kafka({ clientId: 'agropulse-simulator', brokers, logLevel: logLevel.WARN, retry: { initialRetryTime: 1000, retries: 20 } });
const producer = kafka.producer({ allowAutoTopicCreation: true });
let stopped = false;

// mantiene un decimal en las mediciones ficticias.
function rounded(value) {
  return Math.round(value * 10) / 10;
}

// rf-08 y rf-24: publica una lectura nueva en el tema de humedad de redpanda.
async function produceTick() {
  const stationId = stations[Math.floor(Math.random() * stations.length)];
  const baseline = baselines.get(stationId) ?? 30;
  const payload = {
    station_id: stationId,
    moisture_pct: rounded(Math.max(0, Math.min(100, baseline + (Math.random() - 0.5) * 3))),
    temp_c: rounded(22 + Math.random() * 7),
    rain_mm: Math.random() < 0.08 ? rounded(Math.random() * 1.2) : 0,
    ts: new Date().toISOString(),
  };
  await producer.send({ topic: 'soil.moisture', messages: [{ key: stationId, value: JSON.stringify(payload) }] });
  console.info(`[simulator] produced station=${stationId} moisture=${payload.moisture_pct} ts=${payload.ts}`);
}

// genera una lectura cada tres a ocho segundos hasta que se detenga el proceso.
async function loop() {
  while (!stopped) {
    await produceTick();
    const delayMs = 3000 + Math.floor(Math.random() * 5001);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

// conecta el productor y libera la conexión al recibir una señal de cierre.
async function start() {
  await producer.connect();
  console.info(`[simulator] connected brokers=${brokers.join(',')} activeStations=${stations.join(',')}`);
  const stop = async () => {
    stopped = true;
    await producer.disconnect();
    process.exit(0);
  };
  process.on('SIGTERM', () => void stop());
  process.on('SIGINT', () => void stop());
  await loop();
}

start().catch((error) => {
  console.error('[simulator] fatal', error);
  process.exit(1);
});
