/** Escape ký tự đặc biệt của LIKE (% _ \\) để từ khoá người dùng gõ được tìm đúng nghĩa đen */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
