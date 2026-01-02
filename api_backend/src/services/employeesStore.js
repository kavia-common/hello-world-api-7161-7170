'use strict';

const Employee = require('../db/models/Employee');
const { mapMongoError } = require('../db/mongoErrors');

/**
 * Normalizes a Mongo document (or plain object) to match the API response style.
 *
 * @param {any} employee
 * @returns {object|any}
 */
function normalizeForApi(employee) {
  if (!employee || typeof employee !== 'object') return employee;

  const obj = typeof employee.toJSON === 'function' ? employee.toJSON() : { ...employee };

  // Ensure timestamps are ISO strings
  if (obj.createdAt instanceof Date) obj.createdAt = obj.createdAt.toISOString();
  if (obj.updatedAt instanceof Date) obj.updatedAt = obj.updatedAt.toISOString();

  return obj;
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
  const employeeId = employee && typeof employee.employeeId === 'string' ? employee.employeeId : undefined;

  if (!employeeId) {
    const err = new Error('employeeId is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  try {
    const created = await Employee.create({
      ...employee,
      employeeId,
    });
    return normalizeForApi(created);
  } catch (err) {
    throw mapMongoError(err, 'DUPLICATE_EMPLOYEE_ID', 'Employee with this employeeId already exists.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Returns all stored employees.
 *
 * @returns {Promise<object[]>} Array of employee records.
 */
async function listEmployees() {
  const docs = await Employee.find({}, { _id: 0 }).lean();
  return docs.map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Finds an employee by employeeId.
 *
 * @param {string} employeeId Employee ID to look up.
 * @returns {Promise<object|undefined>} Employee record if found; otherwise undefined.
 */
async function getEmployeeById(employeeId) {
  if (typeof employeeId !== 'string' || employeeId.trim().length === 0) return undefined;
  const doc = await Employee.findOne({ employeeId: employeeId.trim() }, { _id: 0 }).lean();
  return doc ? normalizeForApi(doc) : undefined;
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing employee record by employeeId.
 *
 * Preserves createdAt.
 *
 * @param {string} employeeId Employee ID to replace.
 * @param {object} replacement Replacement employee record.
 * @returns {Promise<object|undefined>} Updated employee if found; otherwise undefined.
 */
async function replaceEmployee(employeeId, replacement) {
  if (typeof employeeId !== 'string' || employeeId.trim().length === 0) return undefined;

  const existing = await Employee.findOne({ employeeId: employeeId.trim() }).lean();
  if (!existing) return undefined;

  // Preserve createdAt from existing. updatedAt will be updated by mongoose timestamps.
  try {
    const updated = await Employee.findOneAndUpdate(
      { employeeId: employeeId.trim() },
      {
        ...replacement,
        employeeId: employeeId.trim(),
        createdAt: existing.createdAt,
      },
      { new: true, runValidators: false }
    );
    return updated ? normalizeForApi(updated) : undefined;
  } catch (err) {
    throw mapMongoError(err, 'DUPLICATE_EMPLOYEE_ID', 'Employee with this employeeId already exists.');
  }
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
  if (typeof employeeId !== 'string' || employeeId.trim().length === 0) return undefined;

  const safePatch = { ...(patch || {}) };
  if ('employeeId' in safePatch) delete safePatch.employeeId;

  const updated = await Employee.findOneAndUpdate(
    { employeeId: employeeId.trim() },
    { $set: safePatch },
    { new: true, runValidators: false }
  );

  return updated ? normalizeForApi(updated) : undefined;
}

/**
 * PUBLIC_INTERFACE
 * Deletes an employee record by employeeId.
 *
 * @param {string} employeeId Employee ID to delete.
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteEmployee(employeeId) {
  if (typeof employeeId !== 'string' || employeeId.trim().length === 0) return false;
  const res = await Employee.deleteOne({ employeeId: employeeId.trim() });
  return (res.deletedCount || 0) > 0;
}

/**
 * PUBLIC_INTERFACE
 * Clears all employees from the store (MongoDB).
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  await Employee.deleteMany({});
}

module.exports = {
  createEmployee,
  listEmployees,
  getEmployeeById,
  replaceEmployee,
  patchEmployee,
  deleteEmployee,
  clearAll,
};
