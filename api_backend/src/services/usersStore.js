'use strict';

const { validateNewUser, isValidUserRole } = require('../models/user');

/**
 * Simple in-memory Users store.
 *
 * Notes:
 * - Data resets whenever the server restarts.
 * - This mirrors the async API style used by other stores in src/services.
 * - Enforces uniqueness by `username` (case-sensitive).
 */

/** @type {Map<string, {username: string, passwordHash: string, role: 'admin'|'manager'|'user', createdAt: string, updatedAt: string}>} */
const usersByUsername = new Map();

/**
 * Creates a safe clone for API responses / callers.
 * (Intentionally keeps passwordHash; auth controllers can omit it later.)
 *
 * @param {object} record Stored user record
 * @returns {object} Cloned record
 */
function normalizeForReturn(record) {
  if (!record || typeof record !== 'object') return record;
  return { ...record };
}

/**
 * PUBLIC_INTERFACE
 * Creates and stores a user in-memory.
 *
 * Enforces uniqueness by `username`.
 *
 * @param {{username: string, passwordHash: string, role: 'admin'|'manager'|'user'}} user User to store
 * @returns {Promise<object>} Stored user record
 * @throws {Error} If validation fails or username already exists
 */
async function createUser(user) {
  const validation = validateNewUser(user);
  if (!validation.ok) {
    const err = new Error(validation.error);
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const username = user.username.trim();

  if (usersByUsername.has(username)) {
    const err = new Error('User with this username already exists.');
    err.code = 'DUPLICATE_USERNAME';
    throw err;
  }

  const now = new Date().toISOString();
  const record = {
    username,
    passwordHash: user.passwordHash,
    role: user.role,
    createdAt: now,
    updatedAt: now,
  };

  usersByUsername.set(username, record);
  return normalizeForReturn(record);
}

/**
 * PUBLIC_INTERFACE
 * Finds a user by username.
 *
 * @param {string} username Username to look up
 * @returns {Promise<object|undefined>} User record if found; otherwise undefined
 */
async function findByUsername(username) {
  if (typeof username !== 'string' || username.trim().length === 0) return undefined;
  const record = usersByUsername.get(username.trim());
  if (!record) return undefined;
  return normalizeForReturn(record);
}

/**
 * PUBLIC_INTERFACE
 * Updates an existing user by username.
 *
 * Only `passwordHash` and `role` can be updated. `username` is immutable.
 *
 * @param {string} username Username to update
 * @param {{passwordHash?: string, role?: 'admin'|'manager'|'user'}} patch Patch fields
 * @returns {Promise<object|undefined>} Updated user if found; otherwise undefined
 * @throws {Error} If patch is invalid (e.g., role not allowed)
 */
async function updateUser(username, patch) {
  if (typeof username !== 'string' || username.trim().length === 0) return undefined;

  const key = username.trim();
  const existing = usersByUsername.get(key);
  if (!existing) return undefined;

  const safePatch = { ...(patch || {}) };
  if ('username' in safePatch) delete safePatch.username;

  if ('role' in safePatch && safePatch.role !== undefined && !isValidUserRole(safePatch.role)) {
    const err = new Error('role must be one of [\'admin\',\'manager\',\'user\'].');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (
    'passwordHash' in safePatch &&
    safePatch.passwordHash !== undefined &&
    (typeof safePatch.passwordHash !== 'string' || safePatch.passwordHash.trim().length === 0)
  ) {
    const err = new Error('passwordHash must be a non-empty string when provided.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const updated = {
    ...existing,
    ...safePatch,
    username: existing.username,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  usersByUsername.set(key, updated);
  return normalizeForReturn(updated);
}

/**
 * PUBLIC_INTERFACE
 * Deletes a user by username.
 *
 * @param {string} username Username to delete
 * @returns {Promise<boolean>} True if deleted; false if not found
 */
async function deleteUser(username) {
  if (typeof username !== 'string' || username.trim().length === 0) return false;
  return usersByUsername.delete(username.trim());
}

module.exports = {
  createUser,
  findByUsername,
  updateUser,
  deleteUser,
};
