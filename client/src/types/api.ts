// Khớp với format response của server — xem docs/02-design/api-conventions.md

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}
