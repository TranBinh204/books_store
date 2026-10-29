import { detectImageType, removeImages, saveImage, type StoredImage } from '../lib/image-storage';
import { AppError } from '../utils/AppError';

export interface UploadFile {
  originalname: string;
  buffer: Buffer;
}

/** Thư mục lưu ảnh (local: server/uploads/<folder>, Cloudinary: <CLOUDINARY_FOLDER>/<folder>) */
export type ImageFolder = 'books';

/** Kiểm tra nội dung từng ảnh rồi lưu; 1 ảnh lỗi → huỷ các ảnh đã lưu trong lượt này */
export async function uploadImages(
  files: UploadFile[],
  folder: ImageFolder,
): Promise<StoredImage[]> {
  if (files.length === 0) throw new AppError(400, 'INVALID_IMAGE', 'Vui lòng chọn ít nhất 1 ảnh');

  const images = files.map((file) => {
    const extension = detectImageType(file.buffer);
    if (!extension) {
      throw new AppError(
        400,
        'INVALID_IMAGE',
        `"${file.originalname}" không phải ảnh jpg, png, webp hợp lệ`,
      );
    }
    return { buffer: file.buffer, extension };
  });

  const saved: StoredImage[] = [];
  try {
    for (const image of images) saved.push(await saveImage(image, folder));
    return saved;
  } catch (err) {
    await removeImages(saved.map((image) => image.publicId));
    throw err;
  }
}

export function uploadBookImages(files: UploadFile[]): Promise<StoredImage[]> {
  return uploadImages(files, 'books');
}
