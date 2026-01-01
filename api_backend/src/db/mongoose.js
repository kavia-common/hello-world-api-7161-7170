'use strict';

const mongoose = require('mongoose');

let isConnected = false;

/**
 * PUBLIC_INTERFACE
 * Connects to MongoDB using Mongoose.
 *
 * Requires environment variable:
 * - MONGODB_URI: MongoDB connection string
 *
 * @returns {Promise<void>} Resolves when connected.
 */
async function connectToMongo() {
  const uri = process.env.MONGODB_URI;

  if (!uri || typeof uri !== 'string' || uri.trim().length === 0) {
    const err = new Error('Missing required environment variable MONGODB_URI.');
    err.code = 'MISSING_MONGODB_URI';
    throw err;
  }

  if (isConnected) return;

  // Recommended mongoose options are mostly defaults in modern versions,
  // but we keep a small explicit set for clarity.
  await mongoose.connect(uri.trim(), {
    serverSelectionTimeoutMS: 5000,
  });

  isConnected = true;
}

/**
 * PUBLIC_INTERFACE
 * Disconnects Mongoose from MongoDB (if connected).
 *
 * @returns {Promise<void>} Resolves when disconnected.
 */
async function disconnectFromMongo() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

/**
 * PUBLIC_INTERFACE
 * Returns true if the module believes Mongoose is connected.
 *
 * @returns {boolean} Connection state.
 */
function getMongoConnectionState() {
  return isConnected;
}

module.exports = {
  connectToMongo,
  disconnectFromMongo,
  getMongoConnectionState,
};
