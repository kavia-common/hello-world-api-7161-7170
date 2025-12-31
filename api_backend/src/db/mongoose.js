const mongoose = require('mongoose');

/**
 * Configure mongoose behavior.
 * Avoid strictQuery deprecation warnings depending on Mongoose defaults.
 */
mongoose.set('strictQuery', true);

/**
 * PUBLIC_INTERFACE
 * Establishes a MongoDB connection using Mongoose.
 *
 * Environment variables:
 * - MONGODB_URI: Mongo connection string (required)
 *
 * @returns {Promise<typeof mongoose>} The mongoose instance after successful connection.
 * @throws {Error} When MONGODB_URI is not set or connection fails.
 */
async function connectMongo() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'Missing required env var MONGODB_URI (MongoDB connection string).'
    );
  }

  // Use short server selection timeout to fail fast in misconfigured envs.
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  return mongoose;
}

module.exports = {
  connectMongo,
  mongoose,
};
