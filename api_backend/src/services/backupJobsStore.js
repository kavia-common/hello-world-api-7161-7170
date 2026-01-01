'use strict';

/**
 * In-memory store for backup job runs.
 *
 * Notes:
 * - Data resets whenever the server restarts.
 * - Stores only a bounded number of recent runs to avoid unbounded memory usage.
 */

/** @typedef {'running'|'success'|'error'} BackupJobStatus */

/**
 * @typedef {object} BackupJobRun
 * @property {string} id Unique run id
 * @property {string} startedAt ISO timestamp
 * @property {string=} finishedAt ISO timestamp
 * @property {BackupJobStatus} status Run status
 * @property {string=} trigger 'scheduler' | 'api' | other
 * @property {number=} durationMs Duration in ms
 * @property {{ id: string, timestamp: string }=} backup Resulting backup metadata when successful
 * @property {string=} error Error message (sanitized) when failed
 */

const crypto = require('crypto');

/** @type {BackupJobRun[]} */
const runs = [];

// Keep the last N runs. Reasonable default for debugging/visibility.
const MAX_RUNS = 50;

/**
 * Generates a stable, unique run id.
 *
 * @returns {string}
 */
function generateRunId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

/**
 * PUBLIC_INTERFACE
 * Adds a new run entry (status=running) and returns it.
 *
 * @param {{ trigger?: string }} options
 * @returns {BackupJobRun}
 */
function startRun(options = {}) {
  const run = {
    id: generateRunId(),
    startedAt: new Date().toISOString(),
    status: 'running',
    trigger: typeof options.trigger === 'string' ? options.trigger : undefined,
  };

  runs.unshift(run);
  if (runs.length > MAX_RUNS) runs.length = MAX_RUNS;

  return run;
}

/**
 * PUBLIC_INTERFACE
 * Marks a run as successful and records output metadata.
 *
 * @param {string} runId
 * @param {{ backup: { id: string, timestamp: string } }} result
 * @returns {BackupJobRun|undefined}
 */
function finishRunSuccess(runId, result) {
  const run = runs.find((r) => r.id === runId);
  if (!run) return undefined;

  const finishedAt = new Date().toISOString();
  const durationMs = Date.parse(finishedAt) - Date.parse(run.startedAt);

  run.status = 'success';
  run.finishedAt = finishedAt;
  run.durationMs = Number.isFinite(durationMs) ? durationMs : undefined;
  run.backup = result && result.backup ? result.backup : undefined;

  return run;
}

/**
 * PUBLIC_INTERFACE
 * Marks a run as failed and records a sanitized error message.
 *
 * @param {string} runId
 * @param {unknown} err
 * @returns {BackupJobRun|undefined}
 */
function finishRunError(runId, err) {
  const run = runs.find((r) => r.id === runId);
  if (!run) return undefined;

  const finishedAt = new Date().toISOString();
  const durationMs = Date.parse(finishedAt) - Date.parse(run.startedAt);

  run.status = 'error';
  run.finishedAt = finishedAt;
  run.durationMs = Number.isFinite(durationMs) ? durationMs : undefined;
  run.error = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);

  return run;
}

/**
 * PUBLIC_INTERFACE
 * Lists recent runs (most recent first).
 *
 * @returns {BackupJobRun[]}
 */
function listRuns() {
  return runs.slice();
}

module.exports = {
  startRun,
  finishRunSuccess,
  finishRunError,
  listRuns,
};

