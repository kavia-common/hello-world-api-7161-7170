'use strict';

/**
 * Simple in-memory instructions store.
 *
 * Notes:
 * - Data is reset whenever the server restarts.
 * - This module follows the same Map-backed pattern used by other stores in this API.
 */

/** @type {Map<string, any>} */
const instructionsById = new Map();
/** @type {Map<string, string>} slugToId */
const slugToId = new Map();

/**
 * Creates a shallow clone and ensures timestamps are ISO strings.
 *
 * @param {object} instruction Instruction record
 * @returns {object} Normalized record for API responses
 */
function normalizeForApi(instruction) {
  if (!instruction || typeof instruction !== 'object') return instruction;

  const createdAt =
    instruction.createdAt instanceof Date
      ? instruction.createdAt.toISOString()
      : typeof instruction.createdAt === 'string'
        ? instruction.createdAt
        : undefined;

  const updatedAt =
    instruction.updatedAt instanceof Date
      ? instruction.updatedAt.toISOString()
      : typeof instruction.updatedAt === 'string'
        ? instruction.updatedAt
        : undefined;

  const result = { ...instruction };
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
 * PUBLIC_INTERFACE
 * Creates and stores an instruction record in-memory.
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

  if (instructionsById.has(id)) {
    const err = new Error('Instruction with this id already exists.');
    err.code = 'DUPLICATE_ID';
    throw err;
  }

  const slug =
    instruction && typeof instruction.slug === 'string' && instruction.slug.trim().length > 0
      ? instruction.slug.trim()
      : undefined;

  if (slug && slugToId.has(slug)) {
    const err = new Error('Instruction with this slug already exists.');
    err.code = 'DUPLICATE_SLUG';
    throw err;
  }

  const now = new Date();
  const record = {
    ...instruction,
    id: id.trim(),
    slug,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  instructionsById.set(record.id, record);
  if (slug) slugToId.set(slug, record.id);

  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Returns all stored instructions.
 *
 * @returns {Promise<object[]>} Array of instruction records (normalized)
 */
async function listInstructions() {
  return Array.from(instructionsById.values()).map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Finds an instruction by id.
 *
 * @param {string} id Instruction id to look up
 * @returns {Promise<object|undefined>} Instruction record if found; otherwise undefined
 */
async function getInstructionById(id) {
  const record = instructionsById.get(id);
  if (!record) return undefined;
  return normalizeForApi(record);
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
  const existing = instructionsById.get(id);
  if (!existing) return undefined;

  const newSlug =
    replacement && typeof replacement.slug === 'string' && replacement.slug.trim().length > 0
      ? replacement.slug.trim()
      : undefined;

  // If slug is changing (including from defined -> undefined, or undefined -> defined), update indexes safely.
  const oldSlug = existing.slug;

  if (newSlug && slugToId.has(newSlug) && slugToId.get(newSlug) !== id) {
    const err = new Error('Instruction with this slug already exists.');
    err.code = 'DUPLICATE_SLUG';
    throw err;
  }

  const now = new Date();
  const record = {
    ...replacement,
    id,
    slug: newSlug,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  instructionsById.set(id, record);

  // Update slug index
  if (oldSlug && oldSlug !== newSlug) slugToId.delete(oldSlug);
  if (newSlug) slugToId.set(newSlug, id);

  return normalizeForApi(record);
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
  const existing = instructionsById.get(id);
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  // Prevent accidental id overwrite
  if ('id' in safePatch) delete safePatch.id;

  const now = new Date();

  const wantsToUpdateSlug = Object.prototype.hasOwnProperty.call(safePatch, 'slug');
  const candidateSlug =
    wantsToUpdateSlug && typeof safePatch.slug === 'string' && safePatch.slug.trim().length > 0
      ? safePatch.slug.trim()
      : wantsToUpdateSlug
        ? undefined
        : existing.slug;

  if (candidateSlug && slugToId.has(candidateSlug) && slugToId.get(candidateSlug) !== id) {
    const err = new Error('Instruction with this slug already exists.');
    err.code = 'DUPLICATE_SLUG';
    throw err;
  }

  const updated = {
    ...existing,
    ...safePatch,
    id,
    slug: candidateSlug,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  instructionsById.set(id, updated);

  // Update slug index if changed
  if (wantsToUpdateSlug) {
    const oldSlug = existing.slug;
    const newSlug = updated.slug;
    if (oldSlug && oldSlug !== newSlug) slugToId.delete(oldSlug);
    if (newSlug) slugToId.set(newSlug, id);
  }

  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes an instruction record by id.
 *
 * @param {string} id Instruction id to delete
 * @returns {Promise<boolean>} True if deleted; false if not found
 */
async function deleteInstruction(id) {
  const existing = instructionsById.get(id);
  if (!existing) return false;

  instructionsById.delete(id);
  if (existing.slug) slugToId.delete(existing.slug);

  return true;
}

/**
 * PUBLIC_INTERFACE
 * Clears all instructions from the in-memory store (including slug index).
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  instructionsById.clear();
  slugToId.clear();
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

