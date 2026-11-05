import { calcDiscount } from '../../../src/services/voucher.service';

// M11 quy tắc 3 — tính tiền giảm trên tạm tính

describe('calcDiscount', () => {
  it('giảm % làm tròn xuống tới đồng', () => {
    expect(
      calcDiscount({ discountType: 'PERCENT', discountValue: 10, maxDiscount: null }, 123459),
    ).toBe(12345);
  });

  it('giảm % không vượt giảm tối đa', () => {
    expect(
      calcDiscount({ discountType: 'PERCENT', discountValue: 20, maxDiscount: 30000 }, 500000),
    ).toBe(30000);
    expect(
      calcDiscount({ discountType: 'PERCENT', discountValue: 20, maxDiscount: 30000 }, 100000),
    ).toBe(20000);
  });

  it('giảm 100% = cả tạm tính', () => {
    expect(
      calcDiscount({ discountType: 'PERCENT', discountValue: 100, maxDiscount: null }, 80000),
    ).toBe(80000);
  });

  it('giảm số tiền không vượt tạm tính', () => {
    expect(
      calcDiscount({ discountType: 'FIXED', discountValue: 50000, maxDiscount: null }, 200000),
    ).toBe(50000);
    expect(
      calcDiscount({ discountType: 'FIXED', discountValue: 50000, maxDiscount: null }, 30000),
    ).toBe(30000);
  });
});
