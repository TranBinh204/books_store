import type { NextConfig } from 'next';

// Địa chỉ server Express. Trong Docker là http://server:8000, chạy ngoài Docker là http://localhost:8000
const API_URL = process.env.API_URL ?? 'http://localhost:8000';

// Docker Desktop trên Windows không truyền sự kiện sửa file vào container → bật polling khi cần
const pollIntervalMs = Number(process.env.NEXT_WATCH_POLL_MS) || undefined;

const nextConfig: NextConfig = {
  // Client gọi /api/* → chuyển tiếp sang server (cùng domain, không cần CORS)
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/api/:path*` }];
  },
  // Ảnh sách thu nhỏ bằng Cloudinary (src/lib/image-loader.ts), không qua bộ tối ưu ảnh của Next.js
  images: { loader: 'custom', loaderFile: './src/lib/image-loader.ts' },
  ...(pollIntervalMs && { watchOptions: { pollIntervalMs } }),
};

export default nextConfig;
