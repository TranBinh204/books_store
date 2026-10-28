/**
 * "yyyy-mm-dd" (ngày theo giờ Việt Nam, UTC+7) → thời điểm 00:00 của ngày đó (UTC).
 * `addDays = 1` → 00:00 ngày hôm sau, dùng làm mốc "đến hết ngày" (so sánh `<`).
 */
export function startOfVietnamDay(date: string, addDays = 0): Date {
  const result = new Date(`${date}T00:00:00+07:00`);
  result.setUTCDate(result.getUTCDate() + addDays);
  return result;
}

/** Khoảng ngày [from, to] (cả 2 đầu) → mốc [gte, lt) để truy vấn */
export function vietnamDateRange(from?: string, to?: string) {
  return {
    from: from ? startOfVietnamDay(from) : undefined,
    to: to ? startOfVietnamDay(to, 1) : undefined,
  };
}
