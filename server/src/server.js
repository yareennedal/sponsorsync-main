import { env } from './config/env.js';
import { sequelize } from './db/index.js';
import { createApp } from './app.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`SponsorSync API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`\n${signal} received: shutting down...`);
  server.close(() => console.log('HTTP server closed.'));
  if (sequelize) {
    try {
      await sequelize.close();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error closing database:', err.message);
    }
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
