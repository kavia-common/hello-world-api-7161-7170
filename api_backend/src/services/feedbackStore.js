'use strict';

/**
 * Simple in-memory Feedback store.
 *
 * Notes:
 * - Data resets whenever the server restarts.
 * - Controllers enforce validation; store enforces uniqueness by `feedbackId`.
 */

/** @type {Map<string, any>} */
const feedbackById = new Map();

/**
 * Normalizes timestamps to ISO strings for API responses.
 *
 * @param {object} record Feedback record
 * @returns {object} Normalized record
 */
function normalizeForApi(record) {
  if (!record || typeof record !== 'object') return record;

  const submittedAt =
    record.submittedAt instanceof Date
      ? record.submittedAt.toISOString()
      : typeof record.submittedAt === 'string'
        ? record.submittedAt
        : undefined;

  const result = { ...record };
  if (submittedAt) result.submittedAt = submittedAt;

  return result;
}

/**
 * PUBLIC_INTERFACE
 * Creates and stores a Feedback record in-memory.
 *
 * Enforces uniqueness by `feedbackId`.
 *
 * @param {object} record Feedback record to store
 * @returns {Promise<object>} Stored record
 * @throws {Error} If record already exists.
 */
async function createFeedback(record) {
  const feedbackId = record && typeof record.feedbackId === 'string' ? record.feedbackId : undefined;

  if (!feedbackId) {
    const err = new Error('feedbackId is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (feedbackById.has(feedbackId)) {
    const err = new Error('Feedback with this feedbackId already exists.');
    err.code = 'DUPLICATE_FEEDBACK_ID';
    throw err;
  }

  const now = new Date();
  const stored = {
    ...record,
    feedbackId,
    submittedAt: now.toISOString(),
  };

  feedbackById.set(feedbackId, stored);
  return normalizeForApi(stored);
}

/**
 * PUBLIC_INTERFACE
 * Lists all stored Feedback records.
 *
 * @returns {Promise<object[]>} Array of records
 */
async function listFeedback() {
  return Array.from(feedbackById.values()).map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Gets a Feedback record by feedbackId.
 *
 * @param {string} feedbackId Unique Feedback ID
 * @returns {Promise<object|undefined>} Record if found; otherwise undefined.
 */
async function getFeedbackById(feedbackId) {
  const record = feedbackById.get(feedbackId);
  if (!record) return undefined;
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing Feedback record by feedbackId.
 *
 * Preserves the original submittedAt timestamp.
 *
 * @param {string} feedbackId Feedback ID to replace
 * @param {object} replacement Replacement record
 * @returns {Promise<object|undefined>} Updated record if found; otherwise undefined.
 */
async function replaceFeedback(feedbackId, replacement) {
  const existing = feedbackById.get(feedbackId);
  if (!existing) return undefined;

  const updated = {
    ...replacement,
    feedbackId,
    submittedAt: existing.submittedAt,
  };

  feedbackById.set(feedbackId, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Applies a partial update to an existing Feedback record by feedbackId.
 *
 * @param {string} feedbackId Feedback ID to patch
 * @param {object} patch Partial update object
 * @returns {Promise<object|undefined>} Updated record if found; otherwise undefined.
 */
async function patchFeedback(feedbackId, patch) {
  const existing = feedbackById.get(feedbackId);
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  // Prevent accidental id overwrite and timestamp overwrite
  if ('feedbackId' in safePatch) delete safePatch.feedbackId;
  if ('submittedAt' in safePatch) delete safePatch.submittedAt;

  const updated = {
    ...existing,
    ...safePatch,
    feedbackId,
    submittedAt: existing.submittedAt,
  };

  feedbackById.set(feedbackId, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes a Feedback record by feedbackId.
 *
 * @param {string} feedbackId Feedback ID to delete
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteFeedback(feedbackId) {
  return feedbackById.delete(feedbackId);
}

module.exports = {
  createFeedback,
  listFeedback,
  getFeedbackById,
  replaceFeedback,
  patchFeedback,
  deleteFeedback,
};
