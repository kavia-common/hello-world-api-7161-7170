'use strict';

/**
 * In-memory store for backup job history.
 *
 * Jobs are recorded for:
 * - scheduled backups (trigger: "scheduler")
 * - manual backups (trigger: "api") if we choose to record them (optional)
 *
 * NOTE: This store is in-memory only and resets on server restart.
 */

const jobs = [];
const MAX_JOBS = 200;

/**
 * @typedef {object} BackupJobRecord
 * @property {string} id Job id (unique)
 * @property {string} timestamp ISO timestamp when job started
 * @property {string} trigger "scheduler" | "api" | string
 * @property {"success" | "error"} status Job status
 * @property {string=} backupId Backup id created (when success)
 * @property {string=} message Error message (when error)
 */

/**
 * PUBLIC_INTERFACE
 * Adds a job record to the in-memory store.
 *
 * @param {BackupJobRecord} job Job record to add
 * @returns {BackupJobRecord} Stored job record
 */
function addJob(job) {
  const safeJob = {
    id: String(job.id),
    timestamp: String(job.timestamp),
    trigger: typeof job.trigger === 'string' ? job.trigger : 'unknown',
    status: job.status === 'error' ? 'error' : 'success',
    ...(job.backupId ? { backupId: String(job.backupId) } : {}),
    ...(job.message ? { message: String(job.message) } : {}),
  };

  jobs.unshift(safeJob);

  // Keep bounded history
  if (jobs.length > MAX_JOBS) {
    jobs.length = MAX_JOBS;
  }

  return safeJob;
}

/**
 * PUBLIC_INTERFACE
 * Lists job records (most recent first).
 *
 * @returns {BackupJobRecord[]} Array of job records
 */
function listJobs() {
  return jobs.slice();
}

/**
 * PUBLIC_INTERFACE
 * Clears all job records (primarily for tests / debugging).
 *
 * @returns {void}
 */
function clearJobs() {
  jobs.length = 0;
}

module.exports = {
  addJob,
  listJobs,
  clearJobs,
};

