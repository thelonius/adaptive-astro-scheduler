import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import calendarRoutes from './api/routes/calendar.routes';
import ephemerisRoutes from './api/routes/ephemeris.routes';
import natalChartRoutes from './api/routes/natal-chart.routes';
import analyticsRoutes from './api/routes/analytics.routes';
import aspectAnalysisRoutes from './api/routes/aspect-analysis.routes';
import customLayersRoutes from './api/routes/custom-layers.routes';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:8000',
      'http://176.123.166.252',
      'https://176.123.166.252'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'Adaptive Astro-Scheduler API',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/ephemeris', ephemerisRoutes);
  app.use('/api/natal-chart', natalChartRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/aspects', aspectAnalysisRoutes);
  app.use('/api/custom-layers', customLayersRoutes);

  // Telegram Bot Webhook
  app.post('/webhook/telegram', (req, res) => {
    const { TelegramBotService } = require('./services/telegram-bot.service');
    const botService = TelegramBotService.getInstance();
    if (botService && botService.handleWebhook) {
      botService.handleWebhook(req, res);
    } else {
      res.status(404).send('Bot webhook handler not available');
    }
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        path: req.path,
      },
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      },
    });
  });

  return app;
}
