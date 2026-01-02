'use strict';

/**
 * Detect duplicate key error from MongoDB/Mongoose.
 *
 * @param {any} err
 * @returns {boolean}
 */
function isDuplicateKeyError(err) {
  return !!err && (err.code === 11000 || err.code === 11001);
}

/**
 * PUBLIC_INTERFACE
 * Maps common Mongo/Mongoose errors into store-like error codes expected by controllers.
 *
 * @param {any} err Raw error
 * @param {string} duplicateCode Store duplicate code to assign
 * @param {string} duplicateMessage Message to use for duplicates
 * @returns {Error} mapped error (always an Error)
 */
function mapMongoError(err, duplicateCode, duplicateMessage) {
  if (isDuplicateKeyError(err)) {
    const e = new Error(duplicateMessage);
    e.code = duplicateCode;
    return e;
  }

  // Pass through if already a store-style error.
  if (err && typeof err === 'object' && err.code && typeof err.code === 'string') {
    return err;
  }

  const e = new Error(err && err.message ? err.message : 'Database error.');
  e.code = 'DB_ERROR';
  return e;
}

module.exports = {
  mapMongoError,
};
