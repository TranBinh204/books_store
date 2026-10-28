import type { PaginationMeta } from '../types/api.types';

export interface PageParams {
  page: number;
  limit: number;
}

export function offsetOf({ page, limit }: PageParams) {
  return (page - 1) * limit;
}

export function buildMeta(total: number, { page, limit }: PageParams): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
