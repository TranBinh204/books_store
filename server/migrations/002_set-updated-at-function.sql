-- Up Migration
-- Hàm dùng chung: tự cập nhật cột updated_at mỗi khi UPDATE một dòng.
-- Mỗi bảng có updated_at gắn trigger:
--   CREATE TRIGGER trg_<bảng>_updated_at BEFORE UPDATE ON <bảng>
--   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Down Migration
DROP FUNCTION IF EXISTS set_updated_at();
