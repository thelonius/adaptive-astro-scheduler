import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import calendarRoutes from './api/routes/calendar.routes';
import ephemerisRoutes from './api/routes/ephemeris.routes';
import natalChartRoutes from './api/routes/natal-chart.routes';
import analyticsRoutes from './api/routes/analytics.routes';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'],
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
