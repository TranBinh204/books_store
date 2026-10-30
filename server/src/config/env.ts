import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8000),
    DATABASE_URL: z.url(),
    DATABASE_URL_TEST: z.url().optional(),
    CLIENT_URL: z.url().default('http://localhost:3000'),

    // Xác thực (M01) — mọi thông số đặt trong server/.env, không có giá trị mặc định trong code
    JWT_SECRET: z.string().min(32, 'JWT_SECRET phải dài ít nhất 32 ký tự'),
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive(),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive(),
    REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().int().nonnegative(),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive(),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15),
    // Xác minh email khi đăng ký bằng mã OTP 6 số (M01-F01)
    REGISTER_OTP_TTL_MINUTES: z.coerce.number().int().positive(),
    REGISTER_OTP_MAX_ATTEMPTS: z.coerce.number().int().positive(),
    REGISTER_OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative(),

    // Giới hạn số request theo IP (chống dò mật khẩu / spam) — RATE_LIMIT_ENABLED=false để tắt khi dev
    RATE_LIMIT_ENABLED: z.enum(['true', 'false']).transform((value) => value === 'true'),
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive(),
    RATE_LIMIT_LOGIN_WINDOW_MINUTES: z.coerce.number().positive(),
    RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().positive(),
    RATE_LIMIT_REGISTER_WINDOW_MINUTES: z.coerce.number().positive(),
    RATE_LIMIT_REGISTER_VERIFY_MAX: z.coerce.number().int().positive(),
    RATE_LIMIT_REGISTER_VERIFY_WINDOW_MINUTES: z.coerce.number().positive(),
    RATE_LIMIT_REGISTER_RESEND_MAX: z.coerce.number().int().positive(),
    RATE_LIMIT_REGISTER_RESEND_WINDOW_MINUTES: z.coerce.number().positive(),
    RATE_LIMIT_FORGOT_PASSWORD_MAX: z.coerce.number().int().positive(),
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW_MINUTES: z.coerce.number().positive(),
    RATE_LIMIT_RESET_PASSWORD_MAX: z.coerce.number().int().positive(),
    RATE_LIMIT_RESET_PASSWORD_WINDOW_MINUTES: z.coerce.number().positive(),
    RATE_LIMIT_REFRESH_MAX: z.coerce.number().int().positive(),
    RATE_LIMIT_REFRESH_WINDOW_MINUTES: z.coerce.number().positive(),
    RATE_LIMIT_CHANGE_PASSWORD_MAX: z.coerce.number().int().positive(),
    RATE_LIMIT_CHANGE_PASSWORD_WINDOW_MINUTES: z.coerce.number().positive(),

    // Admin mặc định — tạo khi server khởi động nếu DB chưa có tài khoản ADMIN nào (bỏ trống = không tạo)
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_PASSWORD: z.string().optional(),
    ADMIN_NAME: z.string().optional(),

    // Email
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    MAIL_FROM: z.string().default('BookStore <no-reply@bookstore.local>'),

    // Sách & tồn kho (F03)
    LOW_STOCK_THRESHOLD: z.coerce.number().int().nonnegative().default(5),
    BOOK_MAX_IMAGES: z.coerce.number().int().positive().default(10),
    UPLOAD_MAX_FILE_MB: z.coerce.number().positive().default(5),
    NEW_BOOK_DAYS: z.coerce.number().int().positive().default(30),

    // Trang chủ Dark Fantasy (docs/06-ui-ux/shop/01-trang-chu.md mục 4)
    // Sách tạo trong vòng số ngày này → tem "Mới" (A1)
    // Khối "Truyền thuyết": chỉ chọn sách có ít nhất số đánh giá này (A3)
    FEATURED_MIN_REVIEWS: z.coerce.number().int().nonnegative().default(8),
    // GET /api/home giữ kết quả trong bộ nhớ bao nhiêu giây (A8) — 0 = không cache
    HOME_CACHE_TTL_SECONDS: z.coerce.number().int().nonnegative().default(60),

    // Lưu ảnh: local = thư mục server/uploads (phục vụ tại /api/uploads) · cloudinary = Cloudinary
    IMAGE_STORAGE: z.enum(['local', 'cloudinary']).default('local'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    CLOUDINARY_FOLDER: z.string().default('bookstore'),

    // Thanh toán VNPay (F12) — docs/04-integrations/vnpay-sandbox.md
    // Bỏ trống TMN_CODE + HASH_SECRET = tắt VNPay (chỉ nhận COD)
    VNPAY_TMN_CODE: z.string().optional(),
    VNPAY_HASH_SECRET: z.string().optional(),
    VNPAY_URL: z.url().default('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
    VNPAY_RETURN_URL: z.url().default('http://localhost:3000/thanh-toan/ket-qua'),
    VNPAY_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().default(15),
    VNPAY_CANCEL_GRACE_MINUTES: z.coerce.number().int().nonnegative().default(5),
    ORDER_EXPIRE_JOB_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
    // CHỈ DEV: /return có chữ ký hợp lệ được xử lý như IPN (local không nhận được IPN)
    VNPAY_IPN_FROM_RETURN: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.VNPAY_TMN_CODE) !== Boolean(value.VNPAY_HASH_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['VNPAY_HASH_SECRET'],
        message: 'Điền cả VNPAY_TMN_CODE và VNPAY_HASH_SECRET (hoặc bỏ trống cả hai để tắt VNPay)',
      });
    }
    if (value.VNPAY_IPN_FROM_RETURN && value.NODE_ENV === 'production') {
      ctx.addIssue({
        code: 'custom',
        path: ['VNPAY_IPN_FROM_RETURN'],
        message: 'Không được bật khi NODE_ENV=production',
      });
    }
  })
  .superRefine((value, ctx) => {
    if (value.IMAGE_STORAGE !== 'cloudinary') return;
    for (const key of [
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `Bắt buộc khi IMAGE_STORAGE=cloudinary`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Biến môi trường không hợp lệ:');
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  // Khi chạy test, dùng DB riêng để không ảnh hưởng dữ liệu thật
  DATABASE_URL:
    data.NODE_ENV === 'test' && data.DATABASE_URL_TEST ? data.DATABASE_URL_TEST : data.DATABASE_URL,
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  /** Đã điền mã website + khoá bí mật VNPay */
  vnpayEnabled: Boolean(data.VNPAY_TMN_CODE && data.VNPAY_HASH_SECRET),
};
