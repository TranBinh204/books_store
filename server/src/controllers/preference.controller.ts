import type { Request, Response } from 'express';
import type { SavePreferencesInput } from '../schemas/preference.schema';
import * as preferenceService from '../services/preference.service';
import { sendSuccess } from '../utils/response';

// /api/me/preferences — sở thích đọc sách của khách hàng đang đăng nhập (M15)

export async function get(req: Request, res: Response) {
  return sendSuccess(res, await preferenceService.getPreferences(req.user!.id));
}

export async function save(req: Request, res: Response) {
  const input = req.body as SavePreferencesInput;
  return sendSuccess(res, await preferenceService.savePreferences(req.user!.id, input));
}

export async function skip(req: Request, res: Response) {
  return sendSuccess(res, await preferenceService.skipOnboarding(req.user!.id));
}
