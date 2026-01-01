'use strict';

const crypto = require('crypto');
const backupController = require('../controllers/backup');
const backupJobsStore = require('./backupJobsStore');

let timer = null;

/**
 * Parse an integer env var safely.
 * @param {string|undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parseIntEnv(value, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Determines whether scheduled backups are enabled.
 *
 * Scheduled backups can be noisy for local development, so we make them opt-in.
 * Default: disabled unless BACKUP_SCHEDULER_ENABLED=true.
 *
 * @returns {boolean}
 */
function isEnabled() {
  return String(process.env.BACKUP_SCHEDULER_ENABLED || '').toLowerCase() === 'true';
}

/**
 * @returns {number} interval in ms
 */
function getIntervalMs() {
  // Default to 15 minutes when enabled unless overridden.
  return parseIntEnv(process.env.BACKUP_SCHEDULER_INTERVAL_MS, 15 * 60 * 1000);
}

/**
 * Runs a scheduled backup and records job history.
 * @returns {Promise<void>}
 */
async function runScheduledBackupOnce() {
  const jobId =
    typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  const timestamp = new Date().toISOString();

  try {
    const stored = await backupController.runBackupInternal({ trigger: 'scheduler' });

    backupJobsStore.addJob({
      id: jobId,
      timestamp,
      trigger: 'scheduler',
      status: 'success',
      backupId: stored.id,
    });
  } catch (err) {
    backupJobsStore.addJob({
      id: jobId,
      timestamp,
      trigger: 'scheduler',
      status: 'error',
      message: err && err.message ? err.message : 'Scheduled backup failed.',
    });
  }
}

/**
 * PUBLIC_INTERFACE
 * Starts the scheduled backup runner (no-op if disabled or already running).
 *
 * Env vars:
 * - BACKUP_SCHEDULER_ENABLED=true|false (default false)
 * - BACKUP_SCHEDULER_INTERVAL_MS (default 900000 = 15 minutes)
 *
 * @returns {void}
 */
function startBackupScheduler() {
  if (!isEnabled()) {
    return;
  }

  if (timer) {
    return;
  }

  const intervalMs = getIntervalMs();

  // Kick off a first run shortly after startup, then run periodically.
  timer = setInterval(() => {
    runScheduledBackupOnce().catch((e) => console.error('Scheduled backup run failed:', e));
  }, intervalMs);

  // Do not keep the Node process alive only because of this timer
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  // First run after a short delay (avoid startup contention)
  setTimeout(() => {
    runScheduledBackupOnce().catch((e) => console.error('Scheduled backup run failed:', e));
  }, 2_000).unref?.();
}

/**
 * PUBLIC_INTERFACE
 * Stops the scheduled backup runner.
 *
 * @returns {void}
 */
function stopBackupScheduler() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

module.exports = {
  startBackupScheduler,
  stopBackupScheduler,
};

