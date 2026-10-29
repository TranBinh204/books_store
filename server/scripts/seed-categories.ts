/**
 * Nạp danh mục mặc định (theo azvietnam.vn) — chạy tay khi cần.
 *
 *   docker compose exec server npm run seed:categories
 *
 * Chạy lại nhiều lần an toàn: danh mục đã có (trùng tên trong cùng cha) được bỏ qua.
 */
import { pool } from '../src/db/pool';
import { seedCategories } from '../src/seeds/categories.seed';

seedCategories()
  .then(({ created, skipped }) => {
    console.log(`✅ Danh mục: thêm mới ${created}, bỏ qua ${skipped} (đã có)`);
  })
  .catch((err) => {
    console.error('❌', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
