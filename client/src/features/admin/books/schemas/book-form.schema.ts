import { z } from 'zod';

// Các ô số để dạng chuỗi trong form (người dùng có thể để trống), chuyển sang số khi gửi

const digits = (label: string) => z.string().trim().regex(/^\d*$/, `${label} chỉ gồm chữ số`);

const idName = z.object({ id: z.number(), name: z.string() });

export const bookFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Vui lòng nhập tên sách').max(255, 'Tối đa 255 ký tự'),
    categoryId: z.number({ error: 'Vui lòng chọn danh mục' }).nullable(),
    authors: z.array(idName).min(1, 'Chọn ít nhất 1 tác giả').max(10, 'Tối đa 10 tác giả'),
    publisher: idName.nullable(),
    isbn: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || /^(\d{9}[\dXx]|\d{13})$/.test(value.replace(/[-\s]/g, '')),
        'ISBN gồm 10 hoặc 13 chữ số',
      ),
    description: z.string().max(10_000, 'Tối đa 10.000 ký tự'),
    publishYear: digits('Năm xuất bản').refine(
      (value) =>
        value === '' || (Number(value) >= 1900 && Number(value) <= new Date().getFullYear() + 1),
      'Năm xuất bản không hợp lệ',
    ),
    pages: digits('Số trang'),
    size: z.string().trim().max(30, 'Tối đa 30 ký tự'),
    weightGram: digits('Trọng lượng'),
    coverType: z.enum(['', 'PAPERBACK', 'HARDCOVER']),
    originalPrice: digits('Giá bìa').min(1, 'Vui lòng nhập giá bìa'),
    price: digits('Giá bán').min(1, 'Vui lòng nhập giá bán'),
    isActive: z.boolean(),
    initialStock: digits('Tồn kho'),
    images: z.array(z.object({ url: z.string(), publicId: z.string() })),
  })
  .refine((value) => value.categoryId !== null, {
    path: ['categoryId'],
    message: 'Vui lòng chọn danh mục',
  })
  .refine(
    (value) =>
      value.price === '' ||
      value.originalPrice === '' ||
      Number(value.price) <= Number(value.originalPrice),
    { path: ['price'], message: 'Giá bán không được lớn hơn giá bìa' },
  );

export type BookFormValues = z.infer<typeof bookFormSchema>;

export const EMPTY_BOOK_FORM: BookFormValues = {
  title: '',
  categoryId: null,
  authors: [],
  publisher: null,
  isbn: '',
  description: '',
  publishYear: '',
  pages: '',
  size: '',
  weightGram: '',
  coverType: '',
  originalPrice: '',
  price: '',
  isActive: true,
  initialStock: '0',
  images: [],
};
