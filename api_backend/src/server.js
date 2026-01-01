const app = require('./app');

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * PUBLIC_INTERFACE
 * Starts the HTTP server for the minimal Hello World API.
 *
 * Environment variables:
 * - PORT (optional): defaults to 3001
 * - HOST (optional): defaults to 0.0.0.0
 *
 * @returns {import('http').Server} Running HTTP server.
 */
function start() {
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  return server;
}

// Start immediately when executed via `node src/server.js`
if (require.main === module) {
  start();
}

module.exports = { start };
