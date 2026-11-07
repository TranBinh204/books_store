/**
 * Chạy `task` định kỳ trong tiến trình server: lượt trước chưa xong thì bỏ lượt này,
 * lỗi chỉ ghi log. `runAtStart`: chạy 1 lượt ngay khi khởi động. Trả hàm dừng (tắt server).
 */
export function startIntervalJob(
  name: string,
  task: () => Promise<void>,
  intervalMs: number,
  { runAtStart = false } = {},
): () => void {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await task();
    } catch (err) {
      console.error(`Lỗi job ${name}:`, err);
    } finally {
      running = false;
    }
  };
  if (runAtStart) void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
