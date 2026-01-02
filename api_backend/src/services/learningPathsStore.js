'use strict';

const LearningPath = require('../db/models/LearningPath');
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
 * Creates and stores a Learning Path record.
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

  try {
    const created = await LearningPath.create({ ...record, learningPathName });
    return normalizeForApi(created);
  } catch (err) {
    throw mapMongoError(
      err,
      'DUPLICATE_LEARNING_PATH_NAME',
      'Learning Path with this learningPathName already exists.'
    );
  }
}

/**
 * PUBLIC_INTERFACE
 * Lists all stored Learning Paths.
 *
 * @returns {Promise<object[]>} Array of records
 */
async function listLearningPaths() {
  const docs = await LearningPath.find({}, { _id: 0 }).lean();
  return docs.map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Gets a Learning Path by learningPathName.
 *
 * @param {string} learningPathName Unique Learning Path name
 * @returns {Promise<object|undefined>} Record if found; otherwise undefined.
 */
async function getLearningPathByName(learningPathName) {
  if (typeof learningPathName !== 'string' || learningPathName.trim().length === 0) return undefined;
  const doc = await LearningPath.findOne({ learningPathName: learningPathName.trim() }, { _id: 0 }).lean();
  return doc ? normalizeForApi(doc) : undefined;
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
  if (typeof learningPathName !== 'string' || learningPathName.trim().length === 0) return undefined;

  const existing = await LearningPath.findOne({ learningPathName: learningPathName.trim() }).lean();
  if (!existing) return undefined;

  try {
    const updated = await LearningPath.findOneAndUpdate(
      { learningPathName: learningPathName.trim() },
      { ...replacement, learningPathName: learningPathName.trim(), createdAt: existing.createdAt },
      { new: true, runValidators: false }
    );
    return updated ? normalizeForApi(updated) : undefined;
  } catch (err) {
    throw mapMongoError(
      err,
      'DUPLICATE_LEARNING_PATH_NAME',
      'Learning Path with this learningPathName already exists.'
    );
  }
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
  if (typeof learningPathName !== 'string' || learningPathName.trim().length === 0) return undefined;

  const safePatch = { ...(patch || {}) };
  if ('learningPathName' in safePatch) delete safePatch.learningPathName;

  const updated = await LearningPath.findOneAndUpdate(
    { learningPathName: learningPathName.trim() },
    { $set: safePatch },
    { new: true, runValidators: false }
  );

  return updated ? normalizeForApi(updated) : undefined;
}

/**
 * PUBLIC_INTERFACE
 * Deletes a Learning Path record by learningPathName.
 *
 * @param {string} learningPathName Name to delete
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteLearningPath(learningPathName) {
  if (typeof learningPathName !== 'string' || learningPathName.trim().length === 0) return false;
  const res = await LearningPath.deleteOne({ learningPathName: learningPathName.trim() });
  return (res.deletedCount || 0) > 0;
}

/**
 * PUBLIC_INTERFACE
 * Clears all learning paths from the store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  await LearningPath.deleteMany({});
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
