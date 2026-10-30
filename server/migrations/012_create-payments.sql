-- Up Migration

-- Thanh toán (M07 – F12). Thiết kế: docs/02-design/database.md · docs/03-modules/07-payment.md

-- Hạn thanh toán của đơn VNPay (giữ hàng tới hạn này; COD = NULL) & thời điểm đã thanh toán
ALTER TABLE orders
  ADD COLUMN payment_due_at TIMESTAMPTZ,
  ADD COLUMN paid_at        TIMESTAMPTZ;

-- Job tự huỷ đơn VNPay quá hạn chỉ quét đúng các đơn còn chờ thanh toán
CREATE INDEX idx_orders_vnpay_unpaid_due ON orders (payment_due_at)
  WHERE status = 'PENDING' AND payment_method = 'VNPAY' AND payment_status <> 'PAID';

-- Mỗi lượt thử thanh toán = 1 dòng (1 đơn có thể thử nhiều lần)
CREATE TABLE payments (
  id               SERIAL PRIMARY KEY,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  method           TEXT NOT NULL CHECK (method IN ('COD', 'VNPAY')),
  amount           BIGINT NOT NULL CHECK (amount > 0),
  status           TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
  -- vnp_TxnRef gửi sang VNPay: <mã đơn>-<lượt thử>
  txn_ref          VARCHAR(50) UNIQUE,
  -- vnp_TransactionNo
  provider_txn_no  VARCHAR(50),
  bank_code        VARCHAR(20),
  -- vnp_ResponseCode
  response_code    VARCHAR(10),
  -- Toàn bộ tham số IPN để đối soát
  raw_data         JSONB,
  -- Hạn của link thanh toán (vnp_ExpireDate)
  expires_at       TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((method = 'VNPAY') = (txn_ref IS NOT NULL))
);
CREATE INDEX idx_payments_order_created ON payments (order_id, created_at DESC);
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS payments;
DROP INDEX IF EXISTS idx_orders_vnpay_unpaid_due;
ALTER TABLE orders DROP COLUMN IF EXISTS paid_at, DROP COLUMN IF EXISTS payment_due_at;
