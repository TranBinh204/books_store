import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('trả về trạng thái ok khi DB hoạt động', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ status: 'ok', database: 'up' });
  });
});

describe('API không tồn tại', () => {
  it('trả về 404 theo format lỗi chuẩn', async () => {
    const res = await request(app).get('/api/khong-ton-tai');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: expect.any(String) },
    });
  });
});
