import { env } from '../config/env';
import { expireUnpaidOrders } from '../services/order.service';

// Job tự huỷ đơn VNPay quá hạn thanh toán (M07 quy tắc 9) — chạy trong tiến trình server.
// Nhiều server chạy cùng lúc vẫn an toàn: mỗi đơn được khoá FOR UPDATE SKIP LOCKED.

let running = false;

async function tick() {
  if (running) return; // lượt trước chưa xong
  running = true;
  try {
    const count = await expireUnpaidOrders();
    if (count > 0) console.log(`⏰ Đã tự huỷ ${count} đơn VNPay quá hạn thanh toán`);
  } catch (err) {
    console.error('Lỗi job huỷ đơn quá hạn thanh toán:', err);
  } finally {
    running = false;
  }
}

/** Bắt đầu chạy định kỳ — trả hàm dừng (dùng khi tắt server) */
export function startExpireUnpaidOrdersJob(): () => void {
  const timer = setInterval(() => void tick(), env.ORDER_EXPIRE_JOB_INTERVAL_SECONDS * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
