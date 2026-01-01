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

module.exports = {
  createEmployee,
  listEmployees,
};
