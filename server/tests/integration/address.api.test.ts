import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import { loginAsAdmin, loginAsCustomer } from '../helpers/admin';
import { bearer, createCustomer, getTokens, validRegisterBody } from '../helpers/auth';
import { resetDatabase } from '../helpers/db';

// M04 – Sổ địa chỉ giao hàng (docs/03-modules/04-user-profile.md)

let customer: string;

beforeEach(async () => {
  await resetDatabase();
  customer = await loginAsCustomer();
});

afterAll(async () => {
  await pool.end();
});

const addressBody = (overrides: Record<string, unknown> = {}) => ({
  recipientName: 'Nguyễn Văn A',
  phone: '0912345678',
  provinceCode: 1,
  province: 'Thành phố Hà Nội',
  wardCode: 4,
  ward: 'Phường Ba Đình',
  detail: '12 Phố Hàng Bài',
  ...overrides,
});

const api = (auth = customer) => ({
  list: () => request(app).get('/api/me/addresses').set('Authorization', auth),
  create: (body: object) =>
    request(app).post('/api/me/addresses').set('Authorization', auth).send(body),
  update: (id: number, body: object) =>
    request(app).patch(`/api/me/addresses/${id}`).set('Authorization', auth).send(body),
  setDefault: (id: number) =>
    request(app).put(`/api/me/addresses/${id}/default`).set('Authorization', auth),
  delete: (id: number) => request(app).delete(`/api/me/addresses/${id}`).set('Authorization', auth),
});

async function create(detail: string, isDefault = false) {
  const res = await api().create(addressBody({ detail, isDefault }));
  expect(res.status).toBe(201);
  return res.body.data.id as number;
}

/** [detail, isDefault] theo thứ tự danh sách trả về */
async function summary() {
  const res = await api().list();
  return (res.body.data as { detail: string; isDefault: boolean }[]).map((a) => [
    a.detail,
    a.isDefault,
  ]);
}

describe('Phân quyền', () => {
  it('Admin không có sổ địa chỉ → 403', async () => {
    const admin = await loginAsAdmin();
    expect((await api(admin).list()).status).toBe(403);
    expect((await api(admin).create(addressBody())).status).toBe(403);
  });

  it('địa chỉ của người khác → 404 khi sửa / xoá / đặt mặc định, không thấy trong danh sách', async () => {
    const id = await create('Của A');
    await createCustomer({ ...validRegisterBody, email: 'b@gmail.com', phone: '0911111111' });
    const other = bearer(
      getTokens(
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'b@gmail.com', password: validRegisterBody.password }),
      ).accessToken,
    );

    expect((await api(other).list()).body.data).toEqual([]);
    expect((await api(other).update(id, addressBody())).status).toBe(404);
    expect((await api(other).setDefault(id)).status).toBe(404);
    expect((await api(other).delete(id)).status).toBe(404);
    expect(await summary()).toEqual([['Của A', true]]);
  });
});

describe('Thêm & sửa', () => {
  it('đủ trường; chuẩn hoá khoảng trắng; dữ liệu sai → 422', async () => {
    const res = await api().create(addressBody({ detail: '  12   Hàng Bài ' }));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      recipientName: 'Nguyễn Văn A',
      phone: '0912345678',
      provinceCode: 1,
      province: 'Thành phố Hà Nội',
      wardCode: 4,
      ward: 'Phường Ba Đình',
      detail: '12 Hàng Bài',
      isDefault: true,
    });

    for (const body of [
      addressBody({ phone: '123' }),
      addressBody({ wardCode: undefined }),
      addressBody({ provinceCode: 0 }),
      addressBody({ ward: '   ' }),
      addressBody({ detail: '' }),
      addressBody({ recipientName: 'A' }),
    ]) {
      const bad = await api().create(body);
      expect(bad.status).toBe(422);
    }
  });

  it('sửa địa chỉ; tích mặc định → thành mặc định; bỏ tích ở địa chỉ mặc định → vẫn mặc định', async () => {
    const first = await create('Nhà');
    const second = await create('Công ty');

    const res = await api().update(second, addressBody({ detail: 'Công ty mới', isDefault: true }));
    expect(res.status).toBe(200);
    expect(await summary()).toEqual([
      ['Công ty mới', true],
      ['Nhà', false],
    ]);

    await api().update(second, addressBody({ detail: 'Công ty mới', isDefault: false }));
    expect(await summary()).toEqual([
      ['Công ty mới', true],
      ['Nhà', false],
    ]);
    expect((await api().update(first, addressBody({ ward: '' }))).status).toBe(422);
  });

  it('tối đa 10 địa chỉ → địa chỉ thứ 11: 409 ADDRESS_LIMIT', async () => {
    for (let i = 1; i <= 10; i += 1) await create(`Địa chỉ ${i}`);
    const res = await api().create(addressBody());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ADDRESS_LIMIT');
  });
});

describe('Địa chỉ mặc định — luôn đúng 1', () => {
  it('địa chỉ đầu tiên tự mặc định; thêm có tích → chuyển mặc định; mặc định đứng đầu rồi mới nhất', async () => {
    await create('Nhà', false);
    await create('Công ty', false);
    expect(await summary()).toEqual([
      ['Nhà', true],
      ['Công ty', false],
    ]);

    await create('Nhà bố mẹ', true);
    expect(await summary()).toEqual([
      ['Nhà bố mẹ', true],
      ['Công ty', false],
      ['Nhà', false],
    ]);
  });

  it('đặt làm mặc định', async () => {
    const home = await create('Nhà');
    const work = await create('Công ty');
    const res = await api().setDefault(work);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: work, isDefault: true });
    expect(await summary()).toEqual([
      ['Công ty', true],
      ['Nhà', false],
    ]);
    // Đặt lại địa chỉ đang mặc định → không đổi
    expect((await api().setDefault(work)).status).toBe(200);
    await api().setDefault(home);
    expect(await summary()).toEqual([
      ['Nhà', true],
      ['Công ty', false],
    ]);
  });

  it('xoá địa chỉ mặc định → địa chỉ mới nhất còn lại thành mặc định; xoá hết → rỗng', async () => {
    const home = await create('Nhà');
    const work = await create('Công ty');
    const parents = await create('Nhà bố mẹ');

    expect((await api().delete(home)).status).toBe(204);
    expect(await summary()).toEqual([
      ['Nhà bố mẹ', true],
      ['Công ty', false],
    ]);

    expect((await api().delete(work)).status).toBe(204);
    expect(await summary()).toEqual([['Nhà bố mẹ', true]]);

    await api().delete(parents);
    expect(await summary()).toEqual([]);
    expect((await api().delete(parents)).status).toBe(404);
  });

  it('thêm đồng thời 3 địa chỉ đầu tiên → đúng 1 mặc định', async () => {
    const results = await Promise.all(
      ['A', 'B', 'C'].map((detail) => api().create(addressBody({ detail }))),
    );
    expect(results.map((res) => res.status)).toEqual([201, 201, 201]);
    const defaults = (await summary()).filter(([, isDefault]) => isDefault);
    expect(defaults).toHaveLength(1);
  });
});
