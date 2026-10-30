import { pool, type Queryable } from '../db/pool';
import type { PaymentMethod } from '../schemas/order.schema';
import type { PaymentRecord } from '../types/order.types';
import type { PaymentAttempt, PaymentAttemptStatus } from '../types/payment.types';

const COLUMNS = `id, order_id AS "orderId", method, amount, status,
  txn_ref AS "txnRef", expires_at AS "expiresAt"`;

/** Số lượt thử thanh toán của 1 đơn (đánh số lượt thử tiếp theo) */
export async function countByOrder(orderId: number, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM payments WHERE order_id = $1',
    [orderId],
  );
  return rows[0].count;
}

export async function insert(
  input: {
    orderId: number;
    method: PaymentMethod;
    amount: number;
    txnRef: string | null;
    expiresAt: Date | null;
    /** Ghi thẳng kết quả (COD đã thu tiền khi giao — M08); mặc định PENDING */
    status?: PaymentAttemptStatus;
    paidAt?: Date | null;
  },
  db: Queryable = pool,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO payments (order_id, method, amount, txn_ref, expires_at, status, paid_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      input.orderId,
      input.method,
      input.amount,
      input.txnRef,
      input.expiresAt,
      input.status ?? 'PENDING',
      input.paidAt ?? null,
    ],
  );
  return rows[0].id;
}

/** Lượt thử theo `vnp_TxnRef`. `forUpdate` khoá dòng (IPN gửi trùng / song song) */
export async function findByTxnRef(
  txnRef: string,
  db: Queryable = pool,
  forUpdate = false,
): Promise<PaymentAttempt | null> {
  const { rows } = await db.query<PaymentAttempt>(
    `SELECT ${COLUMNS} FROM payments WHERE txn_ref = $1 ${forUpdate ? 'FOR UPDATE' : ''}`,
    [txnRef],
  );
  return rows[0] ?? null;
}

/** Ghi kết quả IPN vào lượt thử */
export async function markResult(
  id: number,
  result: {
    status: Exclude<PaymentAttemptStatus, 'PENDING'>;
    providerTxnNo: string | null;
    bankCode: string | null;
    responseCode: string | null;
    rawData: Record<string, string>;
    paidAt: Date | null;
  },
  db: Queryable,
) {
  await db.query(
    `UPDATE payments SET status = $2, provider_txn_no = $3, bank_code = $4, response_code = $5,
       raw_data = $6, paid_at = $7
     WHERE id = $1`,
    [
      id,
      result.status,
      result.providerTxnNo,
      result.bankCode,
      result.responseCode,
      JSON.stringify(result.rawData),
      result.paidAt,
    ],
  );
}

/** Mọi lượt thanh toán của 1 đơn (mới nhất trước) — chi tiết đơn Admin (M08) */
export async function listByOrder(
  orderId: number,
  db: Queryable = pool,
): Promise<Omit<PaymentRecord, 'responseMessage'>[]> {
  const { rows } = await db.query<Omit<PaymentRecord, 'responseMessage'>>(
    `SELECT id, method, amount, status,
       txn_ref AS "txnRef", provider_txn_no AS "providerTxnNo", bank_code AS "bankCode",
       response_code AS "responseCode", paid_at AS "paidAt", created_at AS "createdAt"
     FROM payments WHERE order_id = $1 ORDER BY created_at DESC, id DESC`,
    [orderId],
  );
  return rows;
}
