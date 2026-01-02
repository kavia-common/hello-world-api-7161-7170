'use strict';

const app = require('./app');
const { connectMongo, disconnectMongo } = require('./db/mongodb');

const DEFAULT_PORT = 3003;
const PORT = Number(process.env.PORT ?? DEFAULT_PORT) || DEFAULT_PORT;
const HOST = process.env.HOST ?? '0.0.0.0';

/**
 * PUBLIC_INTERFACE
 * Starts the HTTP server for the Digi Portal API and initializes MongoDB (Mongoose).
 *
 * Environment variables:
 * - PORT (optional): defaults to 3003
 * - HOST (optional): defaults to 0.0.0.0
 * - MONGODB_URI (required): MongoDB connection string
 *
 * Behavior:
 * - Fails fast if MONGODB_URI is missing.
 * - If MongoDB is temporarily unavailable, logs clear errors and retries in background.
 *
 * @returns {Promise<import('http').Server>} Running HTTP server.
 */
async function start() {
  // Fail fast if MONGODB_URI is missing (explicit requirement).
  // connectMongo will throw CONFIG_ERROR if missing.
  await connectMongo();

  // Explicitly bind host+port so container networking is reliable.
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });

  const shutdown = async (signal) => {
    try {
      console.log(`${signal} signal received: closing HTTP server`);
      await new Promise((resolve) => server.close(resolve));
      console.log('HTTP server closed');

      await disconnectMongo();

      process.exit(0);
    } catch (err) {
      console.error('Error during graceful shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

// Start immediately when executed via `node src/server.js`
if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { start };
