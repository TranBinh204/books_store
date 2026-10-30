import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../../src/db/pool';
import { bearer, createCustomer, getTokens, validRegisterBody } from './auth';

// Tạo nhanh khách hàng, sách, đơn hàng cho test (M08 trở đi)

let customerSeq = 0;

/** Đăng ký & đăng nhập 1 khách hàng mới → { auth, id, email } */
export async function newCustomer(overrides: { fullName?: string; phone?: string } = {}) {
  customerSeq += 1;
  const email = `shop${customerSeq}@gmail.com`;
  const id = await createCustomer({
    ...validRegisterBody,
    email,
    phone: overrides.phone ?? `07${String(customerSeq).padStart(8, '0')}`,
    fullName: overrides.fullName ?? validRegisterBody.fullName,
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: validRegisterBody.password });
  const tokens = getTokens(res);
  return {
    auth: bearer(tokens.accessToken),
    refreshToken: tokens.refreshToken,
    id,
    email,
  };
}

/** Danh mục + sách đang bán → id sách */
export async function createBook({ stock = 10, price = 50000, title = 'Nhà Giả Kim' } = {}) {
  const category = await pool.query<{ id: number }>(
    `INSERT INTO categories (name) VALUES ('Danh mục ' || gen_random_uuid()) RETURNING id`,
  );
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO books (title, category_id, original_price, price, stock, is_active)
     VALUES ($1, $2, $3, $3, $4, true) RETURNING id`,
    [title, category.rows[0].id, price, stock],
  );
  return rows[0].id;
}

/** Khách `auth` đặt `quantity` cuốn `bookId` (giá `price`) → đơn vừa tạo */
export async function placeOrder(
  auth: string,
  bookId: number,
  {
    quantity = 1,
    price = 50000,
    method = 'COD',
    recipientName = 'Nguyễn Văn A',
    phone = '0912345678',
    voucherCode,
    discount = 0,
  }: {
    quantity?: number;
    price?: number;
    method?: 'COD' | 'VNPAY';
    recipientName?: string;
    phone?: string;
    /** M11: mã giảm giá + số tiền giảm client đang thấy */
    voucherCode?: string;
    discount?: number;
  } = {},
) {
  const address = await request(app).post('/api/me/addresses').set('Authorization', auth).send({
    recipientName,
    phone,
    provinceCode: 1,
    province: 'Thành phố Hà Nội',
    wardCode: 4,
    ward: 'Phường Ba Đình',
    detail: '12 Hàng Bài',
  });
  await request(app)
    .post('/api/me/cart/items')
    .set('Authorization', auth)
    .send({ bookId, quantity });
  const res = await request(app)
    .post('/api/me/orders')
    .set('Authorization', auth)
    .set('Idempotency-Key', randomUUID())
    .send({
      addressId: address.body.data.id,
      paymentMethod: method,
      voucherCode,
      expectedTotal: price * quantity - discount,
    });
  if (res.status !== 201) throw new Error(`Đặt hàng lỗi: ${JSON.stringify(res.body)}`);
  return res.body.data as { id: number; code: string; total: number; status: string };
}

export const bookStock = async (id: number) =>
  (
    await pool.query<{ stock: number; soldCount: number }>(
      'SELECT stock, sold_count AS "soldCount" FROM books WHERE id = $1',
      [id],
    )
  ).rows[0];

/** Đánh dấu đơn VNPay đã thanh toán (bỏ qua IPN — đã test ở M07) */
export async function markPaid(orderId: number) {
  await pool.query(`UPDATE orders SET payment_status = 'PAID', paid_at = now() WHERE id = $1`, [
    orderId,
  ]);
}

/** Admin đẩy đơn tới Đã giao (Xác nhận → Đang giao → Đã giao) */
export async function deliverOrder(adminAuth: string, orderId: number) {
  for (const [status, expectedStatus] of [
    ['CONFIRMED', 'PENDING'],
    ['SHIPPING', 'CONFIRMED'],
    ['DELIVERED', 'SHIPPING'],
  ]) {
    const res = await request(app)
      .post(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', adminAuth)
      .send({ status, expectedStatus });
    if (res.status !== 200) throw new Error(`Chuyển trạng thái lỗi: ${JSON.stringify(res.body)}`);
  }
}
