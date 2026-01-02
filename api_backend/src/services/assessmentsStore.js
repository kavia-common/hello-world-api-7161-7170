'use strict';

/**
 * Simple in-memory Assessments store.
 *
 * Notes:
 * - Data resets whenever the server restarts.
 * - Controllers enforce validation; store enforces uniqueness by `assessmentId`.
 */

/** @type {Map<string, any>} */
const assessmentsById = new Map();

/**
 * Normalizes timestamps to ISO strings for API responses.
 *
 * @param {object} record Assessment record
 * @returns {object} Normalized record
 */
function normalizeForApi(record) {
  if (!record || typeof record !== 'object') return record;

  const createdAt =
    record.createdAt instanceof Date
      ? record.createdAt.toISOString()
      : typeof record.createdAt === 'string'
        ? record.createdAt
        : undefined;

  const updatedAt =
    record.updatedAt instanceof Date
      ? record.updatedAt.toISOString()
      : typeof record.updatedAt === 'string'
        ? record.updatedAt
        : undefined;

  const result = { ...record };
  if (createdAt) result.createdAt = createdAt;
  if (updatedAt) result.updatedAt = updatedAt;

  return result;
}

/**
 * PUBLIC_INTERFACE
 * Creates and stores an Assessment record in-memory.
 *
 * Enforces uniqueness by `assessmentId`.
 *
 * @param {object} record Assessment record to store
 * @returns {Promise<object>} Stored record
 * @throws {Error} If record already exists.
 */
async function createAssessment(record) {
  const assessmentId = record && typeof record.assessmentId === 'string' ? record.assessmentId : undefined;

  if (!assessmentId) {
    const err = new Error('assessmentId is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (assessmentsById.has(assessmentId)) {
    const err = new Error('Assessment with this assessmentId already exists.');
    err.code = 'DUPLICATE_ASSESSMENT_ID';
    throw err;
  }

  const now = new Date();
  const stored = {
    ...record,
    assessmentId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  assessmentsById.set(assessmentId, stored);
  return normalizeForApi(stored);
}

/**
 * PUBLIC_INTERFACE
 * Lists all stored Assessments.
 *
 * @returns {Promise<object[]>} Array of records
 */
async function listAssessments() {
  return Array.from(assessmentsById.values()).map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Gets an Assessment by assessmentId.
 *
 * @param {string} assessmentId Unique Assessment ID
 * @returns {Promise<object|undefined>} Record if found; otherwise undefined.
 */
async function getAssessmentById(assessmentId) {
  const record = assessmentsById.get(assessmentId);
  if (!record) return undefined;
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing Assessment record by assessmentId.
 *
 * Preserves the original createdAt.
 *
 * @param {string} assessmentId Assessment ID to replace
 * @param {object} replacement Replacement record
 * @returns {Promise<object|undefined>} Updated record if found; otherwise undefined.
 */
async function replaceAssessment(assessmentId, replacement) {
  const existing = assessmentsById.get(assessmentId);
  if (!existing) return undefined;

  const now = new Date();
  const updated = {
    ...replacement,
    assessmentId,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  assessmentsById.set(assessmentId, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Applies a partial update to an existing Assessment record by assessmentId.
 *
 * @param {string} assessmentId Assessment ID to patch
 * @param {object} patch Partial update object
 * @returns {Promise<object|undefined>} Updated record if found; otherwise undefined.
 */
async function patchAssessment(assessmentId, patch) {
  const existing = assessmentsById.get(assessmentId);
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  // Prevent accidental id overwrite
  if ('assessmentId' in safePatch) delete safePatch.assessmentId;

  const now = new Date();
  const updated = {
    ...existing,
    ...safePatch,
    assessmentId,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  assessmentsById.set(assessmentId, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes an Assessment record by assessmentId.
 *
 * @param {string} assessmentId Assessment ID to delete
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteAssessment(assessmentId) {
  return assessmentsById.delete(assessmentId);
}

/**
 * PUBLIC_INTERFACE
 * Clears all assessments from the in-memory store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  assessmentsById.clear();
}

module.exports = {
  createAssessment,
  listAssessments,
  getAssessmentById,
  replaceAssessment,
  patchAssessment,
  deleteAssessment,
  clearAll,
};
