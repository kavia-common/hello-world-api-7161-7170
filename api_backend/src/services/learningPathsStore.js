'use strict';

/**
 * Simple in-memory Learning Paths store.
 *
 * Notes:
 * - Data is reset whenever the server restarts.
 * - This module mirrors the employeesStore/skillFactoriesStore async API style.
 * - Controllers enforce validation; store enforces uniqueness by `learningPathName`.
 */

/** @type {Map<string, any>} */
const learningPathsByName = new Map();

/**
 * Normalizes timestamps to ISO strings for API responses.
 *
 * @param {object} record Learning Path record
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
 * Creates and stores a Learning Path record in-memory.
 *
 * Enforces uniqueness by `learningPathName`.
 *
 * @param {object} record Learning Path record to store
 * @returns {Promise<object>} Stored record
 * @throws {Error} If record already exists.
 */
async function createLearningPath(record) {
  const learningPathName =
    record && typeof record.learningPathName === 'string' ? record.learningPathName : undefined;

  if (!learningPathName) {
    const err = new Error('learningPathName is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (learningPathsByName.has(learningPathName)) {
    const err = new Error('Learning Path with this learningPathName already exists.');
    err.code = 'DUPLICATE_LEARNING_PATH_NAME';
    throw err;
  }

  const now = new Date();
  const stored = {
    ...record,
    learningPathName,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  learningPathsByName.set(learningPathName, stored);
  return normalizeForApi(stored);
}

/**
 * PUBLIC_INTERFACE
 * Lists all stored Learning Paths.
 *
 * @returns {Promise<object[]>} Array of records
 */
async function listLearningPaths() {
  return Array.from(learningPathsByName.values()).map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Gets a Learning Path by learningPathName.
 *
 * @param {string} learningPathName Unique Learning Path name
 * @returns {Promise<object|undefined>} Record if found; otherwise undefined.
 */
async function getLearningPathByName(learningPathName) {
  const record = learningPathsByName.get(learningPathName);
  if (!record) return undefined;
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing Learning Path record by learningPathName.
 *
 * Preserves the original createdAt timestamp.
 *
 * @param {string} learningPathName Name to replace
 * @param {object} replacement Replacement record
 * @returns {Promise<object|undefined>} Updated record if found; otherwise undefined.
 */
async function replaceLearningPath(learningPathName, replacement) {
  const existing = learningPathsByName.get(learningPathName);
  if (!existing) return undefined;

  const now = new Date();
  const updated = {
    ...replacement,
    learningPathName,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  learningPathsByName.set(learningPathName, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Applies a partial update to an existing Learning Path record by learningPathName.
 *
 * @param {string} learningPathName Name to patch
 * @param {object} patch Partial update object
 * @returns {Promise<object|undefined>} Updated record if found; otherwise undefined.
 */
async function patchLearningPath(learningPathName, patch) {
  const existing = learningPathsByName.get(learningPathName);
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  // Prevent accidental identifier overwrite
  if ('learningPathName' in safePatch) delete safePatch.learningPathName;

  const now = new Date();
  const updated = {
    ...existing,
    ...safePatch,
    learningPathName,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  learningPathsByName.set(learningPathName, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes a Learning Path record by learningPathName.
 *
 * @param {string} learningPathName Name to delete
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteLearningPath(learningPathName) {
  return learningPathsByName.delete(learningPathName);
}

/**
 * PUBLIC_INTERFACE
 * Clears all learning paths from the in-memory store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  learningPathsByName.clear();
}

module.exports = {
  createLearningPath,
  listLearningPaths,
  getLearningPathByName,
  replaceLearningPath,
  patchLearningPath,
  deleteLearningPath,
  clearAll,
};
