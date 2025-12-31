const app = require('./app');
const { connectMongo, mongoose } = require('./db/mongoose');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * PUBLIC_INTERFACE
 * Bootstraps the HTTP server and connects to MongoDB.
 *
 * Env vars required for auth/Mongo features:
 * - MONGODB_URI
 * - JWT_SECRET
 *
 * @returns {Promise<import('http').Server>} Running HTTP server.
 */
async function start() {
  await connectMongo();
  console.log('Connected to MongoDB');

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
      console.log('HTTP server closed');
      try {
        await mongoose.connection.close(false);
        console.log('MongoDB connection closed');
      } catch (err) {
        console.error('Error closing MongoDB connection', err);
      }
      process.exit(0);
    });
  });

  return server;
}

// Start immediately when executed via `node src/server.js`
const serverPromise = start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

module.exports = serverPromise;
