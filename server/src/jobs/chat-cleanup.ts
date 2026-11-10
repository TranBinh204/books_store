import { purgeOldMessages } from '../services/chat.service';
import { startIntervalJob } from './interval-job';

// Job xoá tin chatbox cũ hơn CHAT_RETENTION_DAYS ngày (M16 mục 6.5)

const ONE_DAY = 24 * 60 * 60 * 1000;

export function startChatCleanupJob(): () => void {
  return startIntervalJob(
    'xoá tin chatbox cũ',
    async () => {
      const count = await purgeOldMessages();
      if (count > 0) console.log(`🧹 Đã xoá ${count} tin chatbox cũ`);
    },
    ONE_DAY,
    { runAtStart: true },
  );
}
