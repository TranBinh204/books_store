import * as categoryRepository from '../repositories/category.repository';
import type { CreateCategoryInput, UpdateCategoryInput } from '../schemas/category.schema';
import type {
  Category,
  CategoryNode,
  PublicCategoryDetail,
  PublicCategoryNode,
} from '../types/catalog.types';
import { AppError } from '../utils/AppError';
import { isForeignKeyViolation, isUniqueViolation } from '../utils/dbError';

function nameExistsError() {
  return new AppError(
    409,
    'CATEGORY_NAME_EXISTS',
    'Tên danh mục đã tồn tại trong danh mục cha này',
    [{ field: 'name', message: 'Tên danh mục đã tồn tại trong danh mục cha này' }],
  );
}

function notFound() {
  return AppError.notFound('Không tìm thấy danh mục');
}

/** Gom danh sách phẳng thành cây 2 cấp (giữ nguyên thứ tự của danh sách) */
export function buildTree<T extends { id: number; parentId: number | null }>(
  categories: T[],
): (T & { children: T[] })[] {
  const roots = categories
    .filter((c) => c.parentId === null)
    .map((root) => ({ ...root, children: [] as T[] }));
  const byId = new Map(roots.map((root) => [root.id, root]));
  for (const category of categories) {
    if (category.parentId !== null) byId.get(category.parentId)?.children.push(category);
  }
  return roots;
}

export async function listTree(): Promise<CategoryNode[]> {
  return buildTree(await categoryRepository.findAll());
}

// ---------- Cửa hàng (API công khai) ----------

export async function getPublicTree(): Promise<PublicCategoryNode[]> {
  // Mô tả chỉ cần ở trang danh mục — bỏ khỏi cây (header gọi ở mọi trang)
  const categories = await categoryRepository.findAllPublic();
  return buildTree(categories.map(({ description: _description, ...rest }) => rest));
}

/** 1 danh mục đang hiển thị + cha (breadcrumb) + các con đang hiển thị; ẩn / không có → 404 */
export async function getPublicById(id: number): Promise<PublicCategoryDetail> {
  const categories = await categoryRepository.findAllPublic();
  const category = categories.find((c) => c.id === id);
  if (!category) throw notFound();

  const parent = categories.find((c) => c.id === category.parentId);
  return {
    ...category,
    parent: parent ? { id: parent.id, name: parent.name } : null,
    children: categories.filter((c) => c.parentId === id),
  };
}

export async function getById(id: number): Promise<Category> {
  const category = await categoryRepository.findById(id);
  if (!category) throw notFound();
  return category;
}

/** Danh mục cha phải tồn tại và là danh mục GỐC (chỉ 2 cấp) */
async function assertValidParent(parentId: number | null, selfId?: number) {
  if (parentId === null) return;
  if (parentId === selfId) {
    throw new AppError(400, 'CATEGORY_TOO_DEEP', 'Danh mục không thể là cha của chính nó');
  }
  const parent = await categoryRepository.findById(parentId);
  if (!parent) {
    throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy danh mục cha', [
      { field: 'parentId', message: 'Danh mục cha không tồn tại' },
    ]);
  }
  if (parent.parentId !== null) {
    throw new AppError(
      400,
      'CATEGORY_TOO_DEEP',
      'Chỉ hỗ trợ 2 cấp: không thể chọn danh mục con làm cha',
      [{ field: 'parentId', message: 'Chỉ được chọn danh mục gốc làm cha' }],
    );
  }
}

async function saveWithUniqueCheck<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (err) {
    if (isUniqueViolation(err, 'uq_categories_parent_name')) throw nameExistsError();
    throw err;
  }
}

export async function create(input: CreateCategoryInput): Promise<Category> {
  await assertValidParent(input.parentId);
  if (await categoryRepository.nameExists(input.parentId, input.name)) throw nameExistsError();

  const id = await saveWithUniqueCheck(() => categoryRepository.create(input));
  return getById(id);
}

export async function update(id: number, input: UpdateCategoryInput): Promise<Category> {
  const current = await getById(id);
  const next = {
    name: input.name ?? current.name,
    parentId: input.parentId === undefined ? current.parentId : input.parentId,
    sortOrder: input.sortOrder ?? current.sortOrder,
    isActive: input.isActive ?? current.isActive,
    iconKey: input.iconKey === undefined ? current.iconKey : input.iconKey,
    description: input.description === undefined ? current.description : input.description,
  };

  if (next.parentId !== current.parentId) {
    await assertValidParent(next.parentId, id);
    // Danh mục đang có con thì không thể trở thành danh mục con (vượt 2 cấp)
    if (next.parentId !== null && (await categoryRepository.hasChildren(id))) {
      throw new AppError(
        400,
        'CATEGORY_TOO_DEEP',
        'Danh mục đang có danh mục con nên không thể đặt làm danh mục con',
        [{ field: 'parentId', message: 'Danh mục đang có danh mục con' }],
      );
    }
  }
  if (await categoryRepository.nameExists(next.parentId, next.name, id)) throw nameExistsError();

  await saveWithUniqueCheck(() => categoryRepository.update(id, next));
  return getById(id);
}

/**
 * Chỉ xoá cứng khi danh mục KHÔNG còn danh mục con và KHÔNG còn sách; ngược lại → chặn.
 * Muốn ẩn danh mục khỏi cửa hàng: dùng công tắc Hiển thị / Ẩn (is_active).
 */
export async function remove(id: number): Promise<void> {
  const category = await getById(id);
  if (await categoryRepository.hasChildren(id)) {
    throw new AppError(
      409,
      'CATEGORY_NOT_EMPTY',
      'Không thể xoá: danh mục còn danh mục con — hãy xoá hoặc chuyển các danh mục con trước',
    );
  }
  if (category.bookCount > 0) {
    throw new AppError(
      409,
      'CATEGORY_NOT_EMPTY',
      `Không thể xoá: danh mục đang có ${category.bookCount} sách — có thể ẩn danh mục thay vì xoá`,
    );
  }
  try {
    await categoryRepository.remove(id);
  } catch (err) {
    // Có sách / danh mục con vừa được thêm đúng lúc xoá → khoá ngoại RESTRICT của DB chặn lại
    if (isForeignKeyViolation(err)) {
      throw new AppError(409, 'CATEGORY_NOT_EMPTY', 'Không thể xoá: danh mục đang được sử dụng');
    }
    throw err;
  }
}
