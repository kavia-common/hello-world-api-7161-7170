'use strict';

const jwt = require('jsonwebtoken');

/**
 * Reads and validates JWT configuration from environment.
 *
 * IMPORTANT:
 * - Do not hardcode secrets. Provide JWT_SECRET via environment variables.
 *
 * @returns {{secret: string, expiresIn: string}} JWT config
 */
function getJwtConfig() {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';

  if (typeof secret !== 'string' || secret.trim().length === 0) {
    const err = new Error('JWT_SECRET is not configured.');
    err.code = 'CONFIG_ERROR';
    throw err;
  }

  return { secret, expiresIn };
}

/**
 * PUBLIC_INTERFACE
 * Signs a JWT for the authenticated user.
 *
 * Payload claims:
 * - sub: username
 * - role: user's role
 *
 * @param {{username: string, role: 'admin'|'manager'|'user'}} user User summary to embed in JWT claims.
 * @returns {string} Signed JWT token.
 */
function signAuthToken(user) {
  const { secret, expiresIn } = getJwtConfig();

  return jwt.sign(
    { sub: user.username, role: user.role },
    secret,
    { expiresIn }
  );
}

module.exports = {
  signAuthToken,
};

