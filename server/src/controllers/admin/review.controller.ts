import type { Request, Response } from 'express';
import type { AdminReviewQuery } from '../../schemas/review.schema';
import * as reviewService from '../../services/review.service';
import { sendSuccess } from '../../utils/response';

// /api/admin/reviews — Admin ẩn / hiện đánh giá (M10)

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function list(req: Request, res: Response) {
  const { items, meta } = await reviewService.listForAdmin(
    req.query as unknown as AdminReviewQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

export async function hide(req: Request, res: Response) {
  const { reason } = req.body as { reason: string };
  await reviewService.setHidden(req.user!.id, idOf(req), reason);
  return sendSuccess(res, { id: idOf(req), isHidden: true });
}

export async function unhide(req: Request, res: Response) {
  await reviewService.setHidden(req.user!.id, idOf(req), null);
  return sendSuccess(res, { id: idOf(req), isHidden: false });
}
