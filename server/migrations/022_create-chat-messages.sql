-- Up Migration

-- Chatbox tư vấn AI (M16 – F21). Thiết kế: docs/03-modules/16-chatbox.md · docs/02-design/database.md

-- Chỉ lưu hỏi – đáp để khách xem lại (1 cuộc trò chuyện / khách).
-- KHÔNG lưu kết quả công cụ, prompt, câu "đang bận", câu trả lời tĩnh của câu hỏi có sẵn.
CREATE TABLE chat_messages (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
  content     TEXT NOT NULL,
  -- Sách trợ lý gợi ý trong câu trả lời (theo thứ tự). Không FK: sách bị xoá thì lọc khi hiện
  book_ids    INTEGER[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lịch sử của tôi (mới nhất trước, phân trang lùi theo id) · lấy N tin gần nhất làm ngữ cảnh AI
CREATE INDEX idx_chat_messages_user_id ON chat_messages (user_id, id DESC);
-- Job xoá tin cũ hơn CHAT_RETENTION_DAYS
CREATE INDEX idx_chat_messages_created_at ON chat_messages (created_at);

-- Down Migration
DROP TABLE IF EXISTS chat_messages;
