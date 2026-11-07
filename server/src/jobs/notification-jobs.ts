import { notifyUpcomingFlashSales, purgeOldNotifications } from '../services/notification.service';
import { startIntervalJob } from './interval-job';

// Job thông báo (M13): báo "Flash sale sắp diễn ra" (quy tắc 7) · xoá thông báo > 90 ngày (quy tắc 9).
// Nhiều server chạy cùng lúc vẫn an toàn: chương trình khoá SKIP LOCKED + khoá chống trùng.

const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

export function startNotificationJobs(): () => void {
  const stops = [
    startIntervalJob(
      'báo flash sale sắp diễn ra',
      async () => {
        const count = await notifyUpcomingFlashSales();
        if (count > 0) console.log(`🔔 Đã báo ${count} chương trình Flash Sale sắp diễn ra`);
      },
      FIVE_MINUTES,
      { runAtStart: true },
    ),
    startIntervalJob(
      'xoá thông báo cũ',
      async () => {
        const count = await purgeOldNotifications();
        if (count > 0) console.log(`🧹 Đã xoá ${count} thông báo cũ`);
      },
      ONE_DAY,
      { runAtStart: true },
    ),
  ];
  return () => stops.forEach((stop) => stop());
}
