'use strict';

const Announcement = require('../db/models/Announcement');
const { mapMongoError } = require('../db/mongoErrors');

/** @type {Set<string>} */
const ALLOWED_PRIORITIES = new Set(['low', 'normal', 'high']);

function normalizeForApi(announcement) {
  if (!announcement || typeof announcement !== 'object') return announcement;
  const obj = typeof announcement.toJSON === 'function' ? announcement.toJSON() : { ...announcement };
  if (obj.createdAt instanceof Date) obj.createdAt = obj.createdAt.toISOString();
  if (obj.updatedAt instanceof Date) obj.updatedAt = obj.updatedAt.toISOString();
  return obj;
}

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
  return !Number.isNaN(d.getTime());
}

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
    if (!isNonEmptyString(candidate.id)) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'id is required.' };
    }
  }

  if (candidate.title !== undefined && candidate.title !== null && typeof candidate.title !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'title must be a string.' };
  }

  if (candidate.message !== undefined && candidate.message !== null && typeof candidate.message !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'message must be a string.' };
  }

  if (candidate.author !== undefined && candidate.author !== null && typeof candidate.author !== 'string') {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'author must be a string.' };
  }

  if (candidate.priority !== undefined && candidate.priority !== null) {
    if (typeof candidate.priority !== 'string' || !ALLOWED_PRIORITIES.has(candidate.priority)) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'priority must be one of: low, normal, high.' };
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
 * Creates and stores an announcement record.
 *
 * Uniqueness rules:
 * - id must be unique
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

  try {
    const created = await Announcement.create({ ...announcement, id });
    return normalizeForApi(created);
  } catch (err) {
    throw mapMongoError(err, 'DUPLICATE_ID', 'Announcement with this id already exists.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Returns all stored announcements.
 *
 * @returns {Promise<object[]>} Array of announcement records (normalized)
 */
async function listAnnouncements() {
  const docs = await Announcement.find({}, { _id: 0 }).lean();
  return docs.map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Finds an announcement by id.
 *
 * @param {string} id Announcement id to look up
 * @returns {Promise<object|undefined>} Announcement record if found; otherwise undefined
 */
async function getAnnouncementById(id) {
  if (!isNonEmptyString(id)) return undefined;
  const doc = await Announcement.findOne({ id: id.trim() }, { _id: 0 }).lean();
  return doc ? normalizeForApi(doc) : undefined;
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
  if (!isNonEmptyString(id)) return undefined;

  const existing = await Announcement.findOne({ id: id.trim() }).lean();
  if (!existing) return undefined;

  const validation = validateAnnouncement({ ...replacement, id }, false);
  if (!validation.ok) {
    const err = new Error(validation.message);
    err.code = validation.code;
    throw err;
  }

  try {
    const updated = await Announcement.findOneAndUpdate(
      { id: id.trim() },
      { ...replacement, id: id.trim(), createdAt: existing.createdAt },
      { new: true, runValidators: false }
    );
    return updated ? normalizeForApi(updated) : undefined;
  } catch (err) {
    throw mapMongoError(err, 'DB_ERROR', 'Database error.');
  }
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
  if (!isNonEmptyString(id)) return undefined;

  const existing = await Announcement.findOne({ id: id.trim() }).lean();
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  if ('id' in safePatch) delete safePatch.id;

  const candidate = {
    ...existing,
    ...safePatch,
    id: id.trim(),
    createdAt: existing.createdAt,
  };

  const validation = validateAnnouncement(candidate, true);
  if (!validation.ok) {
    const err = new Error(validation.message);
    err.code = validation.code;
    throw err;
  }

  try {
    const updated = await Announcement.findOneAndUpdate(
      { id: id.trim() },
      { $set: safePatch },
      { new: true, runValidators: false }
    );
    return updated ? normalizeForApi(updated) : undefined;
  } catch (err) {
    throw mapMongoError(err, 'DB_ERROR', 'Database error.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Deletes an announcement record by id.
 *
 * @param {string} id Announcement id to delete
 * @returns {Promise<boolean>} True if deleted; false if not found
 */
async function deleteAnnouncement(id) {
  if (!isNonEmptyString(id)) return false;
  const res = await Announcement.deleteOne({ id: id.trim() });
  return (res.deletedCount || 0) > 0;
}

/**
 * PUBLIC_INTERFACE
 * Clears all announcements from the store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  await Announcement.deleteMany({});
}

module.exports = {
  ALLOWED_PRIORITIES,
  createAnnouncement,
  listAnnouncements,
  getAnnouncementById,
  replaceAnnouncement,
  patchAnnouncement,
  deleteAnnouncement,
  clearAll,
};
