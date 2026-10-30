-- Up Migration

-- Đơn hàng (M06 – F11). Thiết kế: docs/02-design/database.md · docs/03-modules/06-order.md

-- Số thứ tự mã đơn theo năm (giờ Việt Nam): BS-<năm>-<6 số>
CREATE TABLE order_code_sequences (
  year         SMALLINT PRIMARY KEY,
  last_number  INTEGER NOT NULL DEFAULT 0 CHECK (last_number >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id                SERIAL PRIMARY KEY,
  code              VARCHAR(20) NOT NULL UNIQUE,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Khoá chống tạo trùng (client tạo mỗi lần mở trang thanh toán)
  idempotency_key   UUID NOT NULL,
  status            TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED')),
  payment_method    TEXT NOT NULL CHECK (payment_method IN ('COD', 'VNPAY')),
  payment_status    TEXT NOT NULL DEFAULT 'UNPAID'
                    CHECK (payment_status IN ('UNPAID', 'PAID', 'FAILED', 'REFUNDED')),
  -- Chụp lại địa chỉ lúc đặt (sửa / xoá sổ địa chỉ sau đó không ảnh hưởng đơn)
  recipient_name    VARCHAR(100) NOT NULL,
  recipient_phone   VARCHAR(15) NOT NULL,
  shipping_address  TEXT NOT NULL,
  note              TEXT,
  subtotal          BIGINT NOT NULL CHECK (subtotal >= 0),
  shipping_fee      BIGINT NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  discount_amount   BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total             BIGINT NOT NULL CHECK (total >= 0),
  -- Khoá ngoại → vouchers thêm ở M11 (khi tạo bảng vouchers)
  voucher_id        INTEGER,
  cancel_reason     TEXT,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (total = subtotal + shipping_fee - discount_amount),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  -- Chụp lại lúc đặt
  book_title  VARCHAR(255) NOT NULL,
  book_image  TEXT,
  unit_price  BIGINT NOT NULL CHECK (unit_price >= 0),
  quantity    INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_book_id ON order_items (book_id);

CREATE TABLE order_status_history (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  changed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_status_history_order_id ON order_status_history (order_id, created_at);

-- Lịch sử tồn kho: khoá ngoại tới đơn (đã chừa cột order_id ở migration 006)
ALTER TABLE inventory_logs
  ADD CONSTRAINT fk_inventory_logs_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT;
CREATE INDEX idx_inventory_logs_order_id ON inventory_logs (order_id) WHERE order_id IS NOT NULL;

-- Down Migration
DROP INDEX IF EXISTS idx_inventory_logs_order_id;
ALTER TABLE inventory_logs DROP CONSTRAINT IF EXISTS fk_inventory_logs_order;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS order_code_sequences;
