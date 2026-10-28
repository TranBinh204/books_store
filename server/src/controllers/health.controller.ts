import type { Request, Response } from 'express';
import * as healthService from '../services/health.service';
import { sendSuccess } from '../utils/response';

export async function getHealth(_req: Request, res: Response) {
  const health = await healthService.getHealth();
  return sendSuccess(res, health, health.status === 'ok' ? 200 : 503);
}
