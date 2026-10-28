-- Up Migration
-- unaccent: tìm kiếm tiếng Việt không dấu · pg_trgm: tìm kiếm gần đúng (trigram)
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Down Migration
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS unaccent;
