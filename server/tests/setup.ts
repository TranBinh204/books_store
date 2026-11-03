// Chạy trước mỗi file test: luôn dùng môi trường test → config/env.ts chọn DATABASE_URL_TEST
process.env.NODE_ENV = 'test';

// VNPay (M07): khoá cố định cho test — test tự ký IPN giả bằng khoá này, không gọi VNPay thật
process.env.VNPAY_TMN_CODE = 'TESTTMN1';
process.env.VNPAY_HASH_SECRET = 'TESTSECRETTESTSECRETTESTSECRET12';
process.env.VNPAY_IPN_FROM_RETURN = 'false';

// AI gợi ý sách (M15): bật AI với khoá giả — test luôn mock lib/ai/groq hoặc fetch, KHÔNG gọi Groq thật
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.GROQ_FALLBACK_MODEL = 'test-fallback-model';
