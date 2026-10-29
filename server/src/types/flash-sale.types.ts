// Flash Sale (M12)

/** Giá flash sale đang chạy của 1 sách — thẻ sách, chi tiết, khối trang chủ */
export interface BookFlashSale {
  salePrice: number;
  /** −% so với giá bìa */
  discountPercent: number;
  /** Tổng suất */
  quantity: number;
  /** Đã bán (đơn chưa huỷ) */
  sold: number;
  perUserLimit: number;
  endAt: Date;
}

