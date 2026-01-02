'use strict';

const app = require('./app');

const PORT = Number(process.env.PORT ?? 3001) || 3001;
const HOST = process.env.HOST ?? '0.0.0.0';

/**
 * PUBLIC_INTERFACE
 * Starts the HTTP server for the minimal Digi Portal API.
 *
 * Environment variables:
 * - PORT (optional): defaults to 3001
 * - HOST (optional): defaults to 0.0.0.0
 *
 * Note: This service runs without any required database configuration.
 *
 * @returns {Promise<import('http').Server>} Running HTTP server.
 */
async function start() {
  // Explicitly bind host+port so container networking is reliable.
  const server = app.listen(Number(PORT) || 3001, HOST || '0.0.0.0', () => {
    console.log(`Server running at http://${HOST || '0.0.0.0'}:${Number(PORT) || 3001}`);
  });

  const shutdown = async (signal) => {
    try {
      console.log(`${signal} signal received: closing HTTP server`);
      await new Promise((resolve) => server.close(resolve));
      console.log('HTTP server closed');
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
