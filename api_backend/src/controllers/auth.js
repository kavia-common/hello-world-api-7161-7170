'use strict';

const bcrypt = require('bcrypt');
const usersStore = require('../services/usersStore');
const { isValidUserRole } = require('../models/user');

const ALLOWED_ROLES_MESSAGE = 'role must be one of [\'admin\',\'manager\',\'user\'].';

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

module.exports = {
  signup,
};
