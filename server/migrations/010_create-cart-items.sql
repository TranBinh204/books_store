-- Up Migration

-- Giỏ hàng của tài khoản (M05 – F10). Giỏ của khách chưa đăng nhập lưu ở trình duyệt.
-- Không lưu giá — giá hiện tại lấy từ books, chốt khi đặt hàng (M06).
CREATE TABLE cart_items (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Sách bị xoá cứng (backlog F1) → tự ra khỏi giỏ
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
CREATE INDEX idx_cart_items_book_id ON cart_items (book_id);
CREATE TRIGGER trg_cart_items_updated_at BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS cart_items;
