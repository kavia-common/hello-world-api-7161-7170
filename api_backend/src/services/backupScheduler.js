'use strict';

const backupController = require('../controllers/backup');
const backupJobsStore = require('./backupJobsStore');

const DEFAULT_BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Parses BACKUP_INTERVAL_MS from environment.
 *
 * @returns {number} interval ms
 */
function resolveIntervalMs() {
  const raw = process.env.BACKUP_INTERVAL_MS;

  if (raw === undefined || raw === null || String(raw).trim() === '') return DEFAULT_BACKUP_INTERVAL_MS;

  const parsed = Number(String(raw).trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(
      `backupScheduler: invalid BACKUP_INTERVAL_MS="${raw}". Falling back to default ${DEFAULT_BACKUP_INTERVAL_MS}ms.`
    );
    return DEFAULT_BACKUP_INTERVAL_MS;
  }

  return parsed;
}

/**
 * Executes a scheduler-triggered backup.
 *
 * @returns {Promise<void>}
 */
async function runScheduledBackupOnce() {
  const run = backupJobsStore.startRun({ trigger: 'scheduler' });
  console.log(`backupScheduler: run ${run.id} started at ${run.startedAt}`);

  try {
    const stored = await backupController.runBackupInternal({
      // No authenticated user in scheduler context.
      user: { sub: 'system', role: 'system' },
      trigger: 'scheduler',
    });

    backupJobsStore.finishRunSuccess(run.id, { backup: stored });
    console.log(
      `backupScheduler: run ${run.id} completed successfully (backupId=${stored.id}) at ${new Date().toISOString()}`
    );
  } catch (err) {
    backupJobsStore.finishRunError(run.id, err);
    console.error(`backupScheduler: run ${run.id} failed:`, err);
  }
}

/**
 * PUBLIC_INTERFACE
 * Starts periodic backup scheduling (setInterval-based).
 *
 * Environment variables:
 * - BACKUP_INTERVAL_MS (optional): interval in milliseconds. Defaults to 6 hours.
 *
 * Notes:
 * - This uses internal controller logic and does NOT make HTTP calls.
 * - To disable, set BACKUP_INTERVAL_MS to 0 or a negative value (not recommended); prefer not setting scheduler start.
 *
 * @returns {{ stop: () => void, intervalMs: number }} scheduler handle
 */
function startBackupScheduler() {
  const intervalMs = resolveIntervalMs();

  console.log(`backupScheduler: enabled; interval=${intervalMs}ms`);

  // Kick off after the first interval; keeps startup fast/predictable.
  const timer = setInterval(() => {
    // Avoid overlapping runs if a backup takes longer than the interval.
    // Simple lock: if last run is running, skip this tick.
    const runs = backupJobsStore.listRuns();
    if (runs.length > 0 && runs[0].status === 'running') {
      console.warn('backupScheduler: previous run still running; skipping this tick');
      return;
    }

    runScheduledBackupOnce().catch((err) => {
      // This should be rare because runScheduledBackupOnce already catches,
      // but keep defensive logging.
      console.error('backupScheduler: unexpected scheduler error:', err);
    });
  }, intervalMs);

  // Prevent timer from keeping Node alive if nothing else is running (useful in tests).
  if (typeof timer.unref === 'function') timer.unref();

  return {
    intervalMs,
    stop: () => clearInterval(timer),
  };
}

module.exports = {
  startBackupScheduler,
};

