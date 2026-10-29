-- Up Migration

-- Tìm sách theo tên tác giả (không dấu, gần đúng) — M03 tìm kiếm
CREATE INDEX idx_authors_name_trgm ON authors USING gin (lower(f_unaccent(name)) gin_trgm_ops);
-- Lọc sách đang bán theo danh mục — mọi API công khai của cửa hàng
CREATE INDEX idx_books_active_category ON books (is_active, category_id);

-- Down Migration
DROP INDEX IF EXISTS idx_books_active_category;
DROP INDEX IF EXISTS idx_authors_name_trgm;
