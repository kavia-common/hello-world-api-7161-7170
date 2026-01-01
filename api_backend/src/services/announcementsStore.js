'use strict';

/**
 * Simple in-memory announcements store.
 *
 * Notes:
 * - Data is reset whenever the server restarts.
 * - This module follows the same Map-backed pattern used by other stores in this API.
 * - Validates id uniqueness on create.
 */

/** @type {Set<string>} */
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high']);

/** @type {Map<string, any>} */
const announcementsById = new Map();

/**
 * Creates a shallow clone and ensures timestamps are ISO strings.
 *
 * @param {object} announcement Announcement record
 * @returns {object} Normalized record for API responses
 */
function normalizeForApi(announcement) {
  if (!announcement || typeof announcement !== 'object') return announcement;

  const createdAt =
    announcement.createdAt instanceof Date
      ? announcement.createdAt.toISOString()
      : typeof announcement.createdAt === 'string'
        ? announcement.createdAt
        : undefined;

  const updatedAt =
    announcement.updatedAt instanceof Date
      ? announcement.updatedAt.toISOString()
      : typeof announcement.updatedAt === 'string'
        ? announcement.updatedAt
        : undefined;

  const result = { ...announcement };
  if (createdAt) result.createdAt = createdAt;
  if (updatedAt) result.updatedAt = updatedAt;

  return result;
}

/**
 * Determines if the provided value is a non-empty string.
 *
 * @param {unknown} value Any value
 * @returns {boolean} True if non-empty string
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates optional ISO date fields if provided.
 *
 * @param {unknown} value Candidate date value
 * @returns {boolean} True if value is undefined/null/empty OR a valid ISO date string
 */
function isOptionalIsoDateString(value) {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === d.toISOString(); // ensure Date is valid (string check is best-effort)
}

/**
 * Parses an ISO date string into a Date for comparison.
 *
 * @param {string|undefined} value ISO string
 * @returns {Date|undefined} Parsed date
 */
function parseIsoDate(value) {
  if (!isNonEmptyString(value)) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

/**
 * Validates announcement properties for store-level constraints.
 *
 * @param {object} candidate Candidate announcement
 * @param {boolean} isPatch Whether this is a patch operation
 * @returns {{ok: true} | {ok: false, message: string, code: string}}
 */
function validateAnnouncement(candidate, isPatch) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Expected a JSON object.' };
  }

  if (!isPatch) {
    // Create/replace require title and message at controller-level; store ensures types if present.
    if (!isNonEmptyString(candidate.id)) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'id is required.' };
    }
  }

  if (candidate.title !== undefined && candidate.title !== null && typeof candidate.title !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'title must be a string.' };
  }

  if (
    candidate.message !== undefined &&
    candidate.message !== null &&
    typeof candidate.message !== 'string'
  ) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'message must be a string.' };
  }

  if (candidate.author !== undefined && candidate.author !== null && typeof candidate.author !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'author must be a string.' };
  }

  if (candidate.priority !== undefined && candidate.priority !== null) {
    if (typeof candidate.priority !== 'string' || !ALLOWED_PRIORITIES.has(candidate.priority)) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'priority must be one of: low, normal, high.',
      };
    }
  }

  if (candidate.isActive !== undefined && candidate.isActive !== null && typeof candidate.isActive !== 'boolean') {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'isActive must be a boolean.' };
  }

  if (!isOptionalIsoDateString(candidate.startsAt)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'startsAt must be an ISO date string.' };
  }

  if (!isOptionalIsoDateString(candidate.endsAt)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'endsAt must be an ISO date string.' };
  }

  const starts = parseIsoDate(typeof candidate.startsAt === 'string' ? candidate.startsAt : undefined);
  const ends = parseIsoDate(typeof candidate.endsAt === 'string' ? candidate.endsAt : undefined);
  if (starts && ends && ends.getTime() < starts.getTime()) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'endsAt must be >= startsAt.' };
  }

  return { ok: true };
}

/**
 * PUBLIC_INTERFACE
 * Creates and stores an announcement record in-memory.
 *
 * Uniqueness rules:
 * - id must be unique (client-provided, or set by controller)
 *
 * @param {object} announcement Announcement record to store
 * @returns {Promise<object>} Stored announcement record (normalized)
 * @throws {Error} On validation issues or duplicates
 */
async function createAnnouncement(announcement) {
  const validation = validateAnnouncement(announcement, false);
  if (!validation.ok) {
    const err = new Error(validation.message);
    err.code = validation.code;
    throw err;
  }

  const id = announcement.id.trim();
  if (announcementsById.has(id)) {
    const err = new Error('Announcement with this id already exists.');
    err.code = 'DUPLICATE_ID';
    throw err;
  }

  const now = new Date();
  const record = {
    ...announcement,
    id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  announcementsById.set(id, record);
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Returns all stored announcements.
 *
 * @returns {Promise<object[]>} Array of announcement records (normalized)
 */
async function listAnnouncements() {
  return Array.from(announcementsById.values()).map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Finds an announcement by id.
 *
 * @param {string} id Announcement id to look up
 * @returns {Promise<object|undefined>} Announcement record if found; otherwise undefined
 */
async function getAnnouncementById(id) {
  const record = announcementsById.get(id);
  if (!record) return undefined;
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing announcement record by id.
 *
 * Preserves the original createdAt timestamp.
 *
 * @param {string} id Announcement id to replace
 * @param {object} replacement Replacement announcement record
 * @returns {Promise<object|undefined>} Updated announcement if found; otherwise undefined
 * @throws {Error} On validation issues
 */
async function replaceAnnouncement(id, replacement) {
  const existing = announcementsById.get(id);
  if (!existing) return undefined;

  const validation = validateAnnouncement({ ...replacement, id }, false);
  if (!validation.ok) {
    const err = new Error(validation.message);
    err.code = validation.code;
    throw err;
  }

  const now = new Date();
  const record = {
    ...replacement,
    id,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  announcementsById.set(id, record);
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Applies a partial update to an existing announcement record by id.
 *
 * @param {string} id Announcement id to patch
 * @param {object} patch Partial update object
 * @returns {Promise<object|undefined>} Updated announcement if found; otherwise undefined
 * @throws {Error} On validation issues
 */
async function patchAnnouncement(id, patch) {
  const existing = announcementsById.get(id);
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  if ('id' in safePatch) delete safePatch.id;

  const candidate = {
    ...existing,
    ...safePatch,
    id,
    createdAt: existing.createdAt,
  };

  const validation = validateAnnouncement(candidate, true);
  if (!validation.ok) {
    const err = new Error(validation.message);
    err.code = validation.code;
    throw err;
  }

  const now = new Date();
  const updated = {
    ...candidate,
    updatedAt: now.toISOString(),
  };

  announcementsById.set(id, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes an announcement record by id.
 *
 * @param {string} id Announcement id to delete
 * @returns {Promise<boolean>} True if deleted; false if not found
 */
async function deleteAnnouncement(id) {
  const existing = announcementsById.get(id);
  if (!existing) return false;

  announcementsById.delete(id);
  return true;
}

module.exports = {
  ALLOWED_PRIORITIES,
  createAnnouncement,
  listAnnouncements,
  getAnnouncementById,
  replaceAnnouncement,
  patchAnnouncement,
  deleteAnnouncement,
};
