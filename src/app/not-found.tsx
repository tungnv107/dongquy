import Link from 'next/link';
import { ShieldQuestion, ArrowLeft } from 'lucide-react';
export default function NotFound() {
  return (
    <main id="main" className="center-page">
      <ShieldQuestion size={56} />
      <h1>Không tìm thấy trang</h1>
      <p>Liên kết có thể đã thay đổi hoặc quỹ chưa được công khai.</p>
      <Link href="/funds" className="btn btn-primary">
        <ArrowLeft size={17} /> Khám phá quỹ công khai
      </Link>
    </main>
  );
}
