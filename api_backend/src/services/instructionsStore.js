'use strict';

const Instruction = require('../db/models/Instruction');
const { mapMongoError } = require('../db/mongoErrors');

/**
 * Normalizes timestamps to ISO strings for API responses.
 *
 * @param {any} record
 * @returns {object|any}
 */
function normalizeForApi(record) {
  if (!record || typeof record !== 'object') return record;
  const obj = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
  if (obj.createdAt instanceof Date) obj.createdAt = obj.createdAt.toISOString();
  if (obj.updatedAt instanceof Date) obj.updatedAt = obj.updatedAt.toISOString();
  return obj;
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
 * PUBLIC_INTERFACE
 * Creates and stores an instruction record.
 *
 * Uniqueness rules:
 * - id must be unique
 * - slug (if provided) must be unique
 *
 * @param {object} instruction Instruction record to store
 * @returns {Promise<object>} Stored instruction record (normalized)
 * @throws {Error} On validation issues or duplicates
 */
async function createInstruction(instruction) {
  const id = instruction && typeof instruction.id === 'string' ? instruction.id : undefined;
  if (!isNonEmptyString(id)) {
    const err = new Error('id is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const slug =
    instruction && typeof instruction.slug === 'string' && instruction.slug.trim().length > 0
      ? instruction.slug.trim()
      : undefined;

  try {
    const created = await Instruction.create({
      ...instruction,
      id: id.trim(),
      slug,
    });
    return normalizeForApi(created);
  } catch (err) {
    // Distinguish duplicate slug vs duplicate id by inspecting keyPattern/keyValue when present
    if (err && err.code === 11000) {
      const keys = err.keyPattern || {};
      if (keys.slug) {
        const e = new Error('Instruction with this slug already exists.');
        e.code = 'DUPLICATE_SLUG';
        throw e;
      }
      const e = new Error('Instruction with this id already exists.');
      e.code = 'DUPLICATE_ID';
      throw e;
    }

    throw mapMongoError(err, 'DB_ERROR', 'Database error.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Returns all stored instructions.
 *
 * @returns {Promise<object[]>} Array of instruction records (normalized)
 */
async function listInstructions() {
  const docs = await Instruction.find({}, { _id: 0 }).lean();
  return docs.map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Finds an instruction by id.
 *
 * @param {string} id Instruction id to look up
 * @returns {Promise<object|undefined>} Instruction record if found; otherwise undefined
 */
async function getInstructionById(id) {
  if (!isNonEmptyString(id)) return undefined;
  const doc = await Instruction.findOne({ id: id.trim() }, { _id: 0 }).lean();
  return doc ? normalizeForApi(doc) : undefined;
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing instruction record by id.
 *
 * Preserves the original createdAt timestamp.
 * Enforces slug uniqueness if slug is set/changed.
 *
 * @param {string} id Instruction id to replace
 * @param {object} replacement Replacement instruction record
 * @returns {Promise<object|undefined>} Updated instruction if found; otherwise undefined
 * @throws {Error} On duplicate slug
 */
async function replaceInstruction(id, replacement) {
  if (!isNonEmptyString(id)) return undefined;

  const existing = await Instruction.findOne({ id: id.trim() }).lean();
  if (!existing) return undefined;

  const newSlug =
    replacement && typeof replacement.slug === 'string' && replacement.slug.trim().length > 0
      ? replacement.slug.trim()
      : undefined;

  try {
    const updated = await Instruction.findOneAndUpdate(
      { id: id.trim() },
      { ...replacement, id: id.trim(), slug: newSlug, createdAt: existing.createdAt },
      { new: true, runValidators: false }
    );
    return updated ? normalizeForApi(updated) : undefined;
  } catch (err) {
    if (err && err.code === 11000) {
      const keys = err.keyPattern || {};
      if (keys.slug) {
        const e = new Error('Instruction with this slug already exists.');
        e.code = 'DUPLICATE_SLUG';
        throw e;
      }
    }
    throw mapMongoError(err, 'DB_ERROR', 'Database error.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Applies a partial update to an existing instruction record by id.
 *
 * Enforces slug uniqueness if slug is set/changed.
 *
 * @param {string} id Instruction id to patch
 * @param {object} patch Partial update object
 * @returns {Promise<object|undefined>} Updated instruction if found; otherwise undefined
 * @throws {Error} On duplicate slug
 */
async function patchInstruction(id, patch) {
  if (!isNonEmptyString(id)) return undefined;

  const safePatch = { ...(patch || {}) };
  if ('id' in safePatch) delete safePatch.id;

  // Allow slug clearing by setting undefined/null/empty string at controller level;
  // here we normalize empty string to undefined.
  if (Object.prototype.hasOwnProperty.call(safePatch, 'slug')) {
    if (!isNonEmptyString(safePatch.slug)) safePatch.slug = undefined;
    else safePatch.slug = safePatch.slug.trim();
  }

  try {
    const updated = await Instruction.findOneAndUpdate(
      { id: id.trim() },
      { $set: safePatch },
      { new: true, runValidators: false }
    );
    return updated ? normalizeForApi(updated) : undefined;
  } catch (err) {
    if (err && err.code === 11000) {
      const keys = err.keyPattern || {};
      if (keys.slug) {
        const e = new Error('Instruction with this slug already exists.');
        e.code = 'DUPLICATE_SLUG';
        throw e;
      }
    }
    throw mapMongoError(err, 'DB_ERROR', 'Database error.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Deletes an instruction record by id.
 *
 * @param {string} id Instruction id to delete
 * @returns {Promise<boolean>} True if deleted; false if not found
 */
async function deleteInstruction(id) {
  if (!isNonEmptyString(id)) return false;
  const res = await Instruction.deleteOne({ id: id.trim() });
  return (res.deletedCount || 0) > 0;
}

/**
 * PUBLIC_INTERFACE
 * Clears all instructions from the store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  await Instruction.deleteMany({});
}

module.exports = {
  createInstruction,
  listInstructions,
  getInstructionById,
  replaceInstruction,
  patchInstruction,
  deleteInstruction,
  clearAll,
};
