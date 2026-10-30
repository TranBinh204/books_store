import type { Server } from 'node:http';
import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';
import { startExpireUnpaidOrdersJob } from './jobs/expire-unpaid-orders';
import { seedDefaultAdmin } from './seeds/admin.seed';

let server: Server | undefined;
let stopJobs: (() => void)[] = [];

async function start() {
  // Tạo Admin mặc định nếu DB chưa có Admin — lỗi ở bước này không chặn server khởi động
  await seedDefaultAdmin().catch((err) => console.error('Lỗi khi tạo Admin mặc định:', err));

  server = app.listen(env.PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  if (!env.vnpayEnabled) {
    console.warn('⚠️  VNPay chưa cấu hình (VNPAY_TMN_CODE, VNPAY_HASH_SECRET) → chỉ nhận COD');
  } else if (env.VNPAY_IPN_FROM_RETURN) {
    console.warn(
      '⚠️  VNPAY_IPN_FROM_RETURN=true: trang kết quả cập nhật thanh toán thay IPN (chỉ dev)',
    );
  }

  // Tự huỷ đơn VNPay quá hạn thanh toán (M07)
  stopJobs = [startExpireUnpaidOrdersJob()];
}

async function shutdown(signal: string) {
  console.log(`${signal} → đang tắt server...`);
  stopJobs.forEach((stop) => stop());
  const closeConnections = async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  };
  if (server) server.close(closeConnections);
  else await closeConnections();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

void start();
