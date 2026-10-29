import { env } from '../config/env';
import { pool, type Queryable } from '../db/pool';
import { withTransaction } from '../db/transaction';
import { signAccessToken } from '../lib/jwt';
import * as refreshTokenRepository from '../repositories/refresh-token.repository';
import * as userRepository from '../repositories/user.repository';
import { toPublicUser, type PublicUser, type User } from '../types/user.types';
import { AppError } from '../utils/AppError';
import { generateToken, hashToken } from '../utils/token';
import { parseUserAgent, type DeviceInfo } from '../utils/user-agent';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SessionMeta {
  userAgent: string | null;
  ip: string | null;
}

export interface Session {
  user: PublicUser;
  tokens: AuthTokens;
}

function invalidRefreshError() {
  return new AppError(
    401,
    'INVALID_REFRESH_TOKEN',
    'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  );
}

/**
 * Tạo phiên mới: 1 access token (JWT) + 1 refresh token (lưu bản băm vào DB).
 * Mỗi lần đăng nhập là 1 phiên riêng → 1 tài khoản đăng nhập được trên nhiều thiết bị cùng lúc.
 */
export async function createSession(
  user: Pick<User, 'id' | 'role'>,
  meta: SessionMeta,
  db: Queryable = pool,
): Promise<AuthTokens & { refreshTokenId: number }> {
  const refreshToken = generateToken();
  const refreshTokenId = await refreshTokenRepository.create(
    {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      userAgent: meta.userAgent?.slice(0, 255) ?? null,
      ip: meta.ip,
    },
    db,
  );
  return { accessToken: signAccessToken(user.id, user.role), refreshToken, refreshTokenId };
}

type RotateOutcome =
  | { kind: 'ok'; session: Session }
  | { kind: 'reused'; userId: number }
  | { kind: 'error'; error: AppError };

/**
 * Xoay vòng refresh token: huỷ token cũ, cấp cặp token mới.
 * - Token vừa bị xoay vòng ≤ REFRESH_REUSE_GRACE_SECONDS (nhiều tab cùng refresh)
 *   → REFRESH_TOKEN_STALE, không huỷ phiên.
 * - Quá thời gian đó mà vẫn dùng lại token ĐÃ BỊ XOAY VÒNG → nghi bị đánh cắp → huỷ TOÀN BỘ phiên.
 * - Token bị huỷ do đăng xuất / đổi mật khẩu → chỉ báo INVALID_REFRESH_TOKEN.
 */
export async function rotateSession(refreshToken: string, meta: SessionMeta): Promise<Session> {
  const outcome = await withTransaction<RotateOutcome>(async (client) => {
    const current = await refreshTokenRepository.findByHash(hashToken(refreshToken), client, true);
    if (!current) return { kind: 'error', error: invalidRefreshError() };

    if (current.revokedAt) {
      // Huỷ do đăng xuất / đổi mật khẩu / khoá (không có token thay thế) → chỉ là hết phiên,
      // KHÔNG được coi là bị đánh cắp (tránh đăng xuất các thiết bị khác dùng chung tài khoản)
      if (!current.replacedById) return { kind: 'error', error: invalidRefreshError() };

      const revokedSecondsAgo = (Date.now() - current.revokedAt.getTime()) / 1000;
      if (revokedSecondsAgo <= env.REFRESH_REUSE_GRACE_SECONDS) {
        return {
          kind: 'error',
          error: new AppError(401, 'REFRESH_TOKEN_STALE', 'Phiên đăng nhập vừa được làm mới'),
        };
      }
      return { kind: 'reused', userId: current.userId };
    }

    if (current.expiresAt.getTime() <= Date.now()) {
      return { kind: 'error', error: invalidRefreshError() };
    }

    const user = await userRepository.findById(current.userId, client);
    if (!user) return { kind: 'error', error: invalidRefreshError() };
    if (!user.isActive) {
      await refreshTokenRepository.revokeAllByUser(user.id, client);
      return {
        kind: 'error',
        error: new AppError(
          403,
          'ACCOUNT_LOCKED',
          'Tài khoản đã bị khoá, vui lòng liên hệ cửa hàng',
        ),
      };
    }

    const { refreshTokenId, ...tokens } = await createSession(user, meta, client);
    await refreshTokenRepository.revoke(current.id, refreshTokenId, client);
    return { kind: 'ok', session: { user: toPublicUser(user), tokens } };
  });

  if (outcome.kind === 'ok') return outcome.session;

  if (outcome.kind === 'reused') {
    // Ngoài transaction ở trên → việc huỷ không bị rollback khi ném lỗi
    await refreshTokenRepository.revokeAllByUser(outcome.userId);
    throw new AppError(
      401,
      'REFRESH_TOKEN_REUSED',
      'Phát hiện phiên đăng nhập bất thường, vui lòng đăng nhập lại',
    );
  }

  throw outcome.error;
}

/** Đăng xuất phiên hiện tại */
export async function revokeSession(refreshToken: string): Promise<void> {
  await refreshTokenRepository.revokeByHash(hashToken(refreshToken));
}

/** Đăng xuất mọi thiết bị */
export async function revokeAllSessions(userId: number, db: Queryable = pool): Promise<void> {
  await refreshTokenRepository.revokeAllByUser(userId, db);
}

// ---------- Thiết bị đang đăng nhập (M04) ----------

export interface ActiveSession extends DeviceInfo {
  id: number;
  ip: string | null;
  /** Lần cấp phiên gần nhất (đăng nhập / làm mới) ≈ hoạt động gần nhất */
  lastActiveAt: Date;
  /** Phiên của chính thiết bị đang gọi API */
  isCurrent: boolean;
}

/** id phiên của refresh token client đang giữ (token sai / của người khác / đã huỷ → null) */
export async function findCurrentSessionId(
  userId: number,
  refreshToken: string | undefined,
  db: Queryable = pool,
): Promise<number | null> {
  if (!refreshToken) return null;
  const token = await refreshTokenRepository.findByHash(hashToken(refreshToken), db);
  return token && token.userId === userId && !token.revokedAt ? token.id : null;
}

export async function listSessions(
  userId: number,
  currentRefreshToken: string | undefined,
): Promise<ActiveSession[]> {
  const [rows, currentId] = await Promise.all([
    refreshTokenRepository.listActiveByUser(userId),
    findCurrentSessionId(userId, currentRefreshToken),
  ]);
  return rows
    .map((row) => ({
      id: row.id,
      // IPv4 dạng "::ffff:1.2.3.4" (IPv4-mapped IPv6) → "1.2.3.4"
      ip: row.ip?.replace(/^::ffff:/, '') ?? null,
      lastActiveAt: row.createdAt,
      isCurrent: row.id === currentId,
      ...parseUserAgent(row.userAgent),
    }))
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent)); // thiết bị này lên đầu
}

/** Đăng xuất 1 thiết bị của chính mình */
export async function revokeSessionById(userId: number, id: number): Promise<void> {
  if (!(await refreshTokenRepository.revokeOwned(userId, id))) {
    throw AppError.notFound('Không tìm thấy phiên đăng nhập');
  }
}

/** Đăng xuất mọi thiết bị khác, giữ phiên hiện tại. Trả về số thiết bị đã đăng xuất */
export async function revokeOtherSessions(
  userId: number,
  currentRefreshToken: string | undefined,
): Promise<number> {
  const currentId = await findCurrentSessionId(userId, currentRefreshToken);
  return refreshTokenRepository.revokeAllExcept(userId, currentId);
}
