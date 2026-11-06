import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { db } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { createGroup, saveFund, addMember, updateMember, createPeriod } from '../src/lib/groups';
import { createTransaction, transition, allocateContribution } from '../src/lib/finance';
import { importStatement, reconcile } from '../src/lib/banking';
import { ensure } from '../src/lib/errors';

async function main() {
  ensure(
    process.env.NODE_ENV !== 'production',
    'FORBIDDEN',
    'Không được chạy seed trong production.',
  );
  const url = new URL(process.env.DATABASE_URL!);
  ensure(
    ['localhost', '127.0.0.1'].includes(url.hostname) &&
      ['/dongquy', '/dongquy_test'].includes(url.pathname),
    'FORBIDDEN',
    'Seed chỉ dành cho DB local dongquy hoặc dongquy_test.',
  );
  if (await db.group.findUnique({ where: { slug: 'cong-dong-song-xanh' } })) {
    console.log('Seed đã tồn tại; giữ nguyên dữ liệu.');
    try {
      console.log(await readFile('data/dev-accounts.json', 'utf8'));
    } catch {}
    return;
  }
  const password = process.env.SEED_PASSWORD || `DQ-${randomBytes(12).toString('base64url')}!`;
  const passwordHash = await hashPassword(password);
  const owner = await db.user.create({
    data: {
      email: 'owner@dongquy.local',
      name: 'Nguyễn Minh Anh',
      passwordHash,
      platformAdmin: true,
    },
  });
  const approver = await db.user.create({
    data: { email: 'approver@dongquy.local', name: 'Trần Thanh Hà', passwordHash },
  });
  const otherNames = [
    'Lê Hoàng Nam',
    'Phạm Thu Trang',
    'Đặng Tuấn Anh',
    'Võ Ngọc Linh',
    'Nguyễn Đức Huy',
    'Bùi Thanh Mai',
    'Trần Hải Đăng',
    'Lê Quỳnh Như',
    'Phạm Minh Đức',
    'Đỗ Thảo Nguyên',
  ];
  const group = await createGroup(owner.id, {
    name: 'Cộng đồng Sống Xanh',
    slug: 'cong-dong-song-xanh',
    description: 'Kết nối những người yêu thiên nhiên và cùng tạo ra những thay đổi tích cực.',
    representative: 'Nguyễn Minh Anh',
    foundedAt: '2026-05-01',
  });
  await db.group.update({ where: { id: group.id }, data: { isDemo: true } });
  await addMember(owner.id, group.id, {
    email: approver.email,
    roles: ['APPROVER', 'TREASURER'],
    code: 'TV002',
  });
  for (const [i, name] of otherNames.entries()) {
    const u = await db.user.create({
      data: { name, email: `member${i + 1}@dongquy.local`, passwordHash },
    });
    await addMember(owner.id, group.id, {
      email: u.email,
      roles: ['MEMBER'],
      code: `TV${String(i + 3).padStart(3, '0')}`,
    });
  }
  const members = await db.groupMember.findMany({
    where: { groupId: group.id },
    include: { user: true },
    orderBy: { code: 'asc' },
  });
  for (const [i, m] of members.entries())
    if (i % 4 !== 3)
      await updateMember(m.userId, group.id, m.id, {
        publicName: m.user.name,
        publicConsent: true,
      });
  const fund = await saveFund(owner.id, {
    groupId: group.id,
    name: 'Quỹ Sống Xanh',
    slug: 'quy-song-xanh',
    description:
      'Góp những điều nhỏ, nuôi dưỡng một tương lai xanh. Cùng theo dõi hành trình đóng góp và sử dụng quỹ của cộng đồng.',
    purpose: 'Cùng trồng thêm cây xanh, trao những phần quà ý nghĩa và lan tỏa lối sống bền vững.',
    type: 'CHARITY',
    visibility: 'PUBLIC',
    allowIndex: true,
    allowExport: true,
    showContributors: true,
    goalAmount: '100000000',
    publicManager: 'Ban điều phối Sống Xanh',
  });
  const categories = await db.category.findMany({ where: { fundId: fund.id } });
  const incomeCat = categories.find((c) => c.type === 'INCOME')!;
  const expenseCats = categories.filter((c) => c.type === 'EXPENSE');
  const incomes: {
    id: string;
    contributorId: string;
    amount: bigint;
    date: string;
    description: string;
  }[] = [];
  async function posted(input: Record<string, unknown>, tag: string) {
    const tx = await createTransaction(owner.id, input, `demo-${tag}`);
    await transition(owner.id, tx.id, 'submit');
    await transition(approver.id, tx.id, 'approve');
    return transition(owner.id, tx.id, 'post');
  }
  for (let month = 5; month <= 11; month++) {
    for (let n = 0; n < 4; n++) {
      const m = members[(month + n) % members.length];
      const amount = BigInt(1500000 + (month - 5) * 180000 + n * 120000);
      const day = n + 1;
      const date = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T09:00:00+07:00`;
      const description =
        n === 3
          ? `Tài trợ hoạt động tháng ${month}`
          : `Đóng góp quỹ tháng ${month} · ${m.publicConsent ? m.user.name : 'Thành viên ẩn danh'}`;
      const tx = await posted(
        {
          fundId: fund.id,
          type: 'INCOME',
          amount: amount.toString(),
          description,
          publicDescription: description,
          isPublic: true,
          categoryId: incomeCat.id,
          contributorId: m.id,
          occurredAt: date,
        },
        `${month}-income-${n}`,
      );
      if (month === 11) incomes.push({ id: tx.id, contributorId: m.id, amount, date, description });
    }
    for (let n = 0; n < 3; n++) {
      const description = [
        `Mua cây giống cho hoạt động tháng ${month}`,
        `Chuẩn bị quà tặng cộng đồng tháng ${month}`,
        `Vật dụng và hậu cần tháng ${month}`,
      ][n];
      await posted(
        {
          fundId: fund.id,
          type: 'EXPENSE',
          amount: String(700000 + (month - 5) * 90000 + n * 270000),
          description,
          publicDescription: description,
          isPublic: true,
          categoryId: expenseCats[n].id,
          occurredAt: `2026-${String(month).padStart(2, '0')}-${month === 11 ? '05' : String(16 + n)}T14:00:00+07:00`,
        },
        `${month}-expense-${n}`,
      );
    }
  }
  const reserve = await saveFund(owner.id, {
    groupId: group.id,
    name: 'Quỹ dự phòng Sống Xanh',
    slug: 'du-phong-song-xanh',
    description: 'Quỹ dự phòng nội bộ cho các hoạt động sắp tới.',
    visibility: 'PRIVATE',
    type: 'RESERVE',
  });
  await posted(
    {
      fundId: fund.id,
      targetFundId: reserve.id,
      type: 'TRANSFER',
      amount: '2000000',
      description: 'Chuyển quỹ dự phòng',
      publicDescription: 'Chuyển sang quỹ dự phòng của cộng đồng',
      isPublic: true,
      occurredAt: '2026-11-05T15:00:00+07:00',
    },
    'reserve-transfer',
  );
  for (let i = 0; i < 2; i++) {
    const tx = await createTransaction(
      owner.id,
      {
        fundId: fund.id,
        type: 'EXPENSE',
        amount: String(250000 + i * 300000),
        description: ['Mua bổ sung dụng cụ trồng cây', 'Hỗ trợ vận chuyển cho hoạt động cuối tuần'][
          i
        ],
        publicDescription: 'Chi hoạt động cộng đồng',
        isPublic: true,
        categoryId: expenseCats[0].id,
        occurredAt: '2026-11-06T08:00:00+07:00',
      },
      `demo-pending-${i}`,
    );
    await transition(owner.id, tx.id, 'submit');
  }
  const period = await createPeriod(owner.id, {
    fundId: fund.id,
    name: 'Góp xanh · Tháng 11/2026',
    startAt: '2026-11-01',
    dueAt: '2026-11-30',
    standardAmount: '500000',
    memberIds: members.map((m) => m.id),
  });
  for (const tx of incomes) {
    const due = await db.memberDue.findUniqueOrThrow({
      where: { periodId_memberId: { periodId: period.id, memberId: tx.contributorId } },
    });
    await allocateContribution(owner.id, { transactionId: tx.id, dueId: due.id, amount: '500000' });
  }
  const statement = await importStatement(owner.id, {
    fundId: fund.id,
    filename: 'sao-ke-minh-hoa.csv',
    rows: incomes.map((tx, i) => ({
      reference: `DEMO-BANK-${i}`,
      description: tx.description,
      amount: tx.amount.toString(),
      occurredAt: tx.date,
    })),
  });
  void statement;
  const bank = await db.bankTransaction.findFirstOrThrow({
    where: { fundId: fund.id, reference: 'DEMO-BANK-0' },
  });
  await reconcile(owner.id, {
    bankTransactionId: bank.id,
    transactionId: incomes[0].id,
    note: 'Đối soát dữ liệu minh họa.',
  });
  await db.announcement.createMany({
    data: [
      {
        fundId: fund.id,
        title: 'Những mầm xanh từ sự chung tay',
        content:
          'Cộng đồng cùng chuẩn bị cây giống và dụng cụ cho hoạt động trồng cây. Các khoản thu chi liên quan được cập nhật trong lịch sử giao dịch.\n\nĐây là nội dung minh họa được tạo bằng seed riêng cho môi trường phát triển.',
        isPublic: true,
        actorId: owner.id,
      },
      {
        fundId: fund.id,
        title: 'Kế hoạch đóng góp tháng 11',
        content:
          'Kỳ đóng quỹ tháng 11 đã được mở. Thành viên có thể theo dõi nghĩa vụ và lịch sử đóng góp trong tài khoản của mình. Mọi khoản tiền chỉ được ghi nhận sau khi kiểm tra và phê duyệt.',
        isPublic: true,
        actorId: owner.id,
      },
    ],
  });
  const second = await saveFund(owner.id, {
    groupId: group.id,
    name: 'Kết nối cuối tuần',
    slug: 'ket-noi-cuoi-tuan',
    description: 'Một không gian gắn kết qua những buổi gặp gỡ, thể thao và hoạt động cuối tuần.',
    purpose: 'Thêm những buổi gặp gỡ, thêm những kỷ niệm chung.',
    type: 'EVENT',
    visibility: 'PUBLIC',
    showContributors: true,
    allowExport: true,
    goalAmount: '30000000',
  });
  const third = await saveFund(owner.id, {
    groupId: group.id,
    name: 'Tiếp bước đến trường',
    slug: 'tiep-buoc-den-truong',
    description: 'Cùng trao sách vở và cơ hội học tập cho những hành trình còn nhiều khó khăn.',
    purpose: 'Góp sách vở, góp cơ hội, cùng viết tiếp những ước mơ.',
    type: 'ANNUAL',
    visibility: 'PUBLIC',
    allowExport: true,
    goalAmount: '50000000',
  });
  for (const [i, f] of [second, third].entries()) {
    await posted(
      {
        fundId: f.id,
        type: 'INCOME',
        amount: String(12000000 + i * 6000000),
        description: 'Đóng góp khởi động chương trình (minh họa)',
        publicDescription: 'Đóng góp khởi động chương trình',
        isPublic: true,
        occurredAt: '2026-10-01',
      },
      `extra-${i}-income`,
    );
    await posted(
      {
        fundId: f.id,
        type: 'EXPENSE',
        amount: String(2400000 + i * 900000),
        description: 'Chuẩn bị hoạt động (minh họa)',
        publicDescription: 'Chuẩn bị hoạt động chung',
        isPublic: true,
        occurredAt: '2026-10-15',
      },
      `extra-${i}-expense`,
    );
  }
  await mkdir('data', { recursive: true });
  const accounts = {
    environment: 'development only',
    password,
    owner: 'owner@dongquy.local',
    approver: 'approver@dongquy.local',
    member: 'member1@dongquy.local',
  };
  await writeFile('data/dev-accounts.json', JSON.stringify(accounts, null, 2));
  console.log('Seed hoàn tất. Tài khoản minh họa (không dùng production):');
  console.log(JSON.stringify(accounts, null, 2));
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
