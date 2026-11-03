-- Up Migration

-- Thông báo cho khách hàng (M13 – F18). Thiết kế: docs/02-design/database.md · docs/03-modules/13-notification.md
CREATE TABLE notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('ORDER', 'PAYMENT', 'PROMOTION', 'SYSTEM')),
  -- Mã sự kiện (bảng 3.1 của M13) — client chọn icon
  event       TEXT NOT NULL,
  title       VARCHAR(200) NOT NULL,
  content     TEXT NOT NULL,
  -- Đường dẫn khi bấm (trong web, vd /tai-khoan/don-hang/12)
  link        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  -- Chống gửi trùng 1 sự kiện (IPN gửi lại, job chạy lại) — vd order:12:CONFIRMED
  dedupe_key  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
-- Danh sách của tôi, mới nhất trước
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);
-- Đếm chưa đọc (chuông)
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE NOT is_read;
-- Job xoá thông báo cũ
CREATE INDEX idx_notifications_created ON notifications (created_at);

-- Job "Flash sale sắp diễn ra" đã báo cho chương trình này (đổi giờ bắt đầu → báo lại)
ALTER TABLE flash_sales ADD COLUMN upcoming_notified_at TIMESTAMPTZ;

-- Down Migration
ALTER TABLE flash_sales DROP COLUMN IF EXISTS upcoming_notified_at;
DROP TABLE IF EXISTS notifications;
