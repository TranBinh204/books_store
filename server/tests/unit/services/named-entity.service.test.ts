import type { NamedEntityRepository } from '../../../src/repositories/named-entity.repository';
import { createNamedEntityService } from '../../../src/services/named-entity.service';
import type { NamedEntity } from '../../../src/types/catalog.types';

function entity(bookCount: number): NamedEntity {
  return { id: 1, name: 'Paulo Coelho', bookCount, createdAt: new Date(), updatedAt: new Date() };
}

function makeService(repo: Partial<Record<keyof NamedEntityRepository, jest.Mock>>) {
  return createNamedEntityService({
    repository: repo as unknown as NamedEntityRepository,
    label: 'tác giả',
    codePrefix: 'AUTHOR',
  });
}

describe('namedEntityService.remove — chỉ xoá cứng khi không còn sách', () => {
  it('chưa có sách → xoá cứng', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(entity(0)), remove: jest.fn() };
    await makeService(repo).remove(1);
    expect(repo.remove).toHaveBeenCalledWith(1);
  });

  it('đang có sách → chặn (409 AUTHOR_IN_USE), không xoá', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(entity(3)), remove: jest.fn() };
    await expect(makeService(repo).remove(1)).rejects.toMatchObject({
      statusCode: 409,
      code: 'AUTHOR_IN_USE',
      message: 'Không thể xoá: tác giả đang có 3 sách',
    });
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('sách được gắn đúng lúc xoá (DB chặn bằng khoá ngoại) → 409 thay vì lỗi 500', async () => {
    const fkError = Object.assign(new Error('violates foreign key'), { code: '23503' });
    const repo = {
      findById: jest.fn().mockResolvedValue(entity(0)),
      remove: jest.fn().mockRejectedValue(fkError),
    };
    await expect(makeService(repo).remove(1)).rejects.toMatchObject({
      statusCode: 409,
      code: 'AUTHOR_IN_USE',
    });
  });
});
