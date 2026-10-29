import type { Request, Response } from 'express';
import * as uploadService from '../../services/upload.service';
import { sendSuccess } from '../../utils/response';

export async function uploadImages(req: Request, res: Response) {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  return sendSuccess(res, await uploadService.uploadBookImages(files), 201);
}
