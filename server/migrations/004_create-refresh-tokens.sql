-- Up Migration
-- Mỗi dòng = 1 refresh token của 1 phiên đăng nhập (1 thiết bị / trình duyệt).
-- Chỉ lưu bản băm SHA-256, không lưu token gốc.
CREATE TABLE refresh_tokens (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash     VARCHAR(255) NOT NULL UNIQUE,
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked_at     TIMESTAMPTZ,
  -- Token mới thay thế khi xoay vòng (rotation); NULL nếu bị huỷ do đăng xuất / đổi mật khẩu
  replaced_by_id INTEGER REFERENCES refresh_tokens(id) ON DELETE SET NULL,
  user_agent     VARCHAR(255),
  ip             VARCHAR(45),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Down Migration
DROP TABLE IF EXISTS refresh_tokens;
