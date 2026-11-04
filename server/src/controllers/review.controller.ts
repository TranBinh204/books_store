import type { Request, Response } from 'express';
import type {
  CreateReviewInput,
  PublicReviewQuery,
  UpdateReviewInput,
} from '../schemas/review.schema';
import * as reviewService from '../services/review.service';
import { sendSuccess } from '../utils/response';

// Đánh giá sách (M10) — công khai & khách hàng

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

// ---------- Công khai: /api/books/:id/reviews ----------

export async function summary(req: Request, res: Response) {
  return sendSuccess(res, await reviewService.getSummary(idOf(req)));
}

export async function listPublic(req: Request, res: Response) {
  const { items, meta } = await reviewService.listPublic(
    idOf(req),
    req.query as unknown as PublicReviewQuery,
  );
  return sendSuccess(res, items, 200, meta);
}

// ---------- Khách hàng: /api/me/... ----------

export async function statusForBook(req: Request, res: Response) {
  const { bookId } = req.params as unknown as { bookId: number };
  return sendSuccess(res, await reviewService.getStatusForBook(req.user!.id, bookId));
}

export async function listMineByOrder(req: Request, res: Response) {
  return sendSuccess(res, await reviewService.listMineByOrder(req.user!.id, idOf(req)));
}

export async function create(req: Request, res: Response) {
  return sendSuccess(
    res,
    await reviewService.createReview(req.user!.id, req.body as CreateReviewInput),
    201,
  );
}

export async function update(req: Request, res: Response) {
  return sendSuccess(
    res,
    await reviewService.updateReview(req.user!.id, idOf(req), req.body as UpdateReviewInput),
  );
}
