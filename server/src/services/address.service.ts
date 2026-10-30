import { withTransaction } from '../db/transaction';
import * as addressRepository from '../repositories/address.repository';
import { ADDRESS_LIMIT, type AddressInput } from '../schemas/address.schema';
import type { Address } from '../types/address.types';
import { AppError } from '../utils/AppError';

// Sổ địa chỉ (F09) — docs/03-modules/04-user-profile.md mục 3 (quy tắc 8, 10).
// Mọi thao tác ghi khoá theo người dùng → luôn ≤ ADDRESS_LIMIT địa chỉ và đúng 1 địa chỉ mặc định.

function notFound() {
  return AppError.notFound('Không tìm thấy địa chỉ');
}

export function list(userId: number): Promise<Address[]> {
  return addressRepository.listByUser(userId);
}

async function getOwned(userId: number, id: number): Promise<Address> {
  const address = await addressRepository.findOwned(userId, id);
  if (!address) throw notFound();
  return address;
}

/** Địa chỉ đầu tiên luôn là mặc định; tích "mặc định" → bỏ mặc định cũ */
export async function create(userId: number, input: AddressInput): Promise<Address> {
  const { isDefault, ...fields } = input;
  const id = await withTransaction(async (client) => {
    await addressRepository.lockUser(userId, client);
    const count = await addressRepository.countByUser(userId, client);
    if (count >= ADDRESS_LIMIT) {
      throw new AppError(
        409,
        'ADDRESS_LIMIT',
        `Mỗi tài khoản lưu tối đa ${ADDRESS_LIMIT} địa chỉ — hãy xoá bớt địa chỉ không dùng`,
      );
    }
    const newId = await addressRepository.insert(userId, { ...fields, isDefault: false }, client);
    if (count === 0 || isDefault) await addressRepository.setDefault(userId, newId, client);
    return newId;
  });
  return getOwned(userId, id);
}

/**
 * Sửa địa chỉ. Tích "mặc định" → địa chỉ này thành mặc định.
 * Bỏ tích ở địa chỉ đang mặc định không có tác dụng (luôn cần 1 mặc định — chọn địa chỉ khác).
 */
export async function update(userId: number, id: number, input: AddressInput): Promise<Address> {
  const { isDefault, ...fields } = input;
  await withTransaction(async (client) => {
    await addressRepository.lockUser(userId, client);
    const current = await addressRepository.findOwned(userId, id, client, true);
    if (!current) throw notFound();
    await addressRepository.update(id, fields, client);
    if (isDefault && !current.isDefault) await addressRepository.setDefault(userId, id, client);
  });
  return getOwned(userId, id);
}

export async function setDefault(userId: number, id: number): Promise<Address> {
  await withTransaction(async (client) => {
    await addressRepository.lockUser(userId, client);
    const current = await addressRepository.findOwned(userId, id, client, true);
    if (!current) throw notFound();
    if (!current.isDefault) await addressRepository.setDefault(userId, id, client);
  });
  return getOwned(userId, id);
}

/** Xoá; xoá địa chỉ mặc định → địa chỉ mới nhất còn lại thành mặc định */
export async function remove(userId: number, id: number): Promise<void> {
  await withTransaction(async (client) => {
    await addressRepository.lockUser(userId, client);
    const current = await addressRepository.findOwned(userId, id, client, true);
    if (!current) throw notFound();
    await addressRepository.remove(id, client);
    if (current.isDefault) {
      const nextId = await addressRepository.findNewestId(userId, client);
      if (nextId !== null) await addressRepository.setDefault(userId, nextId, client);
    }
  });
}
