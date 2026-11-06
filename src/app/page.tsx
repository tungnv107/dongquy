import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  Heart,
  Globe,
  Check,
  Users,
  BookOpenCheck,
  ScanLine,
  LockKeyhole,
} from 'lucide-react';
import { db } from '@/lib/db';
import { statistics } from '@/lib/queries';
import { serialize } from '@/lib/client';
import { PublicHeader, PublicFooter } from '@/components/public-header';
import { FundCard } from '@/components/fund-browser';
import { Badge } from '@/components/ui';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const funds = await db.fund.findMany({
    where: { visibility: 'PUBLIC', active: true, group: { active: true } },
    include: { group: { select: { name: true, isDemo: true } } },
    take: 3,
    orderBy: { createdAt: 'asc' },
  });
  const cards = await Promise.all(
    funds.map(async (f) => ({
      id: f.id,
      name: f.name,
      slug: f.slug,
      description: f.description,
      type: f.type,
      goalAmount: f.goalAmount,
      group: f.group,
      stats: f.showSummary ? await statistics(f.id) : null,
    })),
  );
  return (
    <>
      <PublicHeader />
      <main id="main">
        <section className="home-hero">
          <div className="public-container hero-grid">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="live-dot" /> MINH BẠCH TẠO NÊN NIỀM TIN
              </span>
              <h1>
                Cùng góp quỹ.
                <br />
                Cùng làm nên
                <br />
                <span>điều ý nghĩa.</span>
              </h1>
              <p>
                Một nơi để quản lý quỹ nhóm, theo dõi từng đóng góp và công khai mọi khoản thu chi.
                Để sự tin tưởng luôn là điều tự nhiên.
              </p>
              <div className="hero-buttons">
                <Link href="/funds" className="btn btn-primary btn-large">
                  Khám phá các quỹ <ArrowUpRight size={19} />
                </Link>
                <Link href="/register" className="btn btn-text">
                  Tạo quỹ của bạn <ArrowRight size={18} />
                </Link>
              </div>
              <div className="hero-trust">
                <span>
                  <Check size={15} /> Xem quỹ không cần đăng nhập
                </span>
                <span>
                  <Check size={15} /> Minh bạch từng giao dịch
                </span>
              </div>
            </div>
            <div
              className="hero-illustration"
              aria-label="Đóng góp, quản lý và minh bạch cùng cộng đồng"
            >
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="hero-orb orb-heart">
                <Heart size={30} />
              </div>
              <div className="hero-orb orb-users">
                <Users size={28} />
              </div>
              <div className="hero-orb orb-leaf">
                <Globe size={28} />
              </div>
              <div className="hero-ledger">
                <div className="ledger-top">
                  <span className="mini-brand">
                    <BookOpenCheck size={24} />
                  </span>
                  <span>QUỸ CHUNG CỦA CHÚNG TA</span>
                  <ShieldCheck size={21} />
                </div>
                <h2>
                  Mỗi khoản nhỏ.
                  <br />
                  Một giá trị lớn.
                </h2>
                <div className="ledger-rule" />
                {[
                  {
                    icon: Heart,
                    title: 'Đóng góp có ý nghĩa',
                    sub: 'Mỗi thành viên, một phần sức mạnh',
                  },
                  {
                    icon: BookOpenCheck,
                    title: 'Thu chi rõ ràng',
                    sub: 'Mọi giao dịch đều có dấu vết',
                  },
                  { icon: Globe, title: 'Minh bạch cùng nhau', sub: 'Công khai để cùng tin tưởng' },
                ].map(({ icon: Icon, title, sub }) => (
                  <div className="ledger-feature" key={title}>
                    <span>
                      <Icon size={20} />
                    </span>
                    <div>
                      <b>{title}</b>
                      <small>{sub}</small>
                    </div>
                    <Check size={16} />
                  </div>
                ))}
              </div>
              <div className="hero-note">
                <ShieldCheck size={20} />
                <div>
                  <b>Niềm tin, được ghi nhận.</b>
                  <span>Từ những điều nhỏ nhất</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="value-strip">
          <div className="public-container">
            <span>
              <Users /> Dành cho mọi cộng đồng
            </span>
            <span>
              <BookOpenCheck /> Thu chi có kiểm chứng
            </span>
            <span>
              <LockKeyhole /> Quyền riêng tư được tôn trọng
            </span>
            <span>
              <Globe /> Công khai, dễ tiếp cận
            </span>
          </div>
        </section>
        <section className="public-container home-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CỘNG ĐỒNG ĐANG GÓP SỨC</span>
              <h2>Những quỹ chung, những mục tiêu đẹp.</h2>
              <p>Khám phá hành trình đóng góp và cách mỗi quỹ tạo nên sự khác biệt.</p>
            </div>
            <Link href="/funds" className="btn btn-secondary">
              Xem tất cả quỹ <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="fund-grid">
            {cards.map((f, i) => (
              <FundCard key={f.id} fund={serialize(f)} index={i} />
            ))}
          </div>
          {!cards.length && (
            <div className="empty">
              <h3>Câu chuyện đầu tiên bắt đầu từ bạn.</h3>
              <p>Chưa có quỹ được công khai. Tạo nhóm và khởi đầu một hành trình chung.</p>
              <Link href="/register" className="btn btn-primary">
                Bắt đầu ngay <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </section>
        <section className="how-section" id="how-it-works">
          <div className="public-container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ĐƠN GIẢN ĐỂ BẮT ĐẦU</span>
                <h2>Ít thủ tục hơn. Nhiều gắn kết hơn.</h2>
              </div>
              <Badge tone="green">Dành cho nhóm của bạn</Badge>
            </div>
            <div className="steps-grid">
              {[
                {
                  icon: Users,
                  title: 'Tạo một không gian chung',
                  text: 'Lập nhóm, tạo quỹ và mời thành viên. Mỗi người có vai trò rõ ràng.',
                },
                {
                  icon: BookOpenCheck,
                  title: 'Ghi nhận từng khoản thu chi',
                  text: 'Thêm chứng từ, gửi phê duyệt và ghi sổ. Số dư được tính từ giao dịch thực tế.',
                },
                {
                  icon: ScanLine,
                  title: 'Chia sẻ để cùng tin tưởng',
                  text: 'Một đường dẫn công khai để mọi người theo dõi. Bạn quyết định dữ liệu được chia sẻ.',
                },
              ].map(({ icon: Icon, title, text }, i) => (
                <article key={title}>
                  <span className="step-icon">
                    <Icon size={26} />
                  </span>
                  <small>0{i + 1}</small>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="public-container home-section" id="transparency">
          <div className="trust-banner">
            <div>
              <span className="eyebrow">CÙNG NHAU, RÕ RÀNG HƠN</span>
              <h2>
                Quản lý bằng sự minh bạch.
                <br />
                Gắn kết bằng niềm tin.
              </h2>
              <p>
                Từ quỹ lớp học, câu lạc bộ đến những hoạt động thiện nguyện.
                <br />
                Đồng Quỹ giúp bạn dành thời gian cho điều thực sự quan trọng.
              </p>
            </div>
            <Link href="/register" className="btn btn-light btn-large">
              Tạo quỹ của bạn <ArrowUpRight size={19} />
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
