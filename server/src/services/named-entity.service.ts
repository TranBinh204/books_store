import {
  authorRepository,
  publisherRepository,
  type NamedEntityRepository,
} from '../repositories/named-entity.repository';
import type { NamedEntity } from '../types/catalog.types';
import { AppError } from '../utils/AppError';
import { isForeignKeyViolation, isUniqueViolation } from '../utils/dbError';
import { buildMeta, type PageParams } from '../utils/pagination';

interface NamedEntityServiceConfig {
  repository: NamedEntityRepository;
  /** Tên hiển thị, vd "tác giả" */
  label: string;
  /** Tiền tố mã lỗi, vd "AUTHOR" → AUTHOR_NAME_EXISTS, AUTHOR_IN_USE */
  codePrefix: 'AUTHOR' | 'PUBLISHER';
}

/** Service dùng chung cho tác giả & nhà xuất bản */
export function createNamedEntityService({
  repository,
  label,
  codePrefix,
}: NamedEntityServiceConfig) {
  const nameExists = () =>
    new AppError(409, `${codePrefix}_NAME_EXISTS`, `Tên ${label} đã tồn tại`, [
      { field: 'name', message: `Tên ${label} đã tồn tại` },
    ]);

  const inUse = (bookCount?: number) =>
    new AppError(
      409,
      `${codePrefix}_IN_USE`,
      bookCount
        ? `Không thể xoá: ${label} đang có ${bookCount} sách`
        : `Không thể xoá: ${label} đang có sách`,
    );

  async function getById(id: number): Promise<NamedEntity> {
    const entity = await repository.findById(id);
    if (!entity) throw AppError.notFound(`Không tìm thấy ${label}`);
    return entity;
  }

  async function withUniqueCheck<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (err) {
      if (isUniqueViolation(err)) throw nameExists();
      throw err;
    }
  }

  return {
    getById,

    async list(keyword: string | undefined, page: PageParams) {
      const { items, total } = await repository.list(keyword, page);
      return { items, meta: buildMeta(total, page) };
    },

    async create(name: string): Promise<NamedEntity> {
      if (await repository.nameExists(name)) throw nameExists();
      const id = await withUniqueCheck(() => repository.create(name));
      return getById(id);
    },

    async rename(id: number, name: string): Promise<NamedEntity> {
      await getById(id);
      if (await repository.nameExists(name, id)) throw nameExists();
      await withUniqueCheck(() => repository.rename(id, name));
      return getById(id);
    },

    /** Chỉ xoá cứng khi KHÔNG còn sách nào dùng; còn sách → chặn */
    async remove(id: number): Promise<void> {
      const entity = await getById(id);
      if (entity.bookCount > 0) throw inUse(entity.bookCount);
      try {
        await repository.remove(id);
      } catch (err) {
        // Có sách vừa được gắn đúng lúc xoá → khoá ngoại RESTRICT của DB chặn lại
        if (isForeignKeyViolation(err)) throw inUse();
        throw err;
      }
    },
  };
}

export type NamedEntityService = ReturnType<typeof createNamedEntityService>;

export const authorService = createNamedEntityService({
  repository: authorRepository,
  label: 'tác giả',
  codePrefix: 'AUTHOR',
});

export const publisherService = createNamedEntityService({
  repository: publisherRepository,
  label: 'nhà xuất bản',
  codePrefix: 'PUBLISHER',
});
