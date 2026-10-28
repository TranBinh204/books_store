// Ảnh sách: Cloudinary (IMAGE_STORAGE=cloudinary) hoặc file local của server (/api/uploads/...)

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/**
 * URL ảnh đã thu nhỏ theo bề rộng (px): ảnh Cloudinary được chèn `w_<n>,f_auto,q_auto`
 * (Cloudinary tự đổi kích thước & định dạng WebP/AVIF). Ảnh local giữ nguyên.
 *   imageUrl('https://res.cloudinary.com/x/image/upload/v1/a.jpg', 400)
 *   → 'https://res.cloudinary.com/x/image/upload/w_400,c_limit,f_auto,q_auto/v1/a.jpg'
 */
export function imageUrl(url: string, width: number, quality: number | 'auto' = 'auto') {
  const match = CLOUDINARY_UPLOAD.exec(url);
  if (!match) return url;
  return `${match[1]}w_${width},c_limit,f_auto,q_${quality}/${match[2]}`;
}
