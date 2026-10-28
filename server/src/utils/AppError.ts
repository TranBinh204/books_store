export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * Lỗi nghiệp vụ có chủ đích — errorHandler chuyển thành response chuẩn.
 * Xem bảng mã lỗi ở docs/02-design/api-conventions.md
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new AppError(400, code, message);
  }

  static unauthorized(message = 'Bạn chưa đăng nhập', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }

  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }

  static notFound(message = 'Không tìm thấy dữ liệu', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(409, code, message);
  }
}
