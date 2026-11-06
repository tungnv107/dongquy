import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { prepareTestDatabase } from './test-database';

async function main() {
  await prepareTestDatabase();
  const { db } = await import('../src/lib/db');
  const {
    createGroup,
    saveFund,
    addMember,
    updateMember,
    createPeriod,
    setPeriodClosed,
    adjustDue,
    inviteMember,
    acceptInvitation,
  } = await import('../src/lib/groups');
  const {
    createTransaction,
    transition,
    reverseTransaction,
    allocateContribution,
    balance,
    updateDraft,
  } = await import('../src/lib/finance');
  const { membership, fundAccess, visibleFund } = await import('../src/lib/policy');
  const {
    statistics,
    transactionList,
    publicContributors,
    publicTransaction,
    memberDues,
    publicFundDTO,
  } = await import('../src/lib/queries');
  const { importStatement, reconcile, receiveWebhook, previewStatement } =
    await import('../src/lib/banking');
  const { uploadAttachment, downloadAttachment, publishAttachment } =
    await import('../src/lib/files');
  const { hashPassword, verifyPassword, createSession, userFromToken, checkOrigin } =
    await import('../src/lib/auth');
  const { exportReport } = await import('../src/lib/reports');
  const { runMaintenance } = await import('../src/lib/maintenance');
  const results: { name: string; passed: boolean; error?: string }[] = [];
  async function test(name: string, run: () => Promise<void>) {
    try {
      await run();
      results.push({ name, passed: true });
      console.log('PASS', name);
    } catch (error) {
      results.push({ name, passed: false, error: (error as Error).message });
      console.error('FAIL', name, (error as Error).message);
    }
  }
  const key = () => randomUUID();
  const prefix = 'it-' + Date.now();
  const date = '2026-11-02T12:00:00+07:00';
  const owner = await db.user.create({
    data: { name: 'Test Owner', email: prefix + '-owner@example.test' },
  });
  const approver = await db.user.create({
    data: { name: 'Test Approver', email: prefix + '-approver@example.test' },
  });
  const outsider = await db.user.create({
    data: { name: 'Outside', email: prefix + '-outside@example.test' },
  });
  const platform = await db.user.create({
    data: { name: 'Platform', email: prefix + '-admin@example.test', platformAdmin: true },
  });
  const memberUser = await db.user.create({
    data: { name: 'Private Real Name', email: prefix + '-member@example.test' },
  });
  const group = await createGroup(owner.id, { name: 'Integration group', slug: prefix });
  await addMember(owner.id, group.id, {
    email: approver.email,
    roles: ['APPROVER', 'TREASURER'],
    code: 'A002',
  });
  const member = await addMember(owner.id, group.id, {
    email: memberUser.email,
    roles: ['MEMBER'],
    code: 'M003',
  });
  const fund = await saveFund(owner.id, {
    groupId: group.id,
    name: 'Integration fund',
    slug: prefix + '-fund',
    visibility: 'PUBLIC',
    showContributors: true,
    allowExport: true,
  });
  const reserve = await saveFund(owner.id, {
    groupId: group.id,
    name: 'Private fund',
    slug: prefix + '-private',
  });
  const base = {
    fundId: fund.id,
    type: 'INCOME',
    amount: '5000000',
    description: 'INTERNAL SECRET phone 0901234567',
    publicDescription: 'Đóng góp công khai',
    isPublic: true,
    contributorId: member.id,
    occurredAt: date,
  };
  const idempotency = key();
  const income = await createTransaction(owner.id, base, idempotency);
  async function posted(input: Record<string, unknown>) {
    const tx = await createTransaction(owner.id, input, key());
    await transition(owner.id, tx.id, 'submit');
    await transition(approver.id, tx.id, 'approve');
    await transition(owner.id, tx.id, 'post');
    return tx;
  }
  await test('Password scrypt and hashed/revocable sessions', async () => {
    const encoded = await hashPassword('correct-password-123');
    assert(await verifyPassword('correct-password-123', encoded));
    assert(!(await verifyPassword('wrong', encoded)));
    const session = await createSession(owner.id);
    assert.equal((await userFromToken(session.token))?.id, owner.id);
    const stored = await db.session.findFirstOrThrow({ where: { userId: owner.id } });
    assert.notEqual(stored.tokenHash, session.token);
    await db.session.deleteMany({ where: { userId: owner.id } });
    assert.equal(await userFromToken(session.token), null);
  });
  await test('Group / fund / member creation and group boundaries', async () => {
    assert.equal((await membership(owner.id, group.id)).roles[0], 'OWNER');
    await assert.rejects(() => fundAccess(outsider.id, fund.id));
    await assert.rejects(() => fundAccess(platform.id, fund.id));
    await assert.rejects(() => createTransaction(memberUser.id, base, key()));
    await assert.rejects(() =>
      updateMember(memberUser.id, group.id, member.id, { roles: ['OWNER'] }),
    );
    await assert.rejects(() =>
      updateMember(owner.id, group.id, (db as unknown as { id: string }).id ?? 'none', {
        roles: ['OWNER'],
      }),
    );
  });
  await test('Owner cannot remove the last owner', async () => {
    const own = await membership(owner.id, group.id);
    await assert.rejects(() => updateMember(owner.id, group.id, own.id, { roles: ['MEMBER'] }));
    await assert.rejects(() =>
      updateMember(owner.id, group.id, member.id, {
        roles: ['MEMBER'],
        publicConsent: true,
        publicName: 'Private Real Name',
      }),
    );
  });
  await test('Invitation binds email and is single-use', async () => {
    const invitation = await inviteMember(owner.id, group.id, {
      email: outsider.email,
      roles: ['MEMBER'],
    });
    const token = new URL(invitation.link).searchParams.get('token')!;
    await assert.rejects(() => acceptInvitation(platform.id, token));
    await acceptInvitation(outsider.id, token);
    await assert.rejects(() => acceptInvitation(outsider.id, token));
  });
  await test('Draft/pending/approved never affect balance; dual control enforced', async () => {
    assert.equal(await balance(db, fund.id), 0n);
    await transition(owner.id, income.id, 'submit');
    await assert.rejects(() => transition(owner.id, income.id, 'approve'));
    assert.equal(await balance(db, fund.id), 0n);
    await transition(approver.id, income.id, 'approve');
    assert.equal(await balance(db, fund.id), 0n);
  });
  await test('Financial create idempotency and conflicting payload', async () => {
    assert.equal((await createTransaction(owner.id, base, idempotency)).id, income.id);
    await assert.rejects(() => createTransaction(owner.id, { ...base, amount: '1' }, idempotency));
  });
  await test('Posting changes balance once', async () => {
    await transition(owner.id, income.id, 'post');
    await transition(owner.id, income.id, 'post');
    assert.equal(await balance(db, fund.id), 5000000n);
    assert.equal(await db.ledgerEntry.count({ where: { transactionId: income.id } }), 2);
  });
  await test('Posted transaction and ledger are immutable at DB and service', async () => {
    await assert.rejects(() =>
      updateDraft(owner.id, income.id, {
        description: 'tamper',
        publicDescription: 'tamper',
        isPublic: true,
      }),
    );
    await assert.rejects(() =>
      db.transaction.update({ where: { id: income.id }, data: { amount: 1n } }),
    );
    await assert.rejects(() => db.transaction.delete({ where: { id: income.id } }));
    await assert.rejects(() =>
      db.ledgerEntry.updateMany({ where: { transactionId: income.id }, data: { amount: 1n } }),
    );
    await assert.rejects(() =>
      db.ledgerEntry.create({
        data: { transactionId: income.id, fundId: fund.id, account: 'CASH', amount: 1n },
      }),
    );
  });
  await test('Public DTO never leaks internal description, identity or bank fields', async () => {
    const result = await transactionList(fund.id, new URL('http://test'), true);
    const encoded = JSON.stringify(result, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
    assert(!encoded.includes('INTERNAL'));
    assert(!encoded.includes(memberUser.email));
    assert(!encoded.includes('0901234567'));
    assert(!encoded.includes('createdById'));
    assert(!encoded.includes('bankReference'));
    assert(!encoded.includes(memberUser.name));
    const detail = await publicTransaction(fund.slug, income.id);
    assert.equal(detail.description, 'Đóng góp công khai');
    const dto = publicFundDTO(await visibleFund(fund.slug));
    assert.equal(dto.bank, null);
    assert(!('bankAccount' in dto));
    const contributors = await publicContributors(fund.id);
    assert.equal(contributors[0].name, 'Người đóng góp ẩn danh');
  });
  await test('Private fund and unpublished transaction are hidden', async () => {
    await assert.rejects(() => visibleFund(reserve.slug));
    const secret = await posted({
      ...base,
      amount: '10',
      description: 'Secret',
      isPublic: false,
      publicDescription: '',
      contributorId: undefined,
    });
    await assert.rejects(() => publicTransaction(fund.slug, secret.id));
  });
  const expense = await posted({
    fundId: fund.id,
    type: 'EXPENSE',
    amount: '1000000',
    description: 'Expense',
    publicDescription: 'Hoạt động',
    isPublic: true,
    occurredAt: date,
  });
  await test('Transfer is atomic and is not group income', async () => {
    const before = (await balance(db, fund.id)) + (await balance(db, reserve.id));
    await posted({
      fundId: fund.id,
      targetFundId: reserve.id,
      type: 'TRANSFER',
      amount: '1000000',
      description: 'Reserve transfer',
      occurredAt: date,
    });
    assert.equal(await balance(db, reserve.id), 1000000n);
    assert.equal((await balance(db, fund.id)) + (await balance(db, reserve.id)), before);
    const stats = await statistics(fund.id);
    assert.equal(stats.income, 5000010n);
    assert.equal(stats.expense, 1000000n);
    assert.equal(stats.transfers, -1000000n);
  });
  await test('Concurrent spending cannot overdraw a fund', async () => {
    const txs = [];
    for (let i = 0; i < 2; i++) {
      const tx = await createTransaction(
        owner.id,
        {
          fundId: fund.id,
          type: 'EXPENSE',
          amount: '2000000',
          description: `Concurrent ${i}`,
          occurredAt: date,
        },
        key(),
      );
      await transition(owner.id, tx.id, 'submit');
      await transition(approver.id, tx.id, 'approve');
      txs.push(tx);
    }
    const attempts = await Promise.allSettled(txs.map((t) => transition(owner.id, t.id, 'post')));
    assert.equal(attempts.filter((r) => r.status === 'fulfilled').length, 1);
    assert.equal(await balance(db, fund.id), 1000010n);
  });
  await test('Concurrent posting same transaction creates only one journal', async () => {
    const tx = await createTransaction(owner.id, { ...base, amount: '2000000' }, key());
    await transition(owner.id, tx.id, 'submit');
    await transition(approver.id, tx.id, 'approve');
    const attempts = await Promise.allSettled([
      transition(owner.id, tx.id, 'post'),
      transition(owner.id, tx.id, 'post'),
    ]);
    assert(attempts.some((r) => r.status === 'fulfilled'));
    assert.equal(await db.ledgerEntry.count({ where: { transactionId: tx.id } }), 2);
  });
  await test('Expense reversal refunds cash and reduces expenses in reporting', async () => {
    const before = await balance(db, fund.id);
    const originalStats = await statistics(fund.id);
    const rev = await reverseTransaction(owner.id, expense.id, 'Thu hồi khoản chi sai', key());
    await transition(owner.id, rev.id, 'submit');
    await transition(approver.id, rev.id, 'approve');
    await transition(owner.id, rev.id, 'post');
    assert.equal(await balance(db, fund.id), before + 1000000n);
    const stats = await statistics(fund.id);
    assert.equal(stats.expense, originalStats.expense - 1000000n);
    await assert.rejects(() =>
      reverseTransaction(owner.id, expense.id, 'duplicate reversal', key()),
    );
  });
  let periodId = '';
  let dueId = '';
  await test('Periods, partial allocation and exemptions use actual posted income', async () => {
    const period = await createPeriod(owner.id, {
      fundId: fund.id,
      name: 'Test period',
      startAt: '2026-11-01',
      dueAt: '2026-11-30',
      standardAmount: '1000000',
      memberIds: [member.id],
    });
    periodId = period.id;
    const due = await db.memberDue.findFirstOrThrow({ where: { periodId: period.id } });
    dueId = due.id;
    await allocateContribution(owner.id, {
      transactionId: income.id,
      dueId: due.id,
      amount: '300000',
    });
    await adjustDue(owner.id, period.id, { dueId: due.id, amount: '-100000', reason: 'Miễn giảm' });
    const result = await memberDues(memberUser.id, fund.id);
    assert.equal(result[0].dues[0].summary.remaining, 600000n);
    await assert.rejects(() =>
      allocateContribution(owner.id, { transactionId: expense.id, dueId: due.id, amount: '1' }),
    );
    await assert.rejects(() =>
      adjustDue(owner.id, period.id, { dueId: due.id, amount: '-9999999', reason: 'Invalid' }),
    );
  });
  await test('Period locking, reminders and completion notifications are authorized and idempotent', async () => {
    const now = new Date();
    const p = await createPeriod(owner.id, {
      fundId: fund.id,
      name: 'Reminder verification',
      startAt: new Date(now.getTime() - 86400000),
      dueAt: now,
      standardAmount: '100000',
      memberIds: [member.id],
    });
    const due = await db.memberDue.findFirstOrThrow({ where: { periodId: p.id } });
    await runMaintenance(now);
    const notifications = () =>
      db.notification.count({ where: { userId: memberUser.id, id: { startsWith: 'reminder-' } } });
    const once = await notifications();
    assert(once > 0);
    await runMaintenance(now);
    assert.equal(await notifications(), once);
    await assert.rejects(() => setPeriodClosed(memberUser.id, p.id, { closed: true }));
    await setPeriodClosed(owner.id, p.id, { closed: true });
    await assert.rejects(() =>
      allocateContribution(owner.id, { transactionId: income.id, dueId: due.id, amount: '100000' }),
    );
    await assert.rejects(() =>
      adjustDue(owner.id, p.id, { dueId: due.id, amount: '-1', reason: 'Locked' }),
    );
    await setPeriodClosed(owner.id, p.id, { closed: false });
    await allocateContribution(owner.id, {
      transactionId: income.id,
      dueId: due.id,
      amount: '100000',
    });
    assert.equal(await db.notification.count({ where: { id: 'due-completed-' + due.id } }), 1);
    const before = await balance(db, fund.id);
    const pendingPost = await createTransaction(owner.id, { ...base, amount: '100' }, key());
    await transition(owner.id, pendingPost.id, 'submit');
    await transition(approver.id, pendingPost.id, 'approve');
    await saveFund(owner.id, { active: false }, fund.id);
    await assert.rejects(() => createTransaction(owner.id, { ...base, amount: '100' }, key()));
    await assert.rejects(() => transition(owner.id, pendingPost.id, 'post'));
    assert.equal(await balance(db, fund.id), before);
    await saveFund(owner.id, { active: true }, fund.id);
  });
  await test('CSV preview, bank dedup and reconciliation amount guard', async () => {
    const csv = new File(
      ['date,description,amount,reference\n2026-11-02,Test bank,5000000,BANK-1'],
      'statement.csv',
    );
    const preview = await previewStatement(csv);
    assert.equal(preview.rows.length, 1);
    const data = {
      fundId: fund.id,
      filename: 'test.csv',
      rows: [
        { reference: 'BANK-1', description: 'Test bank', amount: '5000000', occurredAt: date },
      ],
    };
    assert.equal((await importStatement(owner.id, data)).inserted, 1);
    assert.equal((await importStatement(owner.id, data)).duplicates, 1);
    const bank = await db.bankTransaction.findFirstOrThrow({
      where: { fundId: fund.id, reference: 'BANK-1' },
    });
    await assert.rejects(() =>
      reconcile(owner.id, { bankTransactionId: bank.id, transactionId: expense.id }),
    );
    await reconcile(owner.id, { bankTransactionId: bank.id, transactionId: income.id });
    await assert.rejects(() =>
      reconcile(owner.id, { bankTransactionId: bank.id, transactionId: income.id }),
    );
  });
  await test('Unsigned, old and replayed bank webhook; no automatic posting', async () => {
    process.env.BANK_WEBHOOK_SECRET = 'integration-test-secret-at-least-32-chars';
    const raw = JSON.stringify({
      eventId: prefix,
      fundId: fund.id,
      transaction: {
        reference: 'WEB-1',
        description: 'Webhook event',
        amount: '900000',
        occurredAt: date,
      },
    });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', process.env.BANK_WEBHOOK_SECRET)
      .update(`${timestamp}.${raw}`)
      .digest('hex');
    const before = await balance(db, fund.id);
    await assert.rejects(() => receiveWebhook(raw, timestamp, '00'.repeat(32)));
    await assert.rejects(() => receiveWebhook(raw, '1', signature));
    assert.equal((await receiveWebhook(raw, timestamp, signature)).duplicate, false);
    assert.equal((await receiveWebhook(raw, timestamp, signature)).duplicate, true);
    assert.equal(await balance(db, fund.id), before);
  });
  await test('Internal file URLs cannot be guessed; public review and visibility enforced', async () => {
    const form = new FormData();
    form.append(
      'file',
      new File([Buffer.from('%PDF-1.4\n% harmless test receipt')], 'receipt.pdf', {
        type: 'application/pdf',
      }),
    );
    form.append('fundId', fund.id);
    form.append('transactionId', income.id);
    const uploaded = await uploadAttachment(owner.id, form);
    await assert.rejects(() => downloadAttachment(uploaded.id));
    await assert.rejects(() => publishAttachment(owner.id, uploaded.id, true, false));
    await publishAttachment(owner.id, uploaded.id, true, true);
    assert.equal((await downloadAttachment(uploaded.id)).status, 200);
    await saveFund(owner.id, { visibility: 'PRIVATE' }, fund.id);
    await assert.rejects(() => downloadAttachment(uploaded.id));
    await saveFund(owner.id, { visibility: 'PUBLIC' }, fund.id);
    const bad = new FormData();
    bad.append(
      'file',
      new File(['<script>evil</script>'], 'invoice.pdf', { type: 'application/pdf' }),
    );
    bad.append('fundId', fund.id);
    await assert.rejects(() => uploadAttachment(owner.id, bad));
  });
  await test('Opening balances require a document', async () => {
    const tx = await createTransaction(
      owner.id,
      { fundId: fund.id, type: 'OPENING', amount: '100', description: 'Opening', occurredAt: date },
      key(),
    );
    await assert.rejects(() => transition(owner.id, tx.id, 'submit'));
  });
  await test('Approval limits, rejection and CSRF', async () => {
    const approverMember = await membership(approver.id, group.id);
    await updateMember(owner.id, group.id, approverMember.id, { approvalLimit: '100' });
    const tx = await createTransaction(owner.id, { ...base, amount: '500' }, key());
    await transition(owner.id, tx.id, 'submit');
    await assert.rejects(() => transition(approver.id, tx.id, 'approve'));
    await updateMember(owner.id, group.id, approverMember.id, { approvalLimit: null });
    await transition(approver.id, tx.id, 'reject', 'Thiếu chứng cứ');
    assert.equal(
      (await db.transaction.findUniqueOrThrow({ where: { id: tx.id } })).status,
      'REJECTED',
    );
    await assert.rejects(() => transition(owner.id, tx.id, 'post'));
    assert.throws(() =>
      checkOrigin(
        new Request('http://localhost:3000/api/funds', {
          method: 'POST',
          headers: { Origin: 'https://evil.example' },
        }),
      ),
    );
  });
  await test('Public exports contain only allowed data; PDF and XLSX generated', async () => {
    for (const format of ['csv', 'xlsx', 'pdf']) {
      const response = await exportReport(new URL(`http://test?format=${format}`), {
        slug: fund.slug,
      });
      assert(response instanceof Response);
      const content = Buffer.from(await response.arrayBuffer());
      assert(content.length > 100);
      if (format === 'csv') {
        assert(!content.toString().includes('INTERNAL SECRET'));
        assert(!content.toString().includes(memberUser.email));
      }
      if (format === 'pdf') assert.equal(content.subarray(0, 5).toString(), '%PDF-');
      if (format === 'xlsx') assert.equal(content.subarray(0, 2).toString(), 'PK');
    }
  });
  await test('Audit logs and approval evidence are immutable', async () => {
    const log = await db.auditLog.findFirstOrThrow({ where: { groupId: group.id } });
    await assert.rejects(() =>
      db.auditLog.update({ where: { id: log.id }, data: { action: 'TAMPER' } }),
    );
    await assert.rejects(() => db.auditLog.delete({ where: { id: log.id } }));
    const approval = await db.approval.findFirstOrThrow({ where: { transactionId: income.id } });
    await assert.rejects(() => db.approval.delete({ where: { id: approval.id } }));
  });
  await test('All posted journals balance and summary matches actual ledger', async () => {
    const entries = await db.ledgerEntry.findMany({ where: { fund: { groupId: group.id } } });
    const totals = new Map<string, bigint>();
    for (const e of entries)
      totals.set(e.transactionId, (totals.get(e.transactionId) ?? 0n) + e.amount);
    assert([...totals.values()].every((v) => v === 0n));
    const stats = await statistics(fund.id);
    assert.equal(stats.closing, await balance(db, fund.id));
    assert.equal(
      stats.closing,
      stats.opening + stats.income - stats.expense + stats.transfers + stats.openingAdded,
    );
  });
  await test('Manager cannot disable dual control on creation or update', async () => {
    const managed = await createGroup(owner.id, {
      name: 'Security group',
      slug: prefix + '-security',
    });
    await addMember(owner.id, managed.id, { email: memberUser.email, roles: ['MANAGER'] });
    await assert.rejects(() =>
      saveFund(memberUser.id, {
        groupId: managed.id,
        name: 'Bypass',
        slug: prefix + '-bypass',
        dualControl: false,
      }),
    );
    const safeFund = await saveFund(memberUser.id, {
      groupId: managed.id,
      name: 'Safe fund',
      slug: prefix + '-safe',
    });
    assert.equal(safeFund.dualControl, true);
    await assert.rejects(() => saveFund(memberUser.id, { dualControl: false }, safeFund.id));
    assert.equal(
      (await saveFund(owner.id, { dualControl: false }, safeFund.id)).dualControl,
      false,
    );
    const invitation = await inviteMember(owner.id, managed.id, {
      email: outsider.email,
      roles: ['MEMBER'],
    });
    await db.group.update({ where: { id: managed.id }, data: { active: false } });
    await assert.rejects(() =>
      acceptInvitation(outsider.id, new URL(invitation.link).searchParams.get('token')!),
    );
  });
  await test('Private source transfers do not leak via a public receiving fund', async () => {
    const transfer = await posted({
      fundId: reserve.id,
      targetFundId: fund.id,
      type: 'TRANSFER',
      amount: '1',
      description: 'Private source transfer',
      publicDescription: 'PRIVATE SOURCE SHOULD STAY HIDDEN',
      isPublic: true,
      occurredAt: date,
    });
    const publicRows = await transactionList(fund.id, new URL('http://test?pageSize=100'), true);
    assert(!publicRows.items.some((row) => row.id === transfer.id));
    await assert.rejects(() => publicTransaction(fund.slug, transfer.id));
    const report = await exportReport(new URL('http://test?format=csv'), { slug: fund.slug });
    assert(report instanceof Response);
    assert(!(await report.text()).includes('PRIVATE SOURCE SHOULD STAY HIDDEN'));
    const privateRows = await transactionList(fund.id, new URL('http://test?pageSize=100'));
    assert(privateRows.items.some((row) => row.id === transfer.id));
  });
  void periodId;
  void dueId;
  await mkdir('data/qa', { recursive: true });
  await writeFile(
    'data/qa/integration.json',
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        passed: results.filter((r) => r.passed).length,
        total: results.length,
        results,
      },
      null,
      2,
    ),
  );
  await db.$disconnect();
  if (results.some((r) => !r.passed)) process.exitCode = 1;
  console.log(`Integration: ${results.filter((r) => r.passed).length}/${results.length} passed`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
