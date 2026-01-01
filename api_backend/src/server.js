'use strict';

const app = require('./app');
const { connectToMongo, disconnectFromMongo } = require('./db/mongoose');

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * PUBLIC_INTERFACE
 * Starts the HTTP server for the minimal Hello World API and connects to MongoDB.
 *
 * Environment variables:
 * - PORT (optional): defaults to 3001
 * - HOST (optional): defaults to 0.0.0.0
 * - MONGODB_URI (required): MongoDB connection string for Mongoose
 *
 * @returns {Promise<import('http').Server>} Running HTTP server.
 */
async function start() {
  await connectToMongo();
  console.log('Connected to MongoDB');

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });

  const shutdown = async (signal) => {
    try {
      console.log(`${signal} signal received: closing HTTP server`);
      await new Promise((resolve) => server.close(resolve));
      console.log('HTTP server closed');

      console.log('Disconnecting from MongoDB...');
      await disconnectFromMongo();
      console.log('MongoDB disconnected');

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
