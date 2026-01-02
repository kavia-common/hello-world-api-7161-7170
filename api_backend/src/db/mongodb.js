'use strict';

const mongoose = require('mongoose');

let connectPromise = null;

/**
 * Creates a consistent log prefix for DB messages.
 *
 * @returns {string} prefix
 */
function prefix() {
  return '[mongodb]';
}

/**
 * Ensures we have a MongoDB connection string.
 *
 * @returns {string} MongoDB URI
 * @throws {Error} when MONGODB_URI is missing
 */
function requireMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (typeof uri !== 'string' || uri.trim().length === 0) {
    const err = new Error('MONGODB_URI is not configured.');
    err.code = 'CONFIG_ERROR';
    throw err;
  }
  return uri.trim();
}

/**
 * PUBLIC_INTERFACE
 * Connects Mongoose to MongoDB.
 *
 * Behavior:
 * - Fail-fast if MONGODB_URI is missing (throws CONFIG_ERROR).
 * - If Mongo is temporarily unavailable, logs a clear error and keeps retrying in background.
 *   (Routes that rely on DB may still fail until DB is connected, but the process keeps running.)
 *
 * @returns {Promise<void>} resolves when an initial connection attempt is made (not necessarily connected)
 */
async function connectMongo() {
  // If already connected/connecting, reuse.
  if (connectPromise) return connectPromise;

  const uri = requireMongoUri();

  // Recommended Mongoose settings
  mongoose.set('strictQuery', true);

  const attemptConnect = async () => {
    try {
      await mongoose.connect(uri, {
        // Keep defaults largely; these are safe modern defaults.
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log(`${prefix()} connected`);
    } catch (err) {
      console.error(
        `${prefix()} initial connection failed (will keep retrying in background):`,
        err && err.message ? err.message : err
      );

      // Continue retrying in the background until connected.
      // We do not await this loop in connectPromise so server can still start.
      // Note: This is intentionally simple and safe for dev/demo use.
      (async () => {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          try {
            // If connected, stop.
            if (mongoose.connection.readyState === 1) return;

            await new Promise((r) => setTimeout(r, 3000));
            await mongoose.connect(uri, {
              serverSelectionTimeoutMS: 5000,
              connectTimeoutMS: 5000,
            });
            console.log(`${prefix()} reconnected`);
            return;
          } catch (retryErr) {
            console.error(
              `${prefix()} retry connection failed:`,
              retryErr && retryErr.message ? retryErr.message : retryErr
            );
          }
        }
      })().catch((loopErr) => {
        console.error(`${prefix()} retry loop crashed:`, loopErr);
      });
    }
  };

  connectPromise = attemptConnect();

  // Connection event logging
  mongoose.connection.on('disconnected', () => {
    console.error(`${prefix()} disconnected`);
  });
  mongoose.connection.on('error', (err) => {
    console.error(`${prefix()} connection error:`, err && err.message ? err.message : err);
  });

  return connectPromise;
}

/**
 * PUBLIC_INTERFACE
 * Disconnects Mongoose from MongoDB.
 *
 * @returns {Promise<void>} resolves when disconnected
 */
async function disconnectMongo() {
  try {
    // If never connected/connecting, no-op.
    if (!connectPromise && mongoose.connection.readyState === 0) return;
    await mongoose.disconnect();
    console.log(`${prefix()} disconnected cleanly`);
  } catch (err) {
    console.error(`${prefix()} error during disconnect:`, err);
  } finally {
    connectPromise = null;
  }
}

module.exports = {
  connectMongo,
  disconnectMongo,
};
