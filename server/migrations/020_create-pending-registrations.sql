-- Up Migration

-- Đăng ký chờ xác minh email bằng OTP (M01 – F01).
-- Chỉ khi nhập đúng OTP mới tạo dòng trong users → chưa xác minh = chưa có tài khoản.
-- Đăng ký lại cùng email → ghi đè dòng cũ (không cần job dọn).
CREATE TABLE pending_registrations (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) NOT NULL UNIQUE CHECK (email = lower(email)),
  full_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(15) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  -- Chỉ lưu bản băm của mã OTP 6 số, không lưu mã gốc
  otp_hash        VARCHAR(255) NOT NULL,
  otp_expires_at  TIMESTAMPTZ NOT NULL,
  -- Số lần nhập sai mã hiện tại (gửi lại mã → về 0)
  attempts        INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  -- Lần gửi mã gần nhất → chặn gửi lại quá nhanh
  last_sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE IF EXISTS pending_registrations;
