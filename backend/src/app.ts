import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import calendarRoutes from './api/routes/calendar.routes';
import ephemerisRoutes from './api/routes/ephemeris.routes';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
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
