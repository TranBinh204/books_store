-- Up Migration

-- AI gợi ý sách (M15 – F20). Thiết kế: docs/03-modules/15-ai.md · docs/02-design/database.md

-- Sở thích đọc sách: mô tả tự do + đã hỏi ở lần đăng nhập đầu chưa
CREATE TABLE user_preferences (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  note          TEXT NOT NULL DEFAULT '',
  -- NULL = chưa hỏi lần đầu (client hiện hộp thoại); Lưu hoặc Bỏ qua → đặt giờ, không hỏi lại
  onboarded_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Thể loại / tác giả yêu thích. Xoá danh mục / tác giả → tự bỏ khỏi sở thích (không chặn xoá)
CREATE TABLE user_preferred_categories (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, category_id)
);
CREATE INDEX idx_user_preferred_categories_category ON user_preferred_categories (category_id);

CREATE TABLE user_preferred_authors (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id  INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, author_id)
);
CREATE INDEX idx_user_preferred_authors_author ON user_preferred_authors (author_id);

-- Kết quả gợi ý gần nhất của mỗi khách (chỉ lưu kết quả có AI)
CREATE TABLE recommendation_cache (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Băm hồ sơ sở thích lúc gợi ý; hồ sơ đổi → không dùng lại
  profile_hash  VARCHAR(64) NOT NULL,
  -- [{ "bookId": 12, "reason": "..." }] theo thứ tự gợi ý
  items         JSONB NOT NULL,
  model         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE IF EXISTS recommendation_cache;
DROP TABLE IF EXISTS user_preferred_authors;
DROP TABLE IF EXISTS user_preferred_categories;
DROP TABLE IF EXISTS user_preferences;
