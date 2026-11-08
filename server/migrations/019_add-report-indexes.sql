-- Up Migration

-- Dashboard & báo cáo (M14 – F19): lọc đơn theo khoảng ngày cho mọi trạng thái
-- (các index cũ đều bắt đầu bằng user_id / status / payment_status)
CREATE INDEX idx_orders_created ON orders (created_at);

-- Down Migration
DROP INDEX IF EXISTS idx_orders_created;
