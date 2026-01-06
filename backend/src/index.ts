import 'dotenv/config';
import { createApp } from './app';
import { testConnection, closePool } from './database';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Start the server
 */
async function start() {
  try {
    // Test database connection
    console.log('📊 Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.warn('⚠️  Database connection failed. Some features may not work.');
      console.warn('   Make sure PostgreSQL is running and DATABASE_URL is set correctly.');
    }

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`🚀 Adaptive Astro-Scheduler API`);
      console.log(`📡 Server running on http://${HOST}:${PORT}`);
      console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📅 Calendar API: http://${HOST}:${PORT}/api/calendar/day`);
      console.log(`🌟 Natal Chart API: http://${HOST}:${PORT}/api/natal-chart/calculate`);
      console.log(`\n✨ Ready to serve astronomical calendars!`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await closePool();
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

start();
