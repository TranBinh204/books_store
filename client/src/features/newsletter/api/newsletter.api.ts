import { http } from '@/lib/http';

/** Đăng ký nhận "thư cú" (POST /api/newsletter — A7). Email đã đăng ký vẫn thành công */
export async function subscribe(email: string) {
  return (await http.post<{ subscribed: boolean }>('/newsletter', { email })).data;
}
