import { withTransaction } from '../db/transaction';
import * as addressRepository from '../repositories/address.repository';
import * as refreshTokenRepository from '../repositories/refresh-token.repository';
import * as userRepository from '../repositories/user.repository';
import type { CustomerListQuery } from '../schemas/customer.schema';
import type { CustomerDetail } from '../types/customer.types';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { escapeLike } from '../utils/sql';

// Admin quản lý khách hàng (F13) — docs/03-modules/08-admin-customer-order.md mục 3.2

function customerNotFound() {
  return AppError.notFound('Không tìm thấy khách hàng');
}

export async function listCustomers(query: CustomerListQuery) {
  const { items, total } = await userRepository.listCustomers(
    {
      keyword: query.q ? escapeLike(query.q) : undefined,
      status: query.status,
      sort: query.sort,
    },
    query,
  );
  return { items, meta: buildMeta(total, query) };
}

/** Hồ sơ + thống kê + sổ địa chỉ. Id của Admin → 404 (quy tắc 12) */
export async function getCustomer(id: number): Promise<CustomerDetail> {
  const customer = await userRepository.findCustomer(id);
  if (!customer) throw customerNotFound();
  return { ...customer, addresses: await addressRepository.listByUser(id) };
}

/**
 * Khoá tài khoản (quy tắc 13): lưu lý do + huỷ mọi phiên.
 * Access token đang dùng bị chặn ngay vì requireAuth đọc lại user trong DB mỗi request.
 */
export async function lockCustomer(id: number, reason: string): Promise<CustomerDetail> {
  await withTransaction(async (client) => {
    const customer = await userRepository.findCustomer(id, client, true);
    if (!customer) throw customerNotFound();
    if (!customer.isActive) {
      throw new AppError(400, 'ALREADY_LOCKED', 'Tài khoản này đang bị khoá');
    }
    await userRepository.setLocked(id, reason, client);
    await refreshTokenRepository.revokeAllByUser(id, client);
  });
  return getCustomer(id);
}

/** Mở khoá (quy tắc 14) */
export async function unlockCustomer(id: number): Promise<CustomerDetail> {
  await withTransaction(async (client) => {
    const customer = await userRepository.findCustomer(id, client, true);
    if (!customer) throw customerNotFound();
    if (customer.isActive) {
      throw new AppError(400, 'NOT_LOCKED', 'Tài khoản này đang hoạt động');
    }
    await userRepository.setLocked(id, null, client);
  });
  return getCustomer(id);
}
