'use strict';

const backupsFileStore = require('../services/backupsFileStore');

const employeesStore = require('../services/employeesStore');
const skillFactoriesStore = require('../services/skillFactoriesStore');
const learningPathsStore = require('../services/learningPathsStore');
const assessmentsStore = require('../services/assessmentsStore');
const instructionsStore = require('../services/instructionsStore');
const announcementsStore = require('../services/announcementsStore');

/**
 * Determines if value is a plain object (not null, not array).
 *
 * @param {unknown} value Any value
 * @returns {boolean} True if plain object
 */
function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Normalizes any list-like section to an array; returns empty array if missing.
 *
 * @param {unknown} value Candidate section
 * @returns {any[]} Array form
 */
function asArrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Builds a standardized restore summary scaffold.
 *
 * @returns {Record<string, { attempted: number, restored: number, failed: number }>} summary
 */
function emptySummary() {
  return {
    employees: { attempted: 0, restored: 0, failed: 0 },
    skillFactories: { attempted: 0, restored: 0, failed: 0 },
    learningPaths: { attempted: 0, restored: 0, failed: 0 },
    assessments: { attempted: 0, restored: 0, failed: 0 },
    instructions: { attempted: 0, restored: 0, failed: 0 },
    announcements: { attempted: 0, restored: 0, failed: 0 },
  };
}

/**
 * Clears all persisted resource collections in MongoDB.
 *
 * NOTE:
 * We intentionally keep explicit clearAll() APIs on each store so restore does not rely
 * on internal variables or raw model access.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAllStores() {
  await Promise.all([
    employeesStore.clearAll(),
    skillFactoriesStore.clearAll(),
    learningPathsStore.clearAll(),
    assessmentsStore.clearAll(),
    instructionsStore.clearAll(),
    announcementsStore.clearAll(),
  ]);
}

/**
 * Validates the restore input and returns { snapshot, errors }.
 *
 * Accepted inputs:
 * - { snapshotId: string } to load from disk
 * - { snapshot: object } to restore directly
 *
 * @param {any} body Request body
 * @returns {Promise<{snapshot?: any, errors?: Array<{field: string, message: string}>}>} validation result
 */
async function resolveSnapshotFromRequest(body) {
  const errors = [];
  const snapshotId = isPlainObject(body) ? body.snapshotId : undefined;
  const snapshot = isPlainObject(body) ? body.snapshot : undefined;

  if (!snapshotId && !snapshot) {
    errors.push({
      field: 'snapshotId|snapshot',
      message: 'Provide either snapshotId (to load from disk) or snapshot (full JSON body).',
    });
    return { errors };
  }

  if (snapshotId !== undefined && (typeof snapshotId !== 'string' || snapshotId.trim().length === 0)) {
    errors.push({ field: 'snapshotId', message: 'snapshotId must be a non-empty string.' });
  }

  if (snapshot !== undefined && !isPlainObject(snapshot)) {
    errors.push({ field: 'snapshot', message: 'snapshot must be a JSON object.' });
  }

  if (errors.length > 0) return { errors };

  if (snapshot) return { snapshot };

  // Load from disk
  try {
    const read = await backupsFileStore.readSnapshot(snapshotId.trim());
    if (!read.snapshot) {
      errors.push({ field: 'snapshotId', message: 'Snapshot not found.' });
      return { errors };
    }
    return { snapshot: read.snapshot };
  } catch (err) {
    errors.push({
      field: 'snapshotId',
      message: err && err.message ? `Failed to read snapshot: ${err.message}` : 'Failed to read snapshot.',
    });
    return { errors };
  }
}

/**
 * Extracts the resource collections from a snapshot.
 *
 * We accept the known backup format:
 * { id, timestamp, kind, data: { employees, skillFactories, learningPaths, assessments, instructions, announcements } }
 *
 * We also allow "snapshot" to be the data payload directly (for flexibility),
 * but only if it has one or more expected sections.
 *
 * @param {any} snapshot Snapshot object
 * @returns {{collections: Record<string, any[]>, warnings: string[]}} extracted collections
 */
function extractCollections(snapshot) {
  const warnings = [];

  // Primary backup format: snapshot.data.{...}
  const data = isPlainObject(snapshot) && isPlainObject(snapshot.data) ? snapshot.data : undefined;

  // Alternate: snapshot itself contains sections (best-effort).
  const root = isPlainObject(snapshot) ? snapshot : undefined;

  const source = data || root || {};

  const collections = {
    employees: asArrayOrEmpty(source.employees),
    skillFactories: asArrayOrEmpty(source.skillFactories),
    learningPaths: asArrayOrEmpty(source.learningPaths),
    assessments: asArrayOrEmpty(source.assessments),
    instructions: asArrayOrEmpty(source.instructions),
    announcements: asArrayOrEmpty(source.announcements),
  };

  // If nothing found, warn; still allow (no-op restore)
  const foundAny = Object.values(collections).some((arr) => Array.isArray(arr) && arr.length > 0);
  if (!foundAny) {
    warnings.push(
      'No known resource sections found in snapshot (expected data.employees/skillFactories/learningPaths/assessments/instructions/announcements).'
    );
  }

  return { collections, warnings };
}

/**
 * Restores collections by invoking store create operations.
 *
 * The store-level create methods will enforce uniqueness and set createdAt/updatedAt.
 * Snapshot-provided timestamps are not restored (in-memory demo store).
 *
 * @param {Record<string, any[]>} collections Extracted collections
 * @returns {Promise<{summary: ReturnType<typeof emptySummary>, errors: Array<{resource: string, index: number, message: string}>}>}
 */
async function replayCreates(collections) {
  const summary = emptySummary();
  /** @type {Array<{resource: string, index: number, message: string}>} */
  const errors = [];

  async function restoreList(resource, list, createFn) {
    for (let i = 0; i < list.length; i += 1) {
      summary[resource].attempted += 1;
      try {
        await createFn(list[i]);
        summary[resource].restored += 1;
      } catch (err) {
        summary[resource].failed += 1;
        errors.push({
          resource,
          index: i,
          message: err && err.message ? err.message : 'Unknown error',
        });
      }
    }
  }

  // Order: employees first, then other resources.
  // (This is a pragmatic default; current resources don't enforce cross-resource FK constraints.)
  await restoreList('employees', collections.employees, employeesStore.createEmployee);
  await restoreList('skillFactories', collections.skillFactories, skillFactoriesStore.createSkillFactory);
  await restoreList('learningPaths', collections.learningPaths, learningPathsStore.createLearningPath);
  await restoreList('assessments', collections.assessments, assessmentsStore.createAssessment);
  await restoreList('instructions', collections.instructions, instructionsStore.createInstruction);
  await restoreList('announcements', collections.announcements, announcementsStore.createAnnouncement);

  return { summary, errors };
}

/**
 * PUBLIC_INTERFACE
 * POST /restore
 *
 * Restores application state by replaying a backup snapshot into the in-memory stores.
 *
 * Security:
 * - Protected: verifyJwt + requireRole(['admin','manager']) applied at route level.
 *
 * Input:
 * - Provide either:
 *   - snapshotId: string  (loads /data/backups/<id>.json)
 *   - snapshot: object    (full snapshot object)
 *
 * Behavior:
 * - Idempotent-safe default: replace mode (clears all in-memory stores before restoring).
 * - Query param: restoreMode=replace|merge (default: replace)
 *   - replace: clear current stores first (recommended)
 *   - merge: do not clear; best-effort inserts, duplicates will be reported as errors by stores
 *
 * Output:
 * - 200: summary of restored items per resource + errors list
 * - 400: validation errors
 * - 401/403: authz errors handled by middleware
 *
 * @param {import('express').Request} req Express Request
 * @param {import('express').Response} res Express Response
 * @returns {Promise<void>} JSON response
 */
async function restore(req, res) {
  const restoreMode = typeof req.query.restoreMode === 'string' ? req.query.restoreMode : 'replace';
  const mode = restoreMode === 'merge' ? 'merge' : 'replace';

  const { snapshot, errors: inputErrors } = await resolveSnapshotFromRequest(req.body);
  if (inputErrors && inputErrors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed.',
      errors: inputErrors,
    });
  }

  // Basic shape validation: we at least expect an object.
  if (!isPlainObject(snapshot)) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed.',
      errors: [{ field: 'snapshot', message: 'Snapshot must be a JSON object.' }],
    });
  }

  const { collections, warnings } = extractCollections(snapshot);

  try {
    if (mode === 'replace') {
      await clearAllStores();
    }

    const { summary, errors } = await replayCreates(collections);

    return res.status(200).json({
      status: 'success',
      data: {
        restoreMode: mode,
        snapshotId: typeof snapshot.id === 'string' ? snapshot.id : undefined,
        timestamp: typeof snapshot.timestamp === 'string' ? snapshot.timestamp : undefined,
        kind: typeof snapshot.kind === 'string' ? snapshot.kind : undefined,
        summary,
        warnings,
        errors,
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: err && err.message ? err.message : 'Failed to restore snapshot.',
    });
  }
}

module.exports = {
  restore,
};
