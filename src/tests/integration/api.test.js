/**
 * API 集成测试
 */

describe('API Endpoints', () => {
  const createApp = require('../../modules/api/app');

  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const request = require('supertest');
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const request = require('supertest');
      const res = await request(app).get('/api/v1/unknown');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('API Routes', () => {
    it('should have positions route available', () => {
      expect(app._router.stack.some(
        layer => layer.route && layer.route.path === '/api/v1/positions',
      ) || app._router.stack.some(
        layer => layer.name === 'router' && layer.regexp.test('/api/v1/positions'),
      )).toBe(true);
    });

    it('should have signals route available', () => {
      expect(app._router.stack.some(
        layer => layer.route && layer.route.path === '/api/v1/signals',
      ) || app._router.stack.some(
        layer => layer.name === 'router' && layer.regexp.test('/api/v1/signals'),
      )).toBe(true);
    });
  });
});
