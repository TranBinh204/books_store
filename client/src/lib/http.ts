import { unstable_rethrow } from 'next/navigation';
import type { ApiFailure, ApiSuccess, ErrorDetail, PaginationMeta } from '@/types/api';
import { clearTokens, getTokens, updateTokens, type AuthTokens } from './auth-storage';

/** Lỗi trả về từ server, giữ nguyên `code` để client xử lý logic */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Trình duyệt: gọi /api (Next.js rewrite sang server).
// Server Component: gọi thẳng server Express vì không có domain tương đối.
const BASE_URL =
  typeof window === 'undefined' ? (process.env.API_URL ?? 'http://localhost:8000') : '';

type HttpOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
};

function buildUrl(path: string, query?: HttpOptions['query']) {
  const url = `${BASE_URL}/api${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

// ---------- Gắn access token & tự làm mới phiên (refresh token) ----------

// Các API auth tự xử lý 401 của riêng nó → không tự refresh (tránh vòng lặp)
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshPromise: Promise<boolean> | null = null;

/**
 * Đổi refresh token (trong storage) lấy cặp token mới.
 * Nhiều request cùng gặp 401 chỉ refresh MỘT lần (dùng chung promise).
 */
function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async () => {
    const current = getTokens();
    if (!current) return false;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      const json = (await res.json().catch(() => null)) as
        ApiSuccess<{ tokens: AuthTokens }> | ApiFailure | null;

      if (res.ok && json?.success) {
        updateTokens(json.data.tokens);
        return true;
      }
      // Tab khác (dùng chung localStorage) vừa làm mới → nếu storage đã có token mới thì dùng tiếp
      if (json && !json.success && json.error.code === 'REFRESH_TOKEN_STALE') {
        return getTokens()?.refreshToken !== current.refreshToken;
      }
      clearTokens();
      return false;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

function canRefresh(path: string) {
  return isBrowser() && !NO_REFRESH_PATHS.some((p) => path.startsWith(p));
}

async function request<T>(
  path: string,
  options: HttpOptions = {},
  isRetry = false,
): Promise<{ data: T; meta?: PaginationMeta }> {
  const { body, query, headers, ...init } = options;
  const accessToken = isBrowser() ? getTokens()?.accessToken : undefined;
  // FormData (upload file): để trình duyệt tự đặt Content-Type kèm boundary
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      ...init,
      headers: {
        ...(body !== undefined && !isFormData && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch (error) {
    // Server Component: fetch `no-store` lúc build ném lỗi nội bộ của Next.js để báo "trang này
    // render động" — phải ném lại nguyên vẹn, không đổi thành NETWORK_ERROR
    unstable_rethrow(error);
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được tới máy chủ');
  }

  // Access token hết hạn → làm mới phiên rồi gửi lại request đúng MỘT lần
  if (res.status === 401 && !isRetry && canRefresh(path) && (await refreshSession())) {
    return request<T>(path, options, true);
  }

  if (res.status === 204) return { data: undefined as T };

  const json = (await res.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!res.ok || !json || !json.success) {
    const error = json && !json.success ? json.error : null;
    throw new ApiError(
      res.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại sau',
      error?.details,
    );
  }

  return { data: json.data, meta: json.meta as PaginationMeta | undefined };
}

/**
 * Tải file cần đăng nhập (vd báo cáo CSV) → Blob. Link `<a href>` thường không gửi được token
 * nên phải fetch kèm Authorization (cũng tự làm mới phiên khi 401).
 */
async function download(
  path: string,
  query?: HttpOptions['query'],
  isRetry = false,
): Promise<Blob> {
  const accessToken = getTokens()?.accessToken;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được tới máy chủ');
  }
  if (res.status === 401 && !isRetry && canRefresh(path) && (await refreshSession())) {
    return download(path, query, true);
  }
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as ApiFailure | null;
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'INTERNAL_ERROR',
      json?.error?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại sau',
      json?.error?.details,
    );
  }
  return res.blob();
}

export const http = {
  download,
  get: <T>(path: string, options?: HttpOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: HttpOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
