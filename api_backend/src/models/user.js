'use strict';

/**
 * User model helpers (no persistence).
 *
 * This project uses in-memory stores for persistence; this file provides the
 * canonical shape/validation for a User record.
 */

/** @typedef {'admin'|'manager'|'user'} UserRole */

/** @type {ReadonlyArray<UserRole>} */
const USER_ROLES = Object.freeze(['admin', 'manager', 'user']);

/**
 * PUBLIC_INTERFACE
 * Returns true if the provided value is a valid user role.
 *
 * @param {unknown} role Candidate role value
 * @returns {role is UserRole} True if role is one of: admin|manager|user
 */
function isValidUserRole(role) {
  return typeof role === 'string' && USER_ROLES.includes(role);
}

/**
 * PUBLIC_INTERFACE
 * Validates the core required fields for creating a user.
 *
 * This does not hash passwords; it validates that the store receives a `passwordHash`
 * (string) and an allowed `role`.
 *
 * @param {object} user Candidate user record
 * @returns {{ok: true} | {ok: false, error: string}} Validation result
 */
function validateNewUser(user) {
  if (!user || typeof user !== 'object') {
    return { ok: false, error: 'User payload must be an object.' };
  }

  if (typeof user.username !== 'string' || user.username.trim().length === 0) {
    return { ok: false, error: 'username is required.' };
  }

  if (typeof user.passwordHash !== 'string' || user.passwordHash.trim().length === 0) {
    return { ok: false, error: 'passwordHash is required.' };
  }

  if (!isValidUserRole(user.role)) {
    return { ok: false, error: 'role must be one of [\'admin\',\'manager\',\'user\'].' };
  }

  return { ok: true };
}

module.exports = {
  USER_ROLES,
  isValidUserRole,
  validateNewUser,
};
