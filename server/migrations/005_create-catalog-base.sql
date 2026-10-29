-- Up Migration

-- unaccent() không phải IMMUTABLE → bọc lại để dùng được trong index (tìm kiếm tiếng Việt không dấu)
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

-- Danh mục 2 cấp (cha – con). Giới hạn 2 cấp kiểm tra ở service.
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE RESTRICT,
  name        VARCHAR(100) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR parent_id <> id)
);
-- Không trùng tên trong cùng danh mục cha (không phân biệt hoa thường)
CREATE UNIQUE INDEX uq_categories_parent_name ON categories (COALESCE(parent_id, 0), lower(name));
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE authors (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_authors_name ON authors (lower(name));
CREATE TRIGGER trg_authors_updated_at BEFORE UPDATE ON authors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE publishers (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_publishers_name ON publishers (lower(name));
CREATE TRIGGER trg_publishers_updated_at BEFORE UPDATE ON publishers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Down Migration
DROP TABLE IF EXISTS publishers;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS categories;
DROP FUNCTION IF EXISTS f_unaccent(text);
