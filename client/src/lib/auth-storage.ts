/**
 * Lưu cặp token đăng nhập ở trình duyệt.
 * - "Ghi nhớ đăng nhập" → localStorage   (giữ cả khi tắt trình duyệt, dùng chung mọi tab)
 * - Không ghi nhớ       → sessionStorage (mất khi đóng tab, mỗi tab riêng)
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const ACCESS_KEY = 'bookstore.accessToken';
const REFRESH_KEY = 'bookstore.refreshToken';

type StorageKind = 'local' | 'session';

function getStorage(kind: StorageKind): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    // Trình duyệt chặn storage (chế độ riêng tư, ...)
    return null;
  }
}

function read(kind: StorageKind): AuthTokens | null {
  const storage = getStorage(kind);
  try {
    const accessToken = storage?.getItem(ACCESS_KEY);
    const refreshToken = storage?.getItem(REFRESH_KEY);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  } catch {
    return null;
  }
}

function write(kind: StorageKind, tokens: AuthTokens) {
  const storage = getStorage(kind);
  try {
    storage?.setItem(ACCESS_KEY, tokens.accessToken);
    storage?.setItem(REFRESH_KEY, tokens.refreshToken);
  } catch {
    // bỏ qua: không lưu được thì người dùng sẽ phải đăng nhập lại
  }
}

function remove(kind: StorageKind) {
  const storage = getStorage(kind);
  try {
    storage?.removeItem(ACCESS_KEY);
    storage?.removeItem(REFRESH_KEY);
  } catch {
    // bỏ qua
  }
}

/** Token hiện tại (ưu tiên phiên của tab này) */
export function getTokens(): AuthTokens | null {
  return read('session') ?? read('local');
}

/** Lưu sau khi đăng nhập */
export function saveTokens(tokens: AuthTokens, remember: boolean) {
  clearTokens();
  write(remember ? 'local' : 'session', tokens);
}

/** Cập nhật sau khi refresh — giữ đúng nơi đang lưu */
export function updateTokens(tokens: AuthTokens) {
  write(read('session') ? 'session' : read('local') ? 'local' : 'session', tokens);
}

export function clearTokens() {
  remove('session');
  remove('local');
}
