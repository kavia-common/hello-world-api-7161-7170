'use strict';

// This file will export middleware as the application grows
const { verifyJwt, requireRole } = require('./auth');

module.exports = {
  verifyJwt,
  requireRole,
};
