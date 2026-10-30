-- Up Migration

-- Sách yêu thích (M09 – F14). Thiết kế: docs/02-design/database.md · docs/03-modules/09-wishlist.md
CREATE TABLE wishlists (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Sách chỉ bị xoá cứng khi chưa từng bán (backlog F1) → dòng yêu thích xoá theo
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);
-- Danh sách của tôi: mới lưu trước
CREATE INDEX idx_wishlists_user_created ON wishlists (user_id, created_at DESC);
-- Khoá ngoại / sau này M13 "sách yêu thích giảm giá"
CREATE INDEX idx_wishlists_book_id ON wishlists (book_id);

-- Down Migration
DROP TABLE IF EXISTS wishlists;
