'use strict';

const jwt = require('jsonwebtoken');

/**
 * Extracts the bearer token from an Authorization header.
 *
 * @param {unknown} authorizationHeader Header value
 * @returns {string|null} The token if present, else null.
 */
function extractBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string' || authorizationHeader.trim().length === 0) return null;

  const [scheme, token] = authorizationHeader.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

/**
 * Reads JWT secret from environment.
 *
 * IMPORTANT:
 * - Do not hardcode secrets. Provide JWT_SECRET via environment variables.
 *
 * @returns {string} JWT secret
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || secret.trim().length === 0) {
    // Treat as server misconfiguration; we still respond safely.
    const err = new Error('JWT_SECRET is not configured.');
    err.code = 'CONFIG_ERROR';
    throw err;
  }
  return secret;
}

/**
 * Standardized JSON error response helper to keep auth/role responses consistent.
 *
 * @param {import('express').Response} res Express response
 * @param {number} statusCode HTTP status code
 * @param {string} message Error message
 * @returns {import('express').Response} Response
 */
function sendAuthError(res, statusCode, message) {
  return res.status(statusCode).json({
    status: 'error',
    message,
  });
}

/**
 * PUBLIC_INTERFACE
 * Express middleware that verifies a JWT from `Authorization: Bearer <token>`.
 *
 * Behavior:
 * - On success: attaches `req.user = { username, role, iat, exp }` and calls next().
 * - On missing/invalid token: returns 401 JSON error.
 *
 * JWT claims expected:
 * - sub: username
 * - role: user role (admin|manager|user)
 *
 * Environment variables:
 * - JWT_SECRET (required): secret used to verify JWTs
 *
 * @param {import('express').Request} req Express request
 * @param {import('express').Response} res Express response
 * @param {import('express').NextFunction} next Next middleware
 * @returns {void}
 */
function verifyJwt(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      sendAuthError(res, 401, 'Missing or invalid Authorization header.');
      return;
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);

    // jsonwebtoken can return a string for some legacy cases; we only accept object payloads.
    if (!decoded || typeof decoded !== 'object') {
      sendAuthError(res, 401, 'Invalid or expired token.');
      return;
    }

    const username = typeof decoded.sub === 'string' ? decoded.sub : undefined;
    const role = typeof decoded.role === 'string' ? decoded.role : undefined;

    if (!username || !role) {
      sendAuthError(res, 401, 'Invalid or expired token.');
      return;
    }

    // Attach normalized user info to request for downstream handlers/guards.
    req.user = {
      username,
      role,
      iat: typeof decoded.iat === 'number' ? decoded.iat : undefined,
      exp: typeof decoded.exp === 'number' ? decoded.exp : undefined,
    };

    next();
  } catch (err) {
    // Hide configuration/internal details from clients.
    if (err && err.code === 'CONFIG_ERROR') {
      sendAuthError(res, 500, 'Internal Server Error');
      return;
    }

    // Includes TokenExpiredError, JsonWebTokenError, NotBeforeError, etc.
    sendAuthError(res, 401, 'Invalid or expired token.');
  }
}

/**
 * PUBLIC_INTERFACE
 * Creates a role-based guard middleware.
 *
 * Usage:
 *   router.delete('/resource/:id', verifyJwt, requireRole(['admin']), handler)
 *
 * Behavior:
 * - Requires `req.user` (so it should be used after verifyJwt).
 * - Returns 403 if user's role is not in allowedRoles.
 *
 * @param {string[]} allowedRoles Allowed roles for the endpoint
 * @returns {import('express').RequestHandler} Express middleware
 */
function requireRole(allowedRoles) {
  const normalizedAllowedRoles = Array.isArray(allowedRoles)
    ? allowedRoles.filter((r) => typeof r === 'string' && r.trim().length > 0).map((r) => r.trim())
    : [];

  return (req, res, next) => {
    const user = req.user;

    // If verifyJwt wasn't run (or failed to attach), treat as unauthorized.
    if (!user || typeof user !== 'object') {
      sendAuthError(res, 401, 'Missing or invalid token.');
      return;
    }

    if (!normalizedAllowedRoles.includes(user.role)) {
      sendAuthError(res, 403, 'Forbidden: insufficient role.');
      return;
    }

    next();
  };
}

module.exports = {
  verifyJwt,
  requireRole,
};
