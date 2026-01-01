'use strict';

const crypto = require('crypto');

/**
 * In-memory backups store.
 *
 * Notes:
 * - Data resets whenever the server restarts.
 * - Stores full snapshot payloads so backups can be retrieved later without recomputation.
 */

/** @type {Map<string, any>} */
const backupsById = new Map();

/**
 * Creates a stable, unique backup id.
 *
 * @returns {string} backup id
 */
function generateBackupId() {
  // Node 18+ supports randomUUID; keep a fallback for safety.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return crypto.randomBytes(16).toString('hex');
}

/**
 * PUBLIC_INTERFACE
 * Stores a snapshot and returns the created backup metadata.
 *
 * @param {object} snapshot Full snapshot object to store
 * @returns {Promise<{id: string, timestamp: string}>} Stored backup identifier/timestamp
 */
async function put(snapshot) {
  const id = generateBackupId();
  const timestamp =
    snapshot && typeof snapshot.timestamp === 'string' ? snapshot.timestamp : new Date().toISOString();

  backupsById.set(id, {
    ...snapshot,
    id,
    timestamp,
  });

  return { id, timestamp };
}

/**
 * PUBLIC_INTERFACE
 * Lists backups (most recent first) as minimal metadata.
 *
 * @returns {Promise<Array<{id: string, timestamp: string, metadata?: object}>>} Backup list
 */
async function list() {
  const items = Array.from(backupsById.values()).map((b) => ({
    id: b.id,
    timestamp: b.timestamp,
    metadata: b.metadata,
  }));

  // newest first
  items.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return items;
}

/**
 * PUBLIC_INTERFACE
 * Gets a single backup snapshot by id.
 *
 * @param {string} id Backup id
 * @returns {Promise<object|undefined>} Snapshot if found
 */
async function get(id) {
  if (!id) return undefined;
  return backupsById.get(id);
}

module.exports = {
  put,
  list,
  get,
};
