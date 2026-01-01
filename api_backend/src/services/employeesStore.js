'use strict';

const { Employee } = require('../models/Employee');

/**
 * Maps a Mongo/Mongoose document (or plain object) into the API shape.
 * We rely on model toJSON transform; this helper ensures consistent return type.
 *
 * @param {any} doc Employee mongoose doc
 * @returns {object} API employee record
 */
function toApiEmployee(doc) {
  if (!doc) return doc;
  if (typeof doc.toJSON === 'function') return doc.toJSON();
  return doc;
}

/**
 * PUBLIC_INTERFACE
 * Creates and stores an employee record in MongoDB.
 *
 * Enforces uniqueness by `employeeId`.
 *
 * @param {object} employee - The employee record to store.
 * @returns {Promise<object>} The stored employee record.
 * @throws {Error} If an employee with the same employeeId already exists.
 */
async function createEmployee(employee) {
  try {
    const created = await Employee.create(employee);
    return toApiEmployee(created);
  } catch (err) {
    // Duplicate key error (unique index)
    if (err && (err.code === 11000 || err.code === 11001)) {
      const e = new Error('Employee with this employeeId already exists.');
      e.code = 'DUPLICATE_EMPLOYEE_ID';
      throw e;
    }
    throw err;
  }
}

/**
 * PUBLIC_INTERFACE
 * Returns all stored employees.
 *
 * @returns {Promise<object[]>} Array of employee records.
 */
async function listEmployees() {
  const docs = await Employee.find({}).lean({ virtuals: false });
  // Convert createdAt to ISO string and remove _id for lean results
  return docs.map((d) => {
    const { _id, createdAt, updatedAt, ...rest } = d;
    return {
      ...rest,
      createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
      updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : updatedAt,
    };
  });
}

/**
 * PUBLIC_INTERFACE
 * Finds an employee by employeeId.
 *
 * @param {string} employeeId Employee ID to look up.
 * @returns {Promise<object|undefined>} Employee record if found; otherwise undefined.
 */
async function getEmployeeById(employeeId) {
  const doc = await Employee.findOne({ employeeId });
  if (!doc) return undefined;
  return toApiEmployee(doc);
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing employee record by employeeId.
 *
 * Preserves the original createdAt timestamp by using update with upsert=false.
 *
 * @param {string} employeeId Employee ID to replace.
 * @param {object} replacement Replacement employee record.
 * @returns {Promise<object|undefined>} Updated employee if found; otherwise undefined.
 */
async function replaceEmployee(employeeId, replacement) {
  const updated = await Employee.findOneAndUpdate(
    { employeeId },
    {
      // Ensure path param employeeId wins
      ...replacement,
      employeeId,
    },
    {
      new: true,
      runValidators: true,
      overwrite: true,
    }
  );

  if (!updated) return undefined;
  return toApiEmployee(updated);
}

/**
 * PUBLIC_INTERFACE
 * Applies a partial update to an existing employee record by employeeId.
 *
 * @param {string} employeeId Employee ID to patch.
 * @param {object} patch Partial update object.
 * @returns {Promise<object|undefined>} Updated employee if found; otherwise undefined.
 */
async function patchEmployee(employeeId, patch) {
  // Prevent accidental employeeId overwrite
  if ('employeeId' in patch) delete patch.employeeId;

  const updated = await Employee.findOneAndUpdate({ employeeId }, patch, {
    new: true,
    runValidators: true,
  });

  if (!updated) return undefined;
  return toApiEmployee(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes an employee record by employeeId.
 *
 * @param {string} employeeId Employee ID to delete.
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteEmployee(employeeId) {
  const res = await Employee.deleteOne({ employeeId });
  return Boolean(res && res.deletedCount > 0);
}

module.exports = {
  createEmployee,
  listEmployees,
  getEmployeeById,
  replaceEmployee,
  patchEmployee,
  deleteEmployee,
};
