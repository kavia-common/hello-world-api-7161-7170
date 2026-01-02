'use strict';

const Assessment = require('../db/models/Assessment');
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
 * Creates and stores an Assessment record.
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

  try {
    const created = await Assessment.create({ ...record, assessmentId });
    return normalizeForApi(created);
  } catch (err) {
    throw mapMongoError(err, 'DUPLICATE_ASSESSMENT_ID', 'Assessment with this assessmentId already exists.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Lists all stored Assessments.
 *
 * @returns {Promise<object[]>} Array of records
 */
async function listAssessments() {
  const docs = await Assessment.find({}, { _id: 0 }).lean();
  return docs.map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Gets an Assessment by assessmentId.
 *
 * @param {string} assessmentId Unique Assessment ID
 * @returns {Promise<object|undefined>} Record if found; otherwise undefined.
 */
async function getAssessmentById(assessmentId) {
  if (typeof assessmentId !== 'string' || assessmentId.trim().length === 0) return undefined;
  const doc = await Assessment.findOne({ assessmentId: assessmentId.trim() }, { _id: 0 }).lean();
  return doc ? normalizeForApi(doc) : undefined;
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
  if (typeof assessmentId !== 'string' || assessmentId.trim().length === 0) return undefined;

  const existing = await Assessment.findOne({ assessmentId: assessmentId.trim() }).lean();
  if (!existing) return undefined;

  try {
    const updated = await Assessment.findOneAndUpdate(
      { assessmentId: assessmentId.trim() },
      { ...replacement, assessmentId: assessmentId.trim(), createdAt: existing.createdAt },
      { new: true, runValidators: false }
    );
    return updated ? normalizeForApi(updated) : undefined;
  } catch (err) {
    throw mapMongoError(err, 'DUPLICATE_ASSESSMENT_ID', 'Assessment with this assessmentId already exists.');
  }
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
  if (typeof assessmentId !== 'string' || assessmentId.trim().length === 0) return undefined;

  const safePatch = { ...(patch || {}) };
  if ('assessmentId' in safePatch) delete safePatch.assessmentId;

  const updated = await Assessment.findOneAndUpdate(
    { assessmentId: assessmentId.trim() },
    { $set: safePatch },
    { new: true, runValidators: false }
  );

  return updated ? normalizeForApi(updated) : undefined;
}

/**
 * PUBLIC_INTERFACE
 * Deletes an Assessment record by assessmentId.
 *
 * @param {string} assessmentId Assessment ID to delete
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteAssessment(assessmentId) {
  if (typeof assessmentId !== 'string' || assessmentId.trim().length === 0) return false;
  const res = await Assessment.deleteOne({ assessmentId: assessmentId.trim() });
  return (res.deletedCount || 0) > 0;
}

/**
 * PUBLIC_INTERFACE
 * Clears all assessments from the store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  await Assessment.deleteMany({});
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
