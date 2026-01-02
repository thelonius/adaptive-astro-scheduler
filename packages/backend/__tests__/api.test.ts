import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestLogger } from '../src/middleware/requestLogger';
import { errorHandler } from '../src/middleware/errorHandler';
import layerRoutes from '../src/routes/layer.routes';
import ephemerisRoutes from '../src/routes/ephemeris.routes';

// Create a test app without database connection
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/layers', layerRoutes);
app.use('/api/ephemeris', ephemerisRoutes);

app.use((_req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

app.use(errorHandler);

describe('Health Check', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('Layer Registry API', () => {
  it('should get all layers', async () => {
    const response = await request(app).get('/api/layers');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should create a custom layer', async () => {
    const layerData = {
      name: 'Test Layer',
      description: 'A test custom layer',
      config: { testKey: 'testValue' },
    };

    const response = await request(app).post('/api/layers').send(layerData);
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('success');
    expect(response.body.data.name).toBe(layerData.name);
  });
});
