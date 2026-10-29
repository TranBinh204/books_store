-- Up Migration
CREATE TABLE books (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  publisher_id    INTEGER REFERENCES publishers(id) ON DELETE RESTRICT,
  isbn            VARCHAR(20) UNIQUE,
  description     TEXT,
  publish_year    SMALLINT CHECK (publish_year BETWEEN 1900 AND 2100),
  pages           INTEGER CHECK (pages > 0),
  size            VARCHAR(30),
  weight_gram     INTEGER CHECK (weight_gram > 0),
  cover_type      TEXT CHECK (cover_type IN ('PAPERBACK', 'HARDCOVER')),
  original_price  BIGINT NOT NULL CHECK (original_price >= 0),
  price           BIGINT NOT NULL CHECK (price >= 0),
  stock           INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sold_count      INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  rating_avg      NUMERIC(2,1) NOT NULL DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (price <= original_price)
);
CREATE INDEX idx_books_category_id ON books (category_id);
CREATE INDEX idx_books_publisher_id ON books (publisher_id);
CREATE INDEX idx_books_price ON books (price);
CREATE INDEX idx_books_created_at ON books (created_at);
CREATE INDEX idx_books_sold_count ON books (sold_count);
-- Tìm kiếm gần đúng, không dấu theo tên sách
CREATE INDEX idx_books_title_trgm ON books USING gin (lower(f_unaccent(title)) gin_trgm_ops);
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sách ↔ tác giả (nhiều – nhiều, có thứ tự; 0 = tác giả chính)
CREATE TABLE book_authors (
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  author_id   INTEGER NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (book_id, author_id)
);
CREATE INDEX idx_book_authors_author_id ON book_authors (author_id);

-- Ảnh sách (0 = ảnh đại diện)
CREATE TABLE book_images (
  id          SERIAL PRIMARY KEY,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  public_id   VARCHAR(255) NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_book_images_book_id ON book_images (book_id, sort_order);

-- Lịch sử tồn kho. order_id: khoá ngoại thêm khi tạo bảng orders (F11)
CREATE TABLE inventory_logs (
  id           SERIAL PRIMARY KEY,
  book_id      INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  change       INTEGER NOT NULL,
  stock_after  INTEGER NOT NULL CHECK (stock_after >= 0),
  reason       TEXT NOT NULL CHECK (reason IN ('IMPORT', 'ADJUST', 'ORDER', 'CANCEL')),
  order_id     INTEGER,
  note         TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_logs_book_id ON inventory_logs (book_id, created_at DESC);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs (created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS inventory_logs;
DROP TABLE IF EXISTS book_images;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS books;
