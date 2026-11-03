-- Up Migration

-- Đánh giá sách (M10 – F15). Thiết kế: docs/02-design/database.md · docs/03-modules/10-review.md
CREATE TABLE reviews (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Sách / đơn đã bán không bị xoá cứng
  book_id        INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  -- Tuỳ chọn; có thì 10–1000 ký tự (kiểm tra ở schema)
  content        TEXT CHECK (content IS NULL OR char_length(content) <= 1000),
  -- Admin ẩn đánh giá vi phạm
  is_hidden      BOOLEAN NOT NULL DEFAULT false,
  hidden_reason  TEXT,
  hidden_at      TIMESTAMPTZ,
  hidden_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  -- Lần sửa gần nhất của khách ("đã chỉnh sửa")
  edited_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Mỗi sách 1 lần mỗi đơn (đơn đã thuộc về 1 người)
  UNIQUE (order_id, book_id),
  CHECK (is_hidden = (hidden_at IS NOT NULL))
);
-- Danh sách công khai của 1 sách (chỉ đang hiện), mới nhất trước
CREATE INDEX idx_reviews_book_visible ON reviews (book_id, created_at DESC) WHERE NOT is_hidden;
CREATE INDEX idx_reviews_user_id ON reviews (user_id);
-- Danh sách Admin
CREATE INDEX idx_reviews_created ON reviews (created_at DESC);
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS reviews;
