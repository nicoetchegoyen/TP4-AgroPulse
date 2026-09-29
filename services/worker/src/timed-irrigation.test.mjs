import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTimedIrrigationExpired } from './timed-irrigation.mjs';

const started = '2026-01-01T12:00:00.000Z';
const timed = { action: 'timed', status: 'applied', duration_min: 15, applied_at: started };

// rf-14: el plazo empieza cuando el worker aplica la apertura, no cuando se pide.
test('cierra el riego temporizado al cumplirse la duración', () => {
  assert.equal(isTimedIrrigationExpired(timed, Date.parse(started) + 14 * 60_000), false);
  assert.equal(isTimedIrrigationExpired(timed, Date.parse(started) + 15 * 60_000), true);
});

// rf-14: una orden pendiente, fallida o posterior no activa el cierre anterior.
test('solo cierra si el último comando sigue siendo el temporizado aplicado', () => {
  const later = Date.parse(started) + 16 * 60_000;
  assert.equal(isTimedIrrigationExpired({ ...timed, status: 'pending' }, later), false);
  assert.equal(isTimedIrrigationExpired({ ...timed, status: 'failed' }, later), false);
  assert.equal(isTimedIrrigationExpired({ ...timed, action: 'open' }, later), false);
  assert.equal(isTimedIrrigationExpired({ ...timed, action: 'close' }, later), false);
});

// rf-14: si falta el momento o la duración, no se cierra una válvula por error.
test('ignora plazos incompletos o inválidos', () => {
  const later = Date.parse(started) + 16 * 60_000;
  assert.equal(isTimedIrrigationExpired({ ...timed, applied_at: null }, later), false);
  assert.equal(isTimedIrrigationExpired({ ...timed, duration_min: null }, later), false);
});
