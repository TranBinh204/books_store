import { http } from '@/lib/http';
import type { ChatHistory, SendChatResult } from '../types';

/** Lịch sử chat — `before`: id tin cũ nhất đang có (tải tin cũ hơn) */
export async function getHistory(before?: number) {
  return (await http.get<ChatHistory>('/me/chat', { query: { before } })).data;
}

export async function sendMessage(message: string) {
  return (await http.post<SendChatResult>('/me/chat', { message })).data;
}

export async function clearHistory() {
  await http.delete<void>('/me/chat');
}
