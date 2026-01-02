'use strict';

const SkillFactory = require('../db/models/SkillFactory');
const { mapMongoError } = require('../db/mongoErrors');

function normalizeForApi(record) {
  if (!record || typeof record !== 'object') return record;
  const obj = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
  if (obj.createdAt instanceof Date) obj.createdAt = obj.createdAt.toISOString();
  if (obj.updatedAt instanceof Date) obj.updatedAt = obj.updatedAt.toISOString();
  return obj;
}

/**
 * PUBLIC_INTERFACE
 * Creates and stores a Skill Factory record.
 *
 * @param {object} record Skill Factory record to store
 * @returns {Promise<object>} Stored record
 * @throws {Error} If a record with the same skillFactoryId already exists.
 */
async function createSkillFactory(record) {
  const skillFactoryId = record && typeof record.skillFactoryId === 'string' ? record.skillFactoryId : undefined;

  if (!skillFactoryId) {
    const err = new Error('skillFactoryId is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  try {
    const created = await SkillFactory.create({ ...record, skillFactoryId });
    return normalizeForApi(created);
  } catch (err) {
    throw mapMongoError(err, 'DUPLICATE_SKILL_FACTORY_ID', 'Skill Factory with this skillFactoryId already exists.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Lists all stored Skill Factory records.
 *
 * @returns {Promise<object[]>} Array of records
 */
async function listSkillFactories() {
  const docs = await SkillFactory.find({}, { _id: 0 }).lean();
  return docs.map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Finds a Skill Factory by id.
 *
 * @param {string} skillFactoryId Skill Factory ID to look up.
 * @returns {Promise<object|undefined>} Record if found, otherwise undefined.
 */
async function getSkillFactoryById(skillFactoryId) {
  if (typeof skillFactoryId !== 'string' || skillFactoryId.trim().length === 0) return undefined;
  const doc = await SkillFactory.findOne({ skillFactoryId: skillFactoryId.trim() }, { _id: 0 }).lean();
  return doc ? normalizeForApi(doc) : undefined;
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing Skill Factory record by id.
 *
 * Preserves createdAt.
 *
 * @param {string} skillFactoryId Skill Factory ID to replace.
 * @param {object} replacement Replacement record.
 * @returns {Promise<object|undefined>} Updated record if found, otherwise undefined.
 */
async function replaceSkillFactory(skillFactoryId, replacement) {
  if (typeof skillFactoryId !== 'string' || skillFactoryId.trim().length === 0) return undefined;

  const existing = await SkillFactory.findOne({ skillFactoryId: skillFactoryId.trim() }).lean();
  if (!existing) return undefined;

  try {
    const updated = await SkillFactory.findOneAndUpdate(
      { skillFactoryId: skillFactoryId.trim() },
      { ...replacement, skillFactoryId: skillFactoryId.trim(), createdAt: existing.createdAt },
      { new: true, runValidators: false }
    );
    return updated ? normalizeForApi(updated) : undefined;
  } catch (err) {
    throw mapMongoError(err, 'DUPLICATE_SKILL_FACTORY_ID', 'Skill Factory with this skillFactoryId already exists.');
  }
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
  if (typeof skillFactoryId !== 'string' || skillFactoryId.trim().length === 0) return undefined;

  const safePatch = { ...(patch || {}) };
  if ('skillFactoryId' in safePatch) delete safePatch.skillFactoryId;

  const updated = await SkillFactory.findOneAndUpdate(
    { skillFactoryId: skillFactoryId.trim() },
    { $set: safePatch },
    { new: true, runValidators: false }
  );

  return updated ? normalizeForApi(updated) : undefined;
}

/**
 * PUBLIC_INTERFACE
 * Deletes a Skill Factory record by id.
 *
 * @param {string} skillFactoryId Skill Factory ID to delete.
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteSkillFactory(skillFactoryId) {
  if (typeof skillFactoryId !== 'string' || skillFactoryId.trim().length === 0) return false;
  const res = await SkillFactory.deleteOne({ skillFactoryId: skillFactoryId.trim() });
  return (res.deletedCount || 0) > 0;
}

/**
 * PUBLIC_INTERFACE
 * Clears all skill factories from the store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  await SkillFactory.deleteMany({});
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
