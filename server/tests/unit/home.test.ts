import { env } from '../../src/config/env';
import { isNewBook } from '../../src/services/book.service';
import { EXCERPT_LENGTH, shortenName, toExcerpt } from '../../src/services/home.service';

// Trang chủ Dark Fantasy — hàm thuần của A1, A3, A6 (docs/06-ui-ux/shop/01-trang-chu.md mục 4.4)

describe('toExcerpt — đoạn tóm tắt khối "Truyền thuyết"', () => {
  it('ngắn hơn giới hạn → giữ nguyên (bỏ khoảng trắng 2 đầu)', () => {
    expect(toExcerpt('  Một câu ngắn.  ')).toBe('Một câu ngắn.');
  });

  it('dài hơn → cắt ở ranh giới từ, bỏ dấu câu cuối, thêm "…"', () => {
    const text = `${'Kvothe kể lại cuộc đời mình, '.repeat(12)}hết.`;
    const result = toExcerpt(text);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(EXCERPT_LENGTH + 1);
    // không cắt giữa từ: phần trước "…" là một tiền tố của văn bản gốc và kết thúc trọn từ
    const body = result.slice(0, -1);
    expect(text.startsWith(body)).toBe(true);
    expect(text[body.length]).toMatch(/[\s,]/);
  });

  it('một từ rất dài không có khoảng trắng → cắt cứng đúng giới hạn', () => {
    const result = toExcerpt('a'.repeat(500), 10);
    expect(result).toBe(`${'a'.repeat(10)}…`);
  });
});

describe('shortenName — tên người đánh giá', () => {
  it.each([
    ['Nguyễn Văn An', 'Nguyễn V. An'],
    ['Trần Thị Thu Hà', 'Trần T. T. Hà'],
    ['  Lê   Minh  ', 'Lê Minh'],
    ['An', 'An'],
    ['nguyễn văn an', 'nguyễn V. an'],
  ])('%s → %s', (input, expected) => {
    expect(shortenName(input)).toBe(expected);
  });
});

describe('isNewBook — tem "Mới"', () => {
  const now = new Date('2026-10-22T12:00:00Z').getTime();
  const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000);

  it(`tạo trong vòng NEW_BOOK_DAYS (${env.NEW_BOOK_DAYS}) ngày → mới`, () => {
    expect(isNewBook(daysAgo(0), now)).toBe(true);
    expect(isNewBook(daysAgo(env.NEW_BOOK_DAYS), now)).toBe(true);
  });

  it('quá NEW_BOOK_DAYS ngày → không mới', () => {
    expect(isNewBook(daysAgo(env.NEW_BOOK_DAYS + 1), now)).toBe(false);
  });
});
