import 'dotenv/config';
import { createApp } from './app';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Start the server
 */
async function start() {
  try {
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`🚀 Adaptive Astro-Scheduler API`);
      console.log(`📡 Server running on http://${HOST}:${PORT}`);
      console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
      console.log(`📅 Calendar API: http://${HOST}:${PORT}/api/calendar/day`);
      console.log(`\n✨ Ready to serve astronomical calendars!`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

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
