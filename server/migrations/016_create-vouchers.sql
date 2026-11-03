-- Up Migration

-- Mã giảm giá (M11 – F16). Thiết kế: docs/02-design/database.md · docs/03-modules/11-voucher.md
CREATE TABLE vouchers (
  id               SERIAL PRIMARY KEY,
  -- Chữ in hoa & số, 4–30 ký tự (schema tự đổi chữ in hoa)
  code             VARCHAR(30) NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{4,30}$'),
  description      VARCHAR(255),
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
  -- PERCENT: 1–100 (%) · FIXED: số tiền
  discount_value   BIGINT NOT NULL CHECK (discount_value > 0),
  -- Trần giảm khi PERCENT (NULL = không giới hạn)
  max_discount     BIGINT CHECK (max_discount IS NULL OR max_discount > 0),
  min_order_value  BIGINT NOT NULL DEFAULT 0 CHECK (min_order_value >= 0),
  start_at         TIMESTAMPTZ NOT NULL,
  end_at           TIMESTAMPTZ NOT NULL,
  -- NULL = không giới hạn
  usage_limit      INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  -- Số đơn đang giữ lượt (huỷ đơn → trả lượt)
  used_count       INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  per_user_limit   INTEGER NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  -- Hiện ở khối "Khuyến mãi dành cho bạn" trên trang chủ
  is_public        BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (discount_type <> 'PERCENT' OR discount_value <= 100),
  CHECK (end_at > start_at),
  CHECK (usage_limit IS NULL OR used_count <= usage_limit)
);
-- Khối trang chủ: mã công khai đang bật, sắp hết hạn trước
CREATE INDEX idx_vouchers_public ON vouchers (end_at) WHERE is_public AND is_active;
-- Danh sách Admin
CREATE INDEX idx_vouchers_created ON vouchers (created_at DESC);
CREATE TRIGGER trg_vouchers_updated_at BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 1 dòng / đơn đang giữ lượt dùng; huỷ đơn → xoá dòng
CREATE TABLE voucher_usages (
  id          SERIAL PRIMARY KEY,
  voucher_id  INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE RESTRICT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id    INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Đếm lượt / người
CREATE INDEX idx_voucher_usages_voucher_user ON voucher_usages (voucher_id, user_id);

-- Khoá ngoại đã hoãn từ M06 (Q7): voucher đã có đơn dùng không xoá được
ALTER TABLE orders
  ADD CONSTRAINT orders_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE RESTRICT;
-- Đếm / liệt kê đơn đã dùng 1 voucher
CREATE INDEX idx_orders_voucher_id ON orders (voucher_id) WHERE voucher_id IS NOT NULL;

-- Down Migration
DROP INDEX IF EXISTS idx_orders_voucher_id;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_voucher_id_fkey;
DROP TABLE IF EXISTS voucher_usages;
DROP TABLE IF EXISTS vouchers;
