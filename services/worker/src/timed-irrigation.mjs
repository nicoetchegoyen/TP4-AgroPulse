// rf-14: decide si el último comando aplicado ya cumplió su tiempo de riego.
export function isTimedIrrigationExpired(command, now = Date.now()) {
  if (command?.action !== 'timed' || command.status !== 'applied') return false;
  if (!Number.isInteger(command.duration_min) || command.duration_min < 1) return false;
  const appliedAt = Date.parse(command.applied_at ?? '');
  return Number.isFinite(appliedAt) && now >= appliedAt + command.duration_min * 60_000;
}
