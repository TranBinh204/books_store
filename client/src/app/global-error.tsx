'use client';

// Lỗi ở khung gốc: file này thay thế cả layout nên tự có <html>, và KHÔNG nhận CSS toàn cục / font —
// dùng style nội tuyến tối giản (docs/06-ui-ux/shop/24-trang-loi.md)
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0e1311',
          color: '#efe8dc',
          fontFamily: 'Georgia, "Times New Roman", serif',
          textAlign: 'center',
        }}
      >
        <main style={{ maxWidth: 480, padding: 24 }}>
          <p style={{ margin: 0, fontSize: 64, color: '#e0766a' }} aria-hidden="true">
            ✦
          </p>
          <p style={{ margin: '8px 0 0', fontStyle: 'italic', color: '#b5946a' }}>
            Phép thuật trục trặc
          </p>
          <h1 style={{ margin: '8px 0', fontSize: 32, color: '#e2c48f' }}>
            Cửa hàng đang tạm nghỉ
          </h1>
          <p style={{ margin: 0, color: '#c9c1b3' }}>Hệ thống gặp sự cố, vui lòng tải lại trang.</p>
          {error.digest && (
            <p style={{ margin: '12px 0 0', fontSize: 13, color: '#7f877f' }}>
              Mã lỗi: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 24,
              padding: '12px 28px',
              border: '1px solid #e2c48f',
              borderRadius: 4,
              background: '#b5946a',
              color: '#0e1311',
              fontSize: 17,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Tải lại trang
          </button>
        </main>
      </body>
    </html>
  );
}
