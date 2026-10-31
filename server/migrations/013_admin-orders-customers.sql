-- Up Migration

-- Admin – Khách hàng & Đơn hàng (M08 – F13). Thiết kế: docs/03-modules/08-admin-customer-order.md

-- Khoá tài khoản: lúc nào, vì sao (chỉ Admin thấy lý do)
ALTER TABLE users
  ADD COLUMN locked_at   TIMESTAMPTZ,
  ADD COLUMN lock_reason TEXT;

-- Thời điểm Admin xác nhận đã hoàn tiền (payment_status = REFUNDED)
ALTER TABLE orders ADD COLUMN refunded_at TIMESTAMPTZ;

-- Tìm đơn theo SĐT người nhận
CREATE INDEX idx_orders_recipient_phone ON orders (recipient_phone);
-- Lọc theo trạng thái thanh toán
CREATE INDEX idx_orders_payment_status_created ON orders (payment_status, created_at DESC);
-- Tab / badge "Cần hoàn tiền": đơn đã huỷ nhưng đã nhận tiền
CREATE INDEX idx_orders_needs_refund ON orders (created_at DESC)
  WHERE status = 'CANCELLED' AND payment_status = 'PAID';
-- Danh sách khách hàng (mới đăng ký trước)
CREATE INDEX idx_users_role_created ON users (role, created_at DESC);

-- Down Migration
DROP INDEX IF EXISTS idx_users_role_created;
DROP INDEX IF EXISTS idx_orders_needs_refund;
DROP INDEX IF EXISTS idx_orders_payment_status_created;
DROP INDEX IF EXISTS idx_orders_recipient_phone;
ALTER TABLE orders DROP COLUMN IF EXISTS refunded_at;
ALTER TABLE users DROP COLUMN IF EXISTS lock_reason, DROP COLUMN IF EXISTS locked_at;
