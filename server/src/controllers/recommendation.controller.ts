import type { Request, Response } from 'express';
import * as recommendationService from '../services/recommendation.service';
import { sendSuccess } from '../utils/response';

// /api/me/recommendations — AI gợi ý sách cho khách hàng đang đăng nhập (M15)

export async function get(req: Request, res: Response) {
  return sendSuccess(res, await recommendationService.getRecommendations(req.user!.id));
}

export async function refresh(req: Request, res: Response) {
  return sendSuccess(res, await recommendationService.refreshRecommendations(req.user!.id));
}
