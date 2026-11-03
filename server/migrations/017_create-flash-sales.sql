-- Up Migration

-- Flash Sale (M12 – F17). Thiết kế: docs/02-design/database.md · docs/03-modules/12-promotion-flash-sale.md
CREATE TABLE flash_sales (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  -- Tắt = dừng sớm. Các chương trình đang bật không chồng giờ (kiểm tra ở service, advisory lock)
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);
-- Tìm chương trình đang chạy & kiểm tra chồng giờ
CREATE INDEX idx_flash_sales_active_time ON flash_sales (start_at, end_at) WHERE is_active;
CREATE TRIGGER trg_flash_sales_updated_at BEFORE UPDATE ON flash_sales
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE flash_sale_items (
  id              SERIAL PRIMARY KEY,
  flash_sale_id   INTEGER NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  book_id         INTEGER NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  -- < giá bán lúc thêm (kiểm tra ở service)
  sale_price      BIGINT NOT NULL CHECK (sale_price > 0),
  -- Tổng suất
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  -- Số cuốn đang giữ suất (huỷ đơn → trả)
  sold            INTEGER NOT NULL DEFAULT 0 CHECK (sold >= 0),
  per_user_limit  INTEGER NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (flash_sale_id, book_id),
  CHECK (sold <= quantity)
);
-- Tra giá sale theo sách
CREATE INDEX idx_flash_sale_items_book ON flash_sale_items (book_id);
CREATE TRIGGER trg_flash_sale_items_updated_at BEFORE UPDATE ON flash_sale_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Dòng đơn mua giá flash sale: đếm lượt / người, trả suất khi huỷ, chặn xoá chương trình đã có đơn
ALTER TABLE order_items
  ADD COLUMN flash_sale_item_id INTEGER REFERENCES flash_sale_items(id) ON DELETE RESTRICT;
CREATE INDEX idx_order_items_flash_sale_item ON order_items (flash_sale_item_id)
  WHERE flash_sale_item_id IS NOT NULL;

-- Down Migration
DROP INDEX IF EXISTS idx_order_items_flash_sale_item;
ALTER TABLE order_items DROP COLUMN IF EXISTS flash_sale_item_id;
DROP TABLE IF EXISTS flash_sale_items;
DROP TABLE IF EXISTS flash_sales;
