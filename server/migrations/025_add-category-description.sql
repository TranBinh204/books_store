-- Up Migration

-- Mô tả ngắn của danh mục, hiện ở đầu trang danh mục (docs/06-ui-ux/shop/02-danh-muc.md, B1).
-- NULL = chưa có mô tả (client hiện câu mặc định).
ALTER TABLE categories
  ADD COLUMN description VARCHAR(300)
    CHECK (description IS NULL OR char_length(description) BETWEEN 1 AND 300);

-- Down Migration
ALTER TABLE categories DROP COLUMN IF EXISTS description;
