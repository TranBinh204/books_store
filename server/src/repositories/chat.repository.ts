import { pool, type Queryable } from '../db/pool';
import {
  PUBLIC_BOOKS_FROM,
  PUBLIC_BOOKS_VISIBLE,
  PUBLIC_COLUMNS,
  type PublicBookRow,
} from './book.repository';

// Chatbox tư vấn AI (M16) — bảng chat_messages: chỉ lưu hỏi – đáp (docs/03-modules/16-chatbox.md mục 6.5)

export type ChatRole = 'USER' | 'ASSISTANT';

export interface ChatMessageRow {
  id: number;
  role: ChatRole;
  content: string;
  bookIds: number[];
  createdAt: Date;
}

const COLUMNS = `id, role, content, book_ids AS "bookIds", created_at AS "createdAt"`;

export async function insert(
  userId: number,
  message: { role: ChatRole; content: string; bookIds?: number[] },
  db: Queryable = pool,
): Promise<ChatMessageRow> {
  const { rows } = await db.query<ChatMessageRow>(
    `INSERT INTO chat_messages (user_id, role, content, book_ids)
     VALUES ($1, $2, $3, $4::int[]) RETURNING ${COLUMNS}`,
    [userId, message.role, message.content, message.bookIds ?? []],
  );
  return rows[0];
}

/** Tin của tôi, mới nhất trước; `before` → chỉ lấy tin có id nhỏ hơn (tải tin cũ hơn) */
export async function listByUser(
  userId: number,
  { before, limit }: { before?: number; limit: number },
  db: Queryable = pool,
): Promise<ChatMessageRow[]> {
  const { rows } = await db.query<ChatMessageRow>(
    `SELECT ${COLUMNS} FROM chat_messages
     WHERE user_id = $1 AND ($2::int IS NULL OR id < $2)
     ORDER BY id DESC
     LIMIT $3`,
    [userId, before ?? null, limit],
  );
  return rows;
}

export async function deleteByUser(userId: number, db: Queryable = pool): Promise<number> {
  const { rowCount } = await db.query('DELETE FROM chat_messages WHERE user_id = $1', [userId]);
  return rowCount ?? 0;
}

/** Job dọn: xoá tin cũ hơn `days` ngày */
export async function deleteOlderThan(days: number, db: Queryable = pool): Promise<number> {
  const { rowCount } = await db.query(
    `DELETE FROM chat_messages WHERE created_at < now() - make_interval(days => $1)`,
    [days],
  );
  return rowCount ?? 0;
}

/** Thẻ sách đang bán của các id (kể cả hết hàng — thẻ hiện nhãn "Hết hàng"), thứ tự tuỳ ý */
export async function findBookCards(ids: number[], db: Queryable = pool): Promise<PublicBookRow[]> {
  if (ids.length === 0) return [];
  const { rows } = await db.query<PublicBookRow>(
    `SELECT ${PUBLIC_COLUMNS} FROM ${PUBLIC_BOOKS_FROM}
     WHERE b.id = ANY($1::int[]) AND ${PUBLIC_BOOKS_VISIBLE}`,
    [ids],
  );
  return rows;
}
