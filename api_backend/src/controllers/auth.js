'use strict';

const bcrypt = require('bcrypt');
const usersStore = require('../services/usersStore');
const { isValidUserRole } = require('../models/user');
const { signAuthToken } = require('../utils/jwt');

const ALLOWED_ROLES_MESSAGE = 'role must be one of [\'admin\',\'manager\',\'user\'].';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid username or password.';

/**
 * PUBLIC_INTERFACE
 * POST /signup
 *
 * Creates a new user (in-memory).
 *
 * Validates request body:
 * - username: required non-empty string
 * - password: required non-empty string
 * - role: required enum: admin|manager|user
 *
 * Hashes the password using bcrypt and stores as `passwordHash`.
 *
 * Error cases:
 * - 400: invalid payload / role invalid
 * - 409: duplicate username
 * - 500: unexpected errors
 *
 * Success:
 * - 201: returns minimal user info { username, role, createdAt }
 *
 * @param {import('express').Request} req Express request
 * @param {import('express').Response} res Express response
 * @returns {Promise<void>} No return value; writes HTTP response
 */
async function signup(req, res) {
  try {
    const body = req.body ?? {};
    const { username, password, role } = body;

    // Validate username
    if (typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'username is required.',
      });
    }

    // Validate password
    if (typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'password is required.',
      });
    }

    // Validate role enum
    if (!isValidUserRole(role)) {
      return res.status(400).json({
        status: 'error',
        message: ALLOWED_ROLES_MESSAGE,
      });
    }

    const normalizedUsername = username.trim();

    // Hash password (bcrypt automatically generates a salt when using saltRounds)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Store user (usersStore enforces uniqueness and validates passwordHash/role)
    const created = await usersStore.createUser({
      username: normalizedUsername,
      passwordHash,
      role,
    });

    // Minimal response (no password fields)
    return res.status(201).json({
      status: 'success',
      data: {
        username: created.username,
        role: created.role,
        createdAt: created.createdAt,
      },
    });
  } catch (err) {
    // Duplicate username -> 409
    if (err && err.code === 'DUPLICATE_USERNAME') {
      return res.status(409).json({
        status: 'error',
        message: err.message || 'User with this username already exists.',
      });
    }

    // Validation errors coming from store/model -> 400
    if (err && err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({
        status: 'error',
        message: err.message || 'Invalid request.',
      });
    }

    // Unexpected error -> 500 (let app-level error handler log stack too)
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
}

/**
 * PUBLIC_INTERFACE
 * POST /login
 *
 * Authenticates a user (in-memory).
 *
 * Validates request body:
 * - username: required non-empty string
 * - password: required non-empty string
 *
 * Looks up the user in usersStore and validates the password using bcrypt.compare
 * against the stored passwordHash.
 *
 * Success:
 * - 200: returns { token, user: { username, role } } where token is a JWT
 *         with claims { sub: username, role }.
 *
 * Error cases:
 * - 400: missing username/password
 * - 401: invalid credentials (username not found or wrong password)
 * - 500: unexpected errors / misconfiguration
 *
 * Environment variables:
 * - JWT_SECRET (required): secret used to sign JWTs
 * - JWT_EXPIRES_IN (optional): e.g. "1h", "7d" (default: "1h")
 *
 * @param {import('express').Request} req Express request
 * @param {import('express').Response} res Express response
 * @returns {Promise<void>} No return value; writes HTTP response
 */
async function login(req, res) {
  try {
    const body = req.body ?? {};
    const { username, password } = body;

    if (typeof username !== 'string' || username.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'username is required.',
      });
    }

    if (typeof password !== 'string' || password.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'password is required.',
      });
    }

    const normalizedUsername = username.trim();
    const user = await usersStore.findByUsername(normalizedUsername);

    // Defensive checks:
    // - Always return a generic 401 for "not found" / "no passwordHash" / "wrong password"
    //   to avoid leaking whether a username exists.
    // - Only call bcrypt.compare with strings; skip compare if passwordHash is missing/falsy.
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: INVALID_CREDENTIALS_MESSAGE,
      });
    }

    const passwordHash = user.passwordHash;

    // Treat null/undefined/empty/non-string passwordHash as invalid credentials (not a server error).
    if (typeof passwordHash !== 'string' || passwordHash.trim().length === 0) {
      return res.status(401).json({
        status: 'error',
        message: INVALID_CREDENTIALS_MESSAGE,
      });
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, passwordHash);
    } catch (compareErr) {
      // bcrypt can throw if inputs are unexpected/corrupted; do not leak details.
      console.error('Login bcrypt.compare failed:', compareErr);
      ok = false;
    }

    if (!ok) {
      return res.status(401).json({
        status: 'error',
        message: INVALID_CREDENTIALS_MESSAGE,
      });
    }

    const userSummary = { username: user.username, role: user.role };
    const token = signAuthToken(userSummary);

    // Preserve successful response shape exactly.
    return res.status(200).json({
      token,
      user: userSummary,
    });
  } catch (err) {
    // Log internally for debugging, but keep responses generic to avoid leaking sensitive info.
    console.error('Login unexpected error:', err);

    // Missing JWT config or similar -> 500 (server issue, not client)
    if (err && err.code === 'CONFIG_ERROR') {
      return res.status(500).json({
        status: 'error',
        message: 'Internal Server Error',
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  }
}

module.exports = {
  signup,
  login,
};
