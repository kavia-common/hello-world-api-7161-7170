'use strict';

/**
 * Simple in-memory employee store.
 *
 * Notes:
 * - Data is reset whenever the server restarts.
 * - This module preserves the same async API as the previous MongoDB implementation
 *   so controllers/routes can remain unchanged.
 */

/** @type {Map<string, any>} */
const employeesById = new Map();

/**
 * Creates a shallow clone and ensures timestamps are ISO strings.
 *
 * @param {object} employee Employee record
 * @returns {object} Normalized record for API responses
 */
function normalizeForApi(employee) {
  if (!employee || typeof employee !== 'object') return employee;

  const createdAt =
    employee.createdAt instanceof Date
      ? employee.createdAt.toISOString()
      : typeof employee.createdAt === 'string'
        ? employee.createdAt
        : undefined;

  const updatedAt =
    employee.updatedAt instanceof Date
      ? employee.updatedAt.toISOString()
      : typeof employee.updatedAt === 'string'
        ? employee.updatedAt
        : undefined;

  // Avoid returning undefined timestamps if not set
  const result = { ...employee };
  if (createdAt) result.createdAt = createdAt;
  if (updatedAt) result.updatedAt = updatedAt;

  return result;
}

/**
 * PUBLIC_INTERFACE
 * Creates and stores an employee record in-memory.
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
    // Controllers already validate, but keep a defensive check here.
    const err = new Error('employeeId is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (employeesById.has(employeeId)) {
    const e = new Error('Employee with this employeeId already exists.');
    e.code = 'DUPLICATE_EMPLOYEE_ID';
    throw e;
  }

  const now = new Date();
  const record = {
    ...employee,
    employeeId,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  employeesById.set(employeeId, record);
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Returns all stored employees.
 *
 * @returns {Promise<object[]>} Array of employee records.
 */
async function listEmployees() {
  return Array.from(employeesById.values()).map(normalizeForApi);
}

/**
 * PUBLIC_INTERFACE
 * Finds an employee by employeeId.
 *
 * @param {string} employeeId Employee ID to look up.
 * @returns {Promise<object|undefined>} Employee record if found; otherwise undefined.
 */
async function getEmployeeById(employeeId) {
  const record = employeesById.get(employeeId);
  if (!record) return undefined;
  return normalizeForApi(record);
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing employee record by employeeId.
 *
 * Preserves the original createdAt timestamp.
 *
 * @param {string} employeeId Employee ID to replace.
 * @param {object} replacement Replacement employee record.
 * @returns {Promise<object|undefined>} Updated employee if found; otherwise undefined.
 */
async function replaceEmployee(employeeId, replacement) {
  const existing = employeesById.get(employeeId);
  if (!existing) return undefined;

  const now = new Date();

  const record = {
    ...replacement,
    employeeId,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  employeesById.set(employeeId, record);
  return normalizeForApi(record);
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
  const existing = employeesById.get(employeeId);
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  // Prevent accidental employeeId overwrite
  if ('employeeId' in safePatch) delete safePatch.employeeId;

  const now = new Date();

  const updated = {
    ...existing,
    ...safePatch,
    employeeId,
    // Keep original createdAt, but bump updatedAt
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  };

  employeesById.set(employeeId, updated);
  return normalizeForApi(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes an employee record by employeeId.
 *
 * @param {string} employeeId Employee ID to delete.
 * @returns {Promise<boolean>} True if deleted; false if not found.
 */
async function deleteEmployee(employeeId) {
  return employeesById.delete(employeeId);
}

/**
 * PUBLIC_INTERFACE
 * Clears all employees from the in-memory store.
 *
 * @returns {Promise<void>} resolves when cleared
 */
async function clearAll() {
  employeesById.clear();
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
