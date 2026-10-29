import type { Queryable } from '../db/pool';
import { withTransaction } from '../db/transaction';
import type { CategoryIconKey } from '../schemas/category.schema';

/**
 * Danh mục mặc định theo menu azvietnam.vn (9 cha · 33 con).
 * azvietnam có 3 cấp ở nhánh Ôn Thi & Chiêm Tinh → dồn cấp 3 lên làm con của danh mục cha (DB chỉ 2 cấp).
 */
const DEFAULT_CATEGORIES: { name: string; iconKey: CategoryIconKey; description: string; children: string[] }[] = [
  {
    name: 'Sách Kỹ Năng',
    iconKey: 'ky-nang',
    description:
      'Những cuốn sổ tay của người đi trước: rèn thói quen, giao tiếp, nuôi dạy con và nấu ăn cho cuộc sống thường ngày.',
    children: [
      'Sách Self Help - Chữa Lành',
      'Sách Nấu Ăn',
      'Sách Nuôi Dạy Con',
      'Sách Phát Triển Bản Thân',
      'Sách Kỹ Năng Giao Tiếp - Ứng Xử',
      'Sách Truyền Cảm Hứng',
      'Sách Tô Màu',
    ],
  },
  {
    name: 'Sách Tâm Lý - Trinh Thám',
    iconKey: 'tam-ly',
    description:
      'Bước vào mê cung tâm trí và những vụ án chưa có lời giải, nơi mỗi trang sách là một manh mối.',
    children: ['Sách Tâm Lý', 'Sách Trinh Thám - Kinh Dị'],
  },
  {
    name: 'Sách Văn Học',
    iconKey: 'van-hoc',
    description:
      'Truyện, tiểu thuyết, thơ và tản văn trong và ngoài nước dành cho những buổi tối chỉ muốn đọc và lắng lại.',
    children: ['Sách Văn Học Việt Nam', 'Sách Văn Học Nước Ngoài', 'Sách Tản Văn - Thơ'],
  },
  {
    name: 'Sách Thiếu Nhi',
    iconKey: 'thieu-nhi',
    description:
      'Những trang sách màu sắc giúp các bạn nhỏ học, chơi, tô màu và làm quen với thế giới chữ.',
    children: [
      'Sách Kỹ Năng Cho Bé',
      'Sách Bóc Dán Sticker - Giấy Gấp',
      'Sách Luyện Viết - Tô Chữ',
      'Sách Tô Màu Thiếu Nhi',
    ],
  },
  {
    name: 'Sách Đam Mỹ - Ngôn Tình',
    iconKey: 'ngon-tinh',
    description:
      'Những câu chuyện tình yêu đủ vị: ngọt ngào, day dứt và cả những cái kết khiến ta thở dài.',
    children: ['Sách Đam Mỹ', 'Sách Bách Hợp', 'Sách Ngôn Tình'],
  },
  {
    name: 'Sách Ôn Thi - Ngoại Ngữ',
    iconKey: 'on-thi',
    description:
      'Hành trang cho kỳ thi và cho những ngôn ngữ mới: đề luyện, giáo trình và sách song ngữ.',
    children: [
      'Sách Ôn Thi',
      'Sách Ôn Thi Ngữ Văn',
      'Sách Ôn Thi Tiếng Anh',
      'Sách Ôn Thi THPT',
      'Sách Tiếng Trung',
      'Sách Song Ngữ',
    ],
  },
  {
    name: 'Sách Chiêm Tinh - Fantasy',
    iconKey: 'fantasy',
    description:
      'Vì sao, lá bài và những vương quốc phép thuật dành cho người thích tin vào điều kỳ diệu.',
    children: ['Sách Chiêm Tinh', 'Bộ Bài - Hướng Dẫn Tarot', 'Manifest', 'Sách Fantasy'],
  },
  {
    name: 'Light Novel - Manga Comic',
    iconKey: 'manga',
    description:
      'Thế giới tranh vẽ và tiểu thuyết nhẹ của những tác phẩm được độc giả trẻ yêu thích.',
    children: ['Light Novel', 'Manga - Comic'],
  },
  {
    name: 'Sách Tình Cảm Gia Đình',
    iconKey: 'gia-dinh',
    description:
      'Những trang sách về mái nhà, tình thân và những điều giản dị làm nên ký ức.',
    children: ['Sách Truyện Tranh', 'Sách Văn Học - Kỹ Năng'],
  },
];

/** Thêm 1 danh mục; đã có tên trùng trong cùng cha → bỏ qua. Trả id (mới hoặc sẵn có) + đã thêm hay chưa */
async function upsertCategory(
  db: Queryable,
  parentId: number | null,
  name: string,
  sortOrder: number,
): Promise<{ id: number; created: boolean }> {
  const inserted = await db.query<{ id: number }>(
    `INSERT INTO categories (parent_id, name, sort_order) VALUES ($1, $2, $3)
     ON CONFLICT (COALESCE(parent_id, 0), lower(name)) DO NOTHING
     RETURNING id`,
    [parentId, name, sortOrder],
  );
  if (inserted.rows[0]) return { id: inserted.rows[0].id, created: true };

  const existing = await db.query<{ id: number }>(
    `SELECT id FROM categories WHERE COALESCE(parent_id, 0) = COALESCE($1::int, 0) AND lower(name) = lower($2)`,
    [parentId, name],
  );
  return { id: existing.rows[0].id, created: false };
}

/**
 * Nạp danh mục mặc định — chạy tay khi cần (`npm run seed:categories`), không tự chạy khi khởi động.
 * Chạy lại nhiều lần an toàn: danh mục đã có (trùng tên trong cùng cha) được giữ nguyên.
 */
export async function seedCategories(): Promise<{ created: number; skipped: number }> {
  return withTransaction(async (client) => {
    let created = 0;
    let skipped = 0;
    const count = (result: { created: boolean }) => (result.created ? created++ : skipped++);

    for (const [i, parent] of DEFAULT_CATEGORIES.entries()) {
      const parentResult = await upsertCategory(client, null, parent.name, i + 1);
      count(parentResult);
      // Icon giao diện Dark Fantasy — chỉ gắn khi danh mục chưa có icon (không đè lựa chọn của Admin)
      await client.query('UPDATE categories SET icon_key = $2 WHERE id = $1 AND icon_key IS NULL', [
        parentResult.id,
        parent.iconKey,
      ]);
      // Mô tả trang danh mục — cũng chỉ gắn khi còn trống
      await client.query(
        'UPDATE categories SET description = $2 WHERE id = $1 AND description IS NULL',
        [parentResult.id, parent.description],
      );
      for (const [j, child] of parent.children.entries()) {
        count(await upsertCategory(client, parentResult.id, child, j + 1));
      }
    }
    return { created, skipped };
  });
}
