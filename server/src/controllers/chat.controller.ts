import type { Request, Response } from 'express';
import type { ChatHistoryQuery, SendChatMessageInput } from '../schemas/chat.schema';
import * as chatService from '../services/chat.service';
import { sendSuccess } from '../utils/response';

// /api/me/chat — chatbox tư vấn AI của khách hàng đang đăng nhập (M16)

export async function history(req: Request, res: Response) {
  const query = req.query as unknown as ChatHistoryQuery;
  return sendSuccess(res, await chatService.getHistory(req.user!.id, query));
}

export async function send(req: Request, res: Response) {
  const { message } = req.body as SendChatMessageInput;
  return sendSuccess(res, await chatService.sendMessage(req.user!.id, message));
}

export async function clear(req: Request, res: Response) {
  await chatService.clearHistory(req.user!.id);
  return res.status(204).end();
}
