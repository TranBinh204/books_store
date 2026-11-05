import { pool, type Queryable } from '../db/pool';
import { withTransaction } from '../db/transaction';
import { money } from '../lib/email-templates/shared';
import * as voucherRepository from '../repositories/voucher.repository';
import type { VoucherRow } from '../repositories/voucher.repository';
import type { PageParams } from '../utils/pagination';
import {
  voucherRuleIssues,
  type AdminVoucherQuery,
  type CreateVoucherInput,
  type UpdateVoucherInput,
} from '../schemas/voucher.schema';
import type { AdminVoucher, Voucher, VoucherCheckResult } from '../types/voucher.types';
import { AppError } from '../utils/AppError';
import { isUniqueViolation } from '../utils/dbError';
import { buildMeta } from '../utils/pagination';
import { escapeLike } from '../utils/sql';
import { getCart } from './cart.service';

// Mã giảm giá (F16) — docs/03-modules/11-voucher.md mục 3

/** Số thẻ voucher tối đa ở khối "Khuyến mãi dành cho bạn" trên trang chủ */
export const HOME_VOUCHER_LIMIT = 8;

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Tiền giảm trên tạm tính (quy tắc 3) — % làm tròn xuống tới đồng */
export function calcDiscount(
  voucher: Pick<Voucher, 'discountType' | 'discountValue' | 'maxDiscount'>,
  subtotal: number,
): number {
  if (voucher.discountType === 'FIXED') return Math.min(voucher.discountValue, subtotal);
  const discount = Math.floor((subtotal * voucher.discountValue) / 100);
  return Math.min(discount, voucher.maxDiscount ?? discount, subtotal);
}

const voucherError = (code: string, message: string) => new AppError(400, code, message);

/**
 * Kiểm tra điều kiện dùng mã theo thứ tự (quy tắc 4) — lỗi đầu tiên được trả về.
 * Trả số tiền giảm.
 */
async function assertUsable(
  voucher: Voucher | null,
  userId: number,
  subtotal: number,
  db: Queryable,
): Promise<number> {
  if (!voucher) throw voucherError('VOUCHER_NOT_FOUND', 'Mã giảm giá không tồn tại');
  if (!voucher.isActive) {
    throw voucherError('VOUCHER_INACTIVE', 'Mã giảm giá không còn hiệu lực');
  }
  const now = new Date();
  if (now < voucher.startAt) {
    throw voucherError(
      'VOUCHER_NOT_STARTED',
      `Mã giảm giá áp dụng từ ${dateTimeFormatter.format(voucher.startAt).replace(',', '')}`,
    );
  }
  if (now >= voucher.endAt) throw voucherError('VOUCHER_EXPIRED', 'Mã giảm giá đã hết hạn');
  if (voucher.usageLimit !== null && voucher.usedCount >= voucher.usageLimit) {
    throw voucherError('VOUCHER_USED_UP', 'Mã giảm giá đã hết lượt sử dụng');
  }
  if ((await voucherRepository.countUserUsages(voucher.id, userId, db)) >= voucher.perUserLimit) {
    throw voucherError('VOUCHER_USER_LIMIT', 'Bạn đã dùng hết lượt của mã giảm giá này');
  }
  if (subtotal < voucher.minOrderValue) {
    throw voucherError(
      'VOUCHER_MIN_ORDER',
      `Đơn hàng tối thiểu ${money(voucher.minOrderValue)} để dùng mã này (còn thiếu ${money(
        voucher.minOrderValue - subtotal,
      )})`,
    );
  }
  return calcDiscount(voucher, subtotal);
}

/** Trang chủ: mã công khai đang dùng được */
export function listPublic() {
  return voucherRepository.findPublic(HOME_VOUCHER_LIMIT);
}

/** Trang thanh toán: kiểm tra mã với giỏ hàng hiện tại trên server (chưa giữ lượt) */
export async function check(userId: number, code: string): Promise<VoucherCheckResult> {
  const cart = await getCart(userId);
  if (cart.subtotal === 0) throw new AppError(400, 'CART_EMPTY', 'Giỏ hàng đang trống');

  const voucher = await voucherRepository.findByCode(code);
  const discountAmount = await assertUsable(voucher, userId, cart.subtotal, pool);
  const v = voucher!;
  return {
    code: v.code,
    description: v.description,
    discountType: v.discountType,
    discountValue: v.discountValue,
    maxDiscount: v.maxDiscount,
    minOrderValue: v.minOrderValue,
    subtotal: cart.subtotal,
    discountAmount,
    total: cart.subtotal - discountAmount,
  };
}

/**
 * Trong transaction tạo đơn: khoá dòng voucher & kiểm tra lại điều kiện (quy tắc 7).
 * Gọi `useForOrder` sau khi đã có id đơn.
 */
export async function lockForOrder(
  code: string,
  userId: number,
  subtotal: number,
  client: Queryable,
): Promise<{ voucherId: number; discountAmount: number }> {
  const voucher = await voucherRepository.findByCode(code, client, true);
  const discountAmount = await assertUsable(voucher, userId, subtotal, client);
  return { voucherId: voucher!.id, discountAmount };
}

export const useForOrder = voucherRepository.useForOrder;

/** Huỷ đơn → trả lượt (quy tắc 8) — trong transaction huỷ đơn */
export const releaseForOrder = voucherRepository.releaseForOrder;

// ---------- Admin ----------

function voucherNotFound() {
  return AppError.notFound('Không tìm thấy voucher');
}

function duplicateCode() {
  return new AppError(409, 'CONFLICT', 'Mã voucher đã tồn tại', [
    { field: 'code', message: 'Mã voucher đã tồn tại' },
  ]);
}

/** Trường bị khoá khi voucher đã có đơn dùng (quy tắc 10) */
const LOCKED_WHEN_USED = [
  'code',
  'discountType',
  'discountValue',
  'maxDiscount',
  'minOrderValue',
  'startAt',
  'perUserLimit',
] as const;

const LOCKED_LABELS: Record<(typeof LOCKED_WHEN_USED)[number], string> = {
  code: 'mã',
  discountType: 'loại giảm',
  discountValue: 'mức giảm',
  maxDiscount: 'giảm tối đa',
  minOrderValue: 'đơn tối thiểu',
  startAt: 'thời gian bắt đầu',
  perUserLimit: 'lượt / người',
};

const sameValue = (a: unknown, b: unknown) =>
  a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;

/** Giảm số tiền thì không có "giảm tối đa" */
function normalize(row: VoucherRow): VoucherRow {
  return row.discountType === 'FIXED' ? { ...row, maxDiscount: null } : row;
}

export async function listForAdmin(query: AdminVoucherQuery) {
  const { items, total } = await voucherRepository.listForAdmin(
    {
      keyword: query.q ? escapeLike(query.q) : undefined,
      status: query.status,
      isPublic: query.visibility === undefined ? undefined : query.visibility === 'public',
    },
    query,
  );
  return { items, meta: buildMeta(total, query) };
}

export async function getForAdmin(id: number): Promise<AdminVoucher> {
  const voucher = await voucherRepository.findForAdmin(id);
  if (!voucher) throw voucherNotFound();
  return voucher;
}

export async function create(input: CreateVoucherInput): Promise<AdminVoucher> {
  try {
    const id = await voucherRepository.insert(normalize(input));
    return await getForAdmin(id);
  } catch (err) {
    if (isUniqueViolation(err, 'vouchers_code_key')) throw duplicateCode();
    throw err;
  }
}

export async function update(id: number, input: UpdateVoucherInput): Promise<AdminVoucher> {
  try {
    await withTransaction(async (client) => {
      if (!(await voucherRepository.lockById(id, client))) throw voucherNotFound();
      const current = (await voucherRepository.findForAdmin(id, client))!;
      const next = normalize({
        code: input.code ?? current.code,
        description: input.description === undefined ? current.description : input.description,
        discountType: input.discountType ?? current.discountType,
        discountValue: input.discountValue ?? current.discountValue,
        maxDiscount: input.maxDiscount === undefined ? current.maxDiscount : input.maxDiscount,
        minOrderValue: input.minOrderValue ?? current.minOrderValue,
        startAt: input.startAt ?? current.startAt,
        endAt: input.endAt ?? current.endAt,
        usageLimit: input.usageLimit === undefined ? current.usageLimit : input.usageLimit,
        perUserLimit: input.perUserLimit ?? current.perUserLimit,
        isPublic: input.isPublic ?? current.isPublic,
        isActive: input.isActive ?? current.isActive,
      });

      if (current.orderCount > 0) {
        const changed = LOCKED_WHEN_USED.filter((key) => !sameValue(next[key], current[key]));
        if (changed.length > 0) {
          throw new AppError(
            409,
            'VOUCHER_IN_USE',
            `Voucher đã được dùng — không sửa được ${changed.map((key) => LOCKED_LABELS[key]).join(', ')}`,
          );
        }
      }

      const issues = voucherRuleIssues(next);
      if (next.usageLimit !== null && next.usageLimit < current.usedCount) {
        issues.push({
          field: 'usageLimit',
          message: `Tổng lượt không được nhỏ hơn số lượt đã dùng (${current.usedCount})`,
        });
      }
      if (issues.length > 0) {
        throw new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', issues);
      }

      await voucherRepository.update(id, next, client);
    });
  } catch (err) {
    if (isUniqueViolation(err, 'vouchers_code_key')) throw duplicateCode();
    throw err;
  }
  return getForAdmin(id);
}

/** Xoá cứng khi chưa có đơn dùng (quy tắc 11) */
export async function remove(id: number): Promise<void> {
  await withTransaction(async (client) => {
    if (!(await voucherRepository.lockById(id, client))) throw voucherNotFound();
    if ((await voucherRepository.countOrders(id, client)) > 0) {
      throw new AppError(
        409,
        'VOUCHER_IN_USE',
        'Voucher đã được dùng trong đơn hàng — chỉ có thể tắt',
      );
    }
    await voucherRepository.remove(id, client);
  });
}

export async function listOrders(id: number, page: PageParams) {
  await getForAdmin(id);
  const { items, total } = await voucherRepository.listOrders(id, page);
  return { items, meta: buildMeta(total, page) };
}
