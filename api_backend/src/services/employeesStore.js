'use strict';

/**
 * Simple in-memory data store for employee records.
 *
 * NOTE: This store is process-local. Data will be lost on server restart.
 * If/when a database is configured, this module should be replaced with DB-backed persistence.
 */

const employees = [];

/**
 * PUBLIC_INTERFACE
 * Creates and stores an employee record in memory.
 *
 * Enforces uniqueness by `employeeId`.
 *
 * @param {object} employee - The employee record to store.
 * @returns {object} The stored employee record.
 * @throws {Error} If an employee with the same employeeId already exists.
 */
function createEmployee(employee) {
  const exists = employees.some((e) => e.employeeId === employee.employeeId);
  if (exists) {
    const err = new Error('Employee with this employeeId already exists.');
    err.code = 'DUPLICATE_EMPLOYEE_ID';
    throw err;
  }

  const stored = {
    ...employee,
    createdAt: new Date().toISOString(),
  };

  employees.push(stored);
  return stored;
}

/**
 * PUBLIC_INTERFACE
 * Returns all stored employees.
 *
 * @returns {object[]} Array of employee records.
 */
function listEmployees() {
  return employees;
}

/**
 * PUBLIC_INTERFACE
 * Finds an employee by employeeId.
 *
 * @param {string} employeeId Employee ID to look up.
 * @returns {object|undefined} Employee record if found; otherwise undefined.
 */
function getEmployeeById(employeeId) {
  return employees.find((e) => e.employeeId === employeeId);
}

/**
 * PUBLIC_INTERFACE
 * Replaces an existing employee record by employeeId.
 *
 * Preserves the original createdAt timestamp.
 *
 * @param {string} employeeId Employee ID to replace.
 * @param {object} replacement Replacement employee record.
 * @returns {object|undefined} Updated employee if found; otherwise undefined.
 */
function replaceEmployee(employeeId, replacement) {
  const idx = employees.findIndex((e) => e.employeeId === employeeId);
  if (idx === -1) return undefined;

  const existing = employees[idx];
  const updated = {
    ...replacement,
    employeeId,
    createdAt: existing.createdAt,
  };

  employees[idx] = updated;
  return updated;
}

/**
 * PUBLIC_INTERFACE
 * Applies a partial update to an existing employee record by employeeId.
 *
 * Preserves employeeId and createdAt.
 *
 * @param {string} employeeId Employee ID to patch.
 * @param {object} patch Partial update object.
 * @returns {object|undefined} Updated employee if found; otherwise undefined.
 */
function patchEmployee(employeeId, patch) {
  const idx = employees.findIndex((e) => e.employeeId === employeeId);
  if (idx === -1) return undefined;

  const existing = employees[idx];
  const updated = {
    ...existing,
    ...patch,
    employeeId: existing.employeeId,
    createdAt: existing.createdAt,
  };

  employees[idx] = updated;
  return updated;
}

/**
 * PUBLIC_INTERFACE
 * Deletes an employee record by employeeId.
 *
 * @param {string} employeeId Employee ID to delete.
 * @returns {boolean} True if deleted; false if not found.
 */
function deleteEmployee(employeeId) {
  const idx = employees.findIndex((e) => e.employeeId === employeeId);
  if (idx === -1) return false;
  employees.splice(idx, 1);
  return true;
}

module.exports = {
  createEmployee,
  listEmployees,
  getEmployeeById,
  replaceEmployee,
  patchEmployee,
  deleteEmployee,
};
