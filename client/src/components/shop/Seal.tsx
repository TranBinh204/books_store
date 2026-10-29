/** Giảm từ mức này trở lên mới đóng tem -x% khi không có Flash Sale / không phải sách mới (demo 07) */
const SEAL_MIN_DISCOUNT = 20;

export interface SealInput {
  /** % giảm của Flash Sale đang chạy (null: không có) */
  flashPercent?: number | null;
  isNew?: boolean;
  discountPercent: number;
  outOfStock?: boolean;
}

/**
 * Chọn nội dung tem tròn trên bìa (components.md 2.3), theo thứ tự ưu tiên:
 * hết hàng → Flash Sale -x% → sách mới "Mới" → giảm ≥ 20% → không tem.
 */
export function pickSeal({ flashPercent, isNew, discountPercent, outOfStock }: SealInput) {
  if (outOfStock) return { label: 'Đã hết', tone: 'muted' as const };
  if (flashPercent) return { label: `-${flashPercent}%`, tone: 'sale' as const };
  if (isNew) return { label: 'Mới', tone: 'new' as const };
  if (discountPercent >= SEAL_MIN_DISCOUNT)
    return { label: `-${discountPercent}%`, tone: 'sale' as const };
  return null;
}

const TONE_CLASS = { sale: '', new: 'seal-new', muted: 'seal-muted' } as const;

/** Tem tròn xoay −12° góc trái bìa (class `.seal` trong styles/ui.css) */
export function Seal(props: SealInput) {
  const seal = pickSeal(props);
  if (!seal) return null;
  return <span className={`seal ${TONE_CLASS[seal.tone]}`}>{seal.label}</span>;
}
