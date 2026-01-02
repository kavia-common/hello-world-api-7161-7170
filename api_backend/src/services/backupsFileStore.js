'use strict';

const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const SNAPSHOT_DIR = path.join(process.cwd(), 'data', 'backups');

/**
 * Ensures the snapshot directory exists.
 *
 * @returns {Promise<void>} resolves when directory exists
 */
async function ensureSnapshotDir() {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

/**
 * Generates a stable snapshot filename.
 *
 * @returns {{ id: string, filename: string }} id and filename
 */
function generateSnapshotFilename() {
  // Node 18+ supports randomUUID; keep fallback
  const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  return { id, filename: `${id}.json` };
}

/**
 * Maps an incoming id/filename to a safe filename within snapshot dir.
 *
 * This prevents path traversal. We accept:
 * - "uuid"
 * - "uuid.json"
 *
 * @param {string} idOrFilename requested id
 * @returns {{ id: string, filename: string }} normalized id and filename
 */
function normalizeIdToFilename(idOrFilename) {
  const raw = String(idOrFilename || '').trim();
  const base = path.basename(raw); // strips any path
  const filename = base.endsWith('.json') ? base : `${base}.json`;
  const id = filename.replace(/\.json$/i, '');
  return { id, filename };
}

/**
 * PUBLIC_INTERFACE
 * Writes a snapshot JSON file to disk.
 *
 * @param {object} snapshot snapshot object to persist
 * @returns {Promise<{id: string, filename: string, timestamp: string, sizeBytes: number}>} persisted metadata
 */
async function writeSnapshot(snapshot) {
  await ensureSnapshotDir();

  const timestamp =
    snapshot && typeof snapshot.timestamp === 'string' ? snapshot.timestamp : new Date().toISOString();

  const { id, filename } = generateSnapshotFilename();

  const toWrite = {
    ...snapshot,
    id,
    timestamp,
  };

  const filePath = path.join(SNAPSHOT_DIR, filename);
  const payload = JSON.stringify(toWrite, null, 2);
  await fs.writeFile(filePath, payload, 'utf8');

  return {
    id,
    filename,
    timestamp,
    sizeBytes: Buffer.byteLength(payload, 'utf8'),
  };
}

/**
 * PUBLIC_INTERFACE
 * Lists snapshots available on disk.
 *
 * @returns {Promise<Array<{id: string, filename: string, timestamp?: string, sizeBytes: number, createdAt: string}>>} list of snapshot metadata
 */
async function listSnapshots() {
  await ensureSnapshotDir();

  const entries = await fs.readdir(SNAPSHOT_DIR, { withFileTypes: true });
  const jsonFiles = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.json')).map((e) => e.name);

  const items = await Promise.all(
    jsonFiles.map(async (filename) => {
      const filePath = path.join(SNAPSHOT_DIR, filename);
      const st = await fs.stat(filePath);

      // Try to read timestamp from JSON, but don't fail listing if parse fails.
      let timestamp;
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.timestamp === 'string') timestamp = parsed.timestamp;
      } catch (_err) {
        // ignore
      }

      return {
        id: filename.replace(/\.json$/i, ''),
        filename,
        timestamp,
        sizeBytes: st.size,
        createdAt: st.mtime.toISOString(),
      };
    })
  );

  // Prefer timestamp sort, otherwise createdAt
  items.sort((a, b) => String(b.timestamp || b.createdAt).localeCompare(String(a.timestamp || a.createdAt)));
  return items;
}

/**
 * PUBLIC_INTERFACE
 * Reads a snapshot JSON file from disk.
 *
 * @param {string} id snapshot id (uuid) or filename (uuid.json)
 * @returns {Promise<{snapshot: object|null, filename: string, id: string}>} snapshot object or null if not found
 */
async function readSnapshot(id) {
  await ensureSnapshotDir();

  const normalized = normalizeIdToFilename(id);
  const filePath = path.join(SNAPSHOT_DIR, normalized.filename);

  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return { snapshot: parsed, filename: normalized.filename, id: normalized.id };
  } catch (err) {
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) {
      return { snapshot: null, filename: normalized.filename, id: normalized.id };
    }
    // propagate parsing/other errors so controller can return 500
    throw err;
  }
}

module.exports = {
  writeSnapshot,
  listSnapshots,
  readSnapshot,
};

