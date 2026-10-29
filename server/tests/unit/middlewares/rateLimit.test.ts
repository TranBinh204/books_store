import express from 'express';
import request from 'supertest';
import { createLimiter, type LimiterOptions } from '../../../src/middlewares/rateLimit';

/** App nhỏ: ?ok=1 → 200, còn lại → 401 (giả lập đăng nhập đúng / sai) */
function makeApp(options: LimiterOptions) {
  const app = express();
  app.post('/login', createLimiter(options), (req, res) => {
    res.status(req.query.ok ? 200 : 401).json({});
  });
  return app;
}

describe('createLimiter', () => {
  it('vượt giới hạn → 429 TOO_MANY_REQUESTS', async () => {
    const app = makeApp({ windowMinutes: 1, max: 2, enabled: true });
    await request(app).post('/login').expect(401);
    await request(app).post('/login').expect(401);
    const res = await request(app).post('/login');
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('onlyCountFailures: đăng nhập đúng không bị tính', async () => {
    const app = makeApp({ windowMinutes: 1, max: 2, onlyCountFailures: true, enabled: true });
    for (let i = 0; i < 5; i++) await request(app).post('/login?ok=1').expect(200);
    await request(app).post('/login').expect(401);
    await request(app).post('/login').expect(401);
    await request(app).post('/login').expect(429);
  });

  it('tắt (RATE_LIMIT_ENABLED=false) → không bao giờ chặn', async () => {
    const app = makeApp({ windowMinutes: 1, max: 1, enabled: false });
    for (let i = 0; i < 5; i++) await request(app).post('/login').expect(401);
  });

  it('keyByUser: đếm riêng từng tài khoản (chatbox M16), không theo IP', async () => {
    const app = express();
    // Giả lập requireAuth: header x-user → req.user
    app.use((req, _res, next) => {
      req.user = { id: Number(req.header('x-user')), role: 'CUSTOMER' };
      next();
    });
    app.post(
      '/chat',
      createLimiter({ windowMinutes: 1, max: 2, enabled: true, keyByUser: true }),
      (_req, res) => {
        res.json({});
      },
    );
    for (let i = 0; i < 2; i++) await request(app).post('/chat').set('x-user', '1').expect(200);
    await request(app).post('/chat').set('x-user', '1').expect(429);
    // Cùng IP nhưng tài khoản khác → vẫn gửi được
    await request(app).post('/chat').set('x-user', '2').expect(200);
  });
});
