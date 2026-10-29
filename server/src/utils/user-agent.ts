export type DeviceType = 'DESKTOP' | 'MOBILE' | 'TABLET';

export interface DeviceInfo {
  /** null = không nhận ra */
  browser: string | null;
  os: string | null;
  deviceType: DeviceType;
}

// Thứ tự quan trọng: Edge / Opera / Cốc Cốc có chữ "Chrome", Chrome có chữ "Safari"
const BROWSERS: [RegExp, string][] = [
  [/edg(e|a|ios)?\//i, 'Edge'],
  [/opr\/|opera/i, 'Opera'],
  [/coc_coc_browser/i, 'Cốc Cốc'],
  [/samsungbrowser/i, 'Samsung Internet'],
  [/firefox|fxios/i, 'Firefox'],
  [/chrome|crios/i, 'Chrome'],
  [/safari/i, 'Safari'],
];

const OPERATING_SYSTEMS: [RegExp, string][] = [
  [/windows/i, 'Windows'],
  [/iphone|ipad|ipod/i, 'iOS'],
  [/android/i, 'Android'],
  [/mac os x|macintosh/i, 'macOS'],
  [/cros/i, 'ChromeOS'],
  [/linux/i, 'Linux'],
];

/** Rút gọn User-Agent để hiển thị "Chrome trên Windows" — không cần chính xác tuyệt đối */
export function parseUserAgent(userAgent: string | null): DeviceInfo {
  const ua = userAgent ?? '';
  const browser = BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const os = OPERATING_SYSTEMS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const deviceType: DeviceType = /ipad|tablet/i.test(ua)
    ? 'TABLET'
    : /mobi|iphone|android/i.test(ua)
      ? 'MOBILE'
      : 'DESKTOP';
  return { browser, os, deviceType };
}
