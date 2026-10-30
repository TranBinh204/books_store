import { createHmac } from 'node:crypto';
import {
  buildPaymentUrl,
  formatVnpDate,
  isSuccess,
  parseAmount,
  responseMessage,
  sign,
  signData,
  verify,
} from '../../../src/lib/vnpay';

// M07 – lib/vnpay (docs/04-integrations/vnpay-sandbox.md mục 4)

const SECRET = 'SECRETSECRETSECRETSECRETSECRET12';

describe('signData / sign / verify', () => {
  it('sắp xếp theo tên, bỏ chữ ký & giá trị rỗng, mã hoá như mẫu VNPay (khoảng trắng → +)', () => {
    const data = signData({
      vnp_TxnRef: 'BS-2026-000001-1',
      vnp_Amount: '10000000',
      vnp_OrderInfo: 'Thanh toan don hang BS-2026-000001',
      vnp_ReturnUrl: 'http://localhost:3000/thanh-toan/ket-qua',
      vnp_BankCode: '',
      vnp_SecureHash: 'abc',
      vnp_SecureHashType: 'HmacSHA512',
      other: 'bo-qua',
    });
    expect(data).toBe(
      'vnp_Amount=10000000' +
        '&vnp_OrderInfo=Thanh+toan+don+hang+BS-2026-000001' +
        '&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A3000%2Fthanh-toan%2Fket-qua' +
        '&vnp_TxnRef=BS-2026-000001-1',
    );
  });

  it('chữ ký = HMAC-SHA512 hex của chuỗi ký; verify đúng, sai khi sửa 1 tham số, không phân biệt hoa thường', () => {
    const params = {
      vnp_Amount: '5000000',
      vnp_TxnRef: 'BS-2026-000002-1',
      vnp_ResponseCode: '00',
    };
    const hash = sign(params, SECRET);
    expect(hash).toBe(createHmac('sha512', SECRET).update(signData(params)).digest('hex'));

    expect(verify({ ...params, vnp_SecureHash: hash }, SECRET)).toBe(true);
    expect(verify({ ...params, vnp_SecureHash: hash.toUpperCase() }, SECRET)).toBe(true);
    expect(verify({ ...params, vnp_Amount: '1', vnp_SecureHash: hash }, SECRET)).toBe(false);
    expect(verify({ ...params, vnp_SecureHash: hash }, 'khoa-khac')).toBe(false);
    expect(verify(params, SECRET)).toBe(false);
  });
});

describe('buildPaymentUrl', () => {
  it('đủ tham số, số tiền × 100, ngày giờ VN, chữ ký kiểm tra lại được', () => {
    const url = new URL(
      buildPaymentUrl({
        gatewayUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        tmnCode: 'TMN1',
        secret: SECRET,
        returnUrl: 'http://localhost:3000/thanh-toan/ket-qua',
        txnRef: 'BS-2026-000001-1',
        amount: 206400,
        orderInfo: 'Thanh toan don hang BS-2026-000001',
        ipAddr: '::ffff:172.18.0.1',
        createdAt: new Date('2026-10-05T07:30:00Z'),
        expiresAt: new Date('2026-10-05T07:45:00Z'),
      }),
    );
    expect(url.origin + url.pathname).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    const params = Object.fromEntries(url.searchParams);
    expect(params).toMatchObject({
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: 'TMN1',
      vnp_Amount: '20640000',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: 'BS-2026-000001-1',
      vnp_OrderInfo: 'Thanh toan don hang BS-2026-000001',
      vnp_Locale: 'vn',
      vnp_IpAddr: '172.18.0.1',
      vnp_CreateDate: '20261005143000',
      vnp_ExpireDate: '20261005144500',
    });
    expect(verify(params, SECRET)).toBe(true);
  });
});

describe('tiện ích', () => {
  it('formatVnpDate: giờ VN, qua ngày khi UTC > 17h', () => {
    expect(formatVnpDate(new Date('2026-12-31T17:05:09Z'))).toBe('20270101000509');
  });

  it('parseAmount, isSuccess, responseMessage', () => {
    expect(parseAmount({ vnp_Amount: '20640000' })).toBe(206400);
    expect(parseAmount({ vnp_Amount: '12a' })).toBeNaN();
    expect(isSuccess({ vnp_ResponseCode: '00', vnp_TransactionStatus: '00' })).toBe(true);
    expect(isSuccess({ vnp_ResponseCode: '00', vnp_TransactionStatus: '02' })).toBe(false);
    expect(responseMessage('24')).toBe('Bạn đã huỷ giao dịch');
    expect(responseMessage('xx')).toContain('không thành công');
  });
});
