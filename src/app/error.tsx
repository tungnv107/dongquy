'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="center-page">
      <h1>Chưa thể tải dữ liệu</h1>
      <p>Vui lòng kiểm tra kết nối và thử lại.</p>
      <button className="btn btn-primary" onClick={reset}>
        Tải lại trang
      </button>
    </main>
  );
}
