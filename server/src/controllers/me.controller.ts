import type { Request, Response } from 'express';
import type { ChangePasswordInput, UpdateProfileInput } from '../schemas/profile.schema';
import * as profileService from '../services/profile.service';
import * as sessionService from '../services/session.service';
import { sendSuccess } from '../utils/response';

// /api/me — tài khoản của người đang đăng nhập (M04)

const REFRESH_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

/**
 * Refresh token client đang giữ (header `X-Refresh-Token`) → nhận ra "thiết bị này".
 * Không đặt trên URL để không lọt vào log. Sai định dạng → coi như không gửi.
 */
function currentRefreshToken(req: Request): string | undefined {
  const value = req.get('x-refresh-token');
  return value && REFRESH_TOKEN_PATTERN.test(value) ? value : undefined;
}

const idOf = (req: Request) => (req.params as unknown as { id: number }).id;

export async function getProfile(req: Request, res: Response) {
  return sendSuccess(res, await profileService.getProfile(req.user!.id));
}

export async function updateProfile(req: Request, res: Response) {
  const profile = await profileService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
  return sendSuccess(res, profile);
}

/** Trả cặp token mới cho thiết bị đang dùng — các thiết bị khác bị đăng xuất */
export async function changePassword(req: Request, res: Response) {
  const result = await profileService.changePassword(
    req.user!.id,
    req.body as ChangePasswordInput,
    {
      userAgent: req.get('user-agent') ?? null,
      ip: req.ip ?? null,
    },
  );
  return sendSuccess(res, result);
}

export async function listSessions(req: Request, res: Response) {
  const sessions = await sessionService.listSessions(req.user!.id, currentRefreshToken(req));
  return sendSuccess(res, sessions);
}

export async function revokeSession(req: Request, res: Response) {
  await sessionService.revokeSessionById(req.user!.id, idOf(req));
  return res.status(204).end();
}

export async function revokeOtherSessions(req: Request, res: Response) {
  const revoked = await sessionService.revokeOtherSessions(req.user!.id, currentRefreshToken(req));
  return sendSuccess(res, { revoked });
}

export async function getOverview(req: Request, res: Response) {
  return sendSuccess(res, await profileService.getOverview(req.user!.id));
}
