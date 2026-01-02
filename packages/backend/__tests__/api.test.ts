import request from 'supertest';
import app from '../src/index';

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
