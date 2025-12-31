const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * PUBLIC_INTERFACE
 * Controller for authentication endpoints.
 */
class AuthController {
  /**
   * PUBLIC_INTERFACE
   * POST /signup
   * Creates a new user account with a securely hashed password.
   *
   * Expected JSON body:
   * - username: string
   * - password: string
   *
   * Returns:
   * - 201 on success
   * - 409 if username already exists
   * - 400 for validation errors
   */
  async signup(req, res, next) {
    try {
      const { username, password } = req.body || {};

      if (
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        username.trim().length < 3 ||
        password.length < 8
      ) {
        return res.status(400).json({
          status: 'error',
          message:
            'Invalid request body. Provide username (min 3 chars) and password (min 8 chars).',
        });
      }

      const normalizedUsername = username.trim();

      const existing = await User.findOne({ username: normalizedUsername })
        .lean()
        .exec();
      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists.',
        });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
      await User.create({ username: normalizedUsername, passwordHash });

      return res.status(201).json({
        status: 'success',
        message: 'User created successfully.',
      });
    } catch (err) {
      // Handle duplicate key race condition (unique index)
      if (err && err.code === 11000) {
        return res.status(409).json({
          status: 'error',
          message: 'Username already exists.',
        });
      }
      return next(err);
    }
  }

  /**
   * PUBLIC_INTERFACE
   * POST /login
   * Validates user credentials and returns a signed JWT on success.
   *
   * Expected JSON body:
   * - username: string
   * - password: string
   *
   * Environment variables:
   * - JWT_SECRET: secret used to sign tokens (required)
   * - JWT_EXPIRES_IN: token expiration (optional; default 1h)
   *
   * Returns:
   * - 200 with { token } on success
   * - 401 if credentials are invalid
   * - 400 for validation errors
   */
  async login(req, res, next) {
    try {
      const { username, password } = req.body || {};
      if (typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request body. Provide username and password.',
        });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        // Misconfiguration - treat as server error (no secrets should be hardcoded)
        return res.status(500).json({
          status: 'error',
          message: 'Server misconfigured: JWT_SECRET is not set.',
        });
      }

      const normalizedUsername = username.trim();
      const user = await User.findOne({ username: normalizedUsername }).exec();
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password.',
        });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid username or password.',
        });
      }

      const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
      const token = jwt.sign(
        { sub: String(user._id), username: user.username },
        jwtSecret,
        { expiresIn }
      );

      return res.status(200).json({
        status: 'success',
        token,
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new AuthController();
