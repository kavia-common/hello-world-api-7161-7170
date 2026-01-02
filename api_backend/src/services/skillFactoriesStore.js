'use strict';

/**
 * Simple in-memory Skill Factory store.
 *
 * Notes:
 * - Data is reset whenever the server restarts.
 * - This module mirrors the employeesStore async API style so controllers can remain simple.
 * - The SkillFactory schema is enforced in controllers; the store keeps records as provided.
 */

/** @type {Map<string, any>} */
const skillFactoriesById = new Map();

/**
 * Normalizes timestamps to ISO strings for API responses.
 *
 * @param {object} record Skill Factory record
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
 * Creates and stores a Skill Factory record in-memory.
 *
 * @param {object} record Skill Factory record to store
 * @returns {Promise<object>} Stored record
 * @throws {Error} If a record with the same skillFactoryId already exists.
 */
async function createSkillFactory(record) {
  const skillFactoryId =
    record && typeof record.skillFactoryId === 'string' ? record.skillFactoryId : undefined;

  if (!skillFactoryId) {
    const err = new Error('skillFactoryId is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (skillFactoriesById.has(skillFactoryId)) {
    const err = new Error('Skill Factory with this skillFactoryId already exists.');
    err.code = 'DUPLICATE_SKILL_FACTORY_ID';
    throw err;
  }

  const now = new Date();
  const stored = {
    ...record,
    skillFactoryId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  skillFactoriesById.set(skillFactoryId, stored);
  return normalizeForApi(stored);
}

/**
 * PUBLIC_INTERFACE
 * Lists all stored Skill Factory records.
 *
 * @returns {Promise<object[]>} Array of records
 */
async function listSkillFactories() {
  return Array.from(skillFactoriesById.values()).map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Finds a Skill Factory by id.
 *
 * @param {string} skillFactoryId Skill Factory ID to look up.
 * @returns {Promise<object|undefined>} Record if found, otherwise undefined.
 */
async function getSkillFactoryById(skillFactoryId) {
  const record = skillFactoriesById.get(skillFactoryId);
  if (!record) return undefined;
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing Skill Factory record by id.
 *
 * Preserves the original createdAt.
 *
 * @param {string} skillFactoryId Skill Factory ID to replace.
 * @param {object} replacement Replacement record.
 * @returns {Promise<object|undefined>} Updated record if found, otherwise undefined.
 */
async function replaceSkillFactory(skillFactoryId, replacement) {
  const existing = skillFactoriesById.get(skillFactoryId);
  if (!existing) return undefined;

  const now = new Date();
  const updated = {
    ...replacement,
    skillFactoryId,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  skillFactoriesById.set(skillFactoryId, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Applies a partial update to an existing Skill Factory record by id.
 *
 * @param {string} skillFactoryId Skill Factory ID to patch.
 * @param {object} patch Partial update object.
 * @returns {Promise<object|undefined>} Updated record if found, otherwise undefined.
 */
async function patchSkillFactory(skillFactoryId, patch) {
  const existing = skillFactoriesById.get(skillFactoryId);
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  // Prevent accidental id overwrite
  if ('skillFactoryId' in safePatch) delete safePatch.skillFactoryId;

  const now = new Date();
  const updated = {
    ...existing,
    ...safePatch,
    skillFactoryId,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  skillFactoriesById.set(skillFactoryId, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes a Skill Factory record by id.
 *
 * @param {string} skillFactoryId Skill Factory ID to delete.
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteSkillFactory(skillFactoryId) {
  return skillFactoriesById.delete(skillFactoryId);
}

/**
 * PUBLIC_INTERFACE
 * Clears all skill factories from the in-memory store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  skillFactoriesById.clear();
}

module.exports = {
  createSkillFactory,
  listSkillFactories,
  getSkillFactoryById,
  replaceSkillFactory,
  patchSkillFactory,
  deleteSkillFactory,
  clearAll,
};
