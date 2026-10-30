-- Up Migration

-- Sổ địa chỉ giao hàng (M04 – F09). Địa giới mới từ 01/07/2025: 2 cấp tỉnh/thành → phường/xã.
-- Lưu cả mã (chọn lại đúng khi sửa) và tên (hiển thị) — dữ liệu địa giới nằm ở client.
CREATE TABLE addresses (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name  VARCHAR(100) NOT NULL,
  phone           VARCHAR(15) NOT NULL,
  province_code   INTEGER NOT NULL CHECK (province_code > 0),
  province        VARCHAR(100) NOT NULL,
  ward_code       INTEGER NOT NULL CHECK (ward_code > 0),
  ward            VARCHAR(100) NOT NULL,
  detail          VARCHAR(255) NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user_id ON addresses (user_id);
-- Mỗi người dùng tối đa 1 địa chỉ mặc định
CREATE UNIQUE INDEX uq_addresses_user_default ON addresses (user_id) WHERE is_default;
CREATE TRIGGER trg_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS addresses;
