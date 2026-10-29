import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

export interface StoredImage {
  url: string;
  /** Định danh để xoá ảnh sau này (đường dẫn tương đối khi local, public_id khi Cloudinary) */
  publicId: string;
}

export interface ImageInput {
  buffer: Buffer;
  extension: 'jpg' | 'png' | 'webp';
}

interface ImageStorage {
  save(image: ImageInput, folder: string): Promise<StoredImage>;
  remove(publicId: string): Promise<void>;
}

// ---------- Local: server/uploads, phục vụ tại /api/uploads ----------

export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
export const UPLOADS_URL_PREFIX = '/api/uploads';
const SAFE_PUBLIC_ID = /^[a-z0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/;

const localStorage: ImageStorage = {
  async save(image, folder) {
    const fileName = `${randomUUID()}.${image.extension}`;
    const dir = path.join(UPLOADS_DIR, folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), image.buffer);
    const publicId = `${folder}/${fileName}`;
    return { url: `${UPLOADS_URL_PREFIX}/${publicId}`, publicId };
  },
  async remove(publicId) {
    // Chỉ xoá đúng dạng tên do mình tạo → không thể xoá file ngoài thư mục uploads
    if (!SAFE_PUBLIC_ID.test(publicId)) return;
    await unlink(path.join(UPLOADS_DIR, publicId)).catch(() => undefined);
  },
};

// ---------- Cloudinary ----------

let cloudinaryConfigured = false;
function configureCloudinary() {
  if (cloudinaryConfigured) return;
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  cloudinaryConfigured = true;
}

const cloudinaryStorage: ImageStorage = {
  save(image, folder) {
    configureCloudinary();
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: [env.CLOUDINARY_FOLDER, folder].filter(Boolean).join('/'),
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload Cloudinary thất bại'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(image.buffer);
    });
  },
  async remove(publicId) {
    configureCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' }).catch(() => undefined);
  },
};

const storage: ImageStorage = env.IMAGE_STORAGE === 'cloudinary' ? cloudinaryStorage : localStorage;

export function saveImage(image: ImageInput, folder: string) {
  return storage.save(image, folder);
}

/** Xoá nhiều ảnh, bỏ qua lỗi (ảnh đã mất cũng không sao) */
export async function removeImages(publicIds: string[]) {
  await Promise.allSettled(publicIds.map((id) => storage.remove(id)));
}

/**
 * Nhận diện định dạng ảnh từ nội dung file (magic bytes) — không tin mimetype trình duyệt gửi lên.
 * Trả về null nếu không phải jpg / png / webp.
 */
export function detectImageType(buffer: Buffer): ImageInput['extension'] | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}
