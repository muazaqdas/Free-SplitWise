import { calculateRawBalances, createBalancesService, simplifyDebts, type BalancesService } from '../balances.service';
import { createExpensesService, type ExpensesService } from '../expenses.service';
import { createExpensesRepository } from '../../repositories/expenses.repository';
import { createExpenseSplitsRepository, type ExpenseSplitsRepository } from '../../repositories/expenseSplits.repository';
import { createGroupsRepository, type GroupsRepository } from '../../repositories/groups.repository';
import { createSettlementsRepository, type SettlementsRepository } from '../../repositories/settlements.repository';
import { createActivityLogRepository } from '../../repositories/activityLog.repository';
import { createTestDatabase } from '../../repositories/testUtils/testDatabase';
import type { AppDatabase } from '../../db/types';

describe('calculateRawBalances (pure)', () => {
  it('a single-payer equal-split expense: the two non-payers each owe the payer their share', () => {
    // 90 split equally among a, b, c; a paid the full 90.
    const debts = calculateRawBalances([
      [
        { userId: 'a', paidAmount: 90, owedAmount: 30 },
        { userId: 'b', paidAmount: 0, owedAmount: 30 },
        { userId: 'c', paidAmount: 0, owedAmount: 30 },
      ],
    ]);

    expect(debts).toEqual(
      expect.arrayContaining([
        { fromUserId: 'b', toUserId: 'a', amount: 30 },
        { fromUserId: 'c', toUserId: 'a', amount: 30 },
      ])
    );
    expect(debts).toHaveLength(2);
  });

  it('nets opposite debts between the same pair across two expenses into one directional amount', () => {
    const debts = calculateRawBalances([
      // Expense 1: a paid 100, split equally a/b -> b owes a 50.
      [
        { userId: 'a', paidAmount: 100, owedAmount: 50 },
        { userId: 'b', paidAmount: 0, owedAmount: 50 },
      ],
      // Expense 2: b paid 20, split equally a/b -> a owes b 10.
      [
        { userId: 'a', paidAmount: 0, owedAmount: 10 },
        { userId: 'b', paidAmount: 20, owedAmount: 10 },
      ],
    ]);

    // Net: b owed a 50, a owed b 10 -> b owes a 40.
    expect(debts).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 40 }]);
  });

  it('produces no debt entry when a pair nets to exactly zero', () => {
    const debts = calculateRawBalances([
      [
        { userId: 'a', paidAmount: 50, owedAmount: 25 },
        { userId: 'b', paidAmount: 0, owedAmount: 25 },
      ],
      [
        { userId: 'a', paidAmount: 0, owedAmount: 25 },
        { userId: 'b', paidAmount: 50, owedAmount: 25 },
      ],
    ]);

    expect(debts).toEqual([]);
  });

  it('a self-paid participant (paid their own share) creates no self-debt', () => {
    // a paid for themself and b; a's owedAmount is covered by a's own payment.
    const debts = calculateRawBalances([
      [
        { userId: 'a', paidAmount: 60, owedAmount: 30 },
        { userId: 'b', paidAmount: 0, owedAmount: 30 },
      ],
    ]);
    expect(debts).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 30 }]);
  });

  it('attributes a multi-payer expense proportionally to each payer', () => {
    // Total 100, a paid 80 / b paid 20 (20% each); c owes 40, split
    // proportionally: 32 to a, 8 to b.
    const debts = calculateRawBalances([
      [
        { userId: 'a', paidAmount: 80, owedAmount: 30 },
        { userId: 'b', paidAmount: 20, owedAmount: 30 },
        { userId: 'c', paidAmount: 0, owedAmount: 40 },
      ],
    ]);

    expect(debts).toEqual(
      expect.arrayContaining([
        { fromUserId: 'c', toUserId: 'a', amount: 32 },
        { fromUserId: 'c', toUserId: 'b', amount: 8 },
      ])
    );
  });

  it('ignores an expense where nobody paid anything', () => {
    expect(calculateRawBalances([[{ userId: 'a', paidAmount: 0, owedAmount: 30 }]])).toEqual([]);
  });

  it('a settlement reduces the debt it pays down', () => {
    // b owes a 50 from an expense; b then pays a 30 toward it.
    const debts = calculateRawBalances(
      [
        [
          { userId: 'a', paidAmount: 100, owedAmount: 50 },
          { userId: 'b', paidAmount: 0, owedAmount: 50 },
        ],
      ],
      [{ fromUserId: 'b', toUserId: 'a', amount: 30 }]
    );
    expect(debts).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 20 }]);
  });

  it('a settlement that fully covers the debt zeroes the balance', () => {
    const debts = calculateRawBalances(
      [
        [
          { userId: 'a', paidAmount: 50, owedAmount: 25 },
          { userId: 'b', paidAmount: 0, owedAmount: 25 },
        ],
      ],
      [{ fromUserId: 'b', toUserId: 'a', amount: 25 }]
    );
    expect(debts).toEqual([]);
  });

  it('a settlement with no prior expense debt creates a standalone reverse debt (e.g. a pre-payment/gift)', () => {
    const debts = calculateRawBalances([], [{ fromUserId: 'a', toUserId: 'b', amount: 20 }]);
    // a paid b with nothing owed yet -> b now owes a 20.
    expect(debts).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 20 }]);
  });

  it('nets multiple settlements between the same pair', () => {
    const debts = calculateRawBalances(
      [
        [
          { userId: 'a', paidAmount: 100, owedAmount: 50 },
          { userId: 'b', paidAmount: 0, owedAmount: 50 },
        ],
      ],
      [
        { fromUserId: 'b', toUserId: 'a', amount: 20 },
        { fromUserId: 'b', toUserId: 'a', amount: 10 },
      ]
    );
    expect(debts).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 20 }]);
  });

  it('a settlement can flip the direction of a debt if it overpays', () => {
    const debts = calculateRawBalances(
      [
        [
          { userId: 'a', paidAmount: 50, owedAmount: 25 },
          { userId: 'b', paidAmount: 0, owedAmount: 25 },
        ],
      ],
      [{ fromUserId: 'b', toUserId: 'a', amount: 40 }]
    );
    expect(debts).toEqual([{ fromUserId: 'a', toUserId: 'b', amount: 15 }]);
  });
});

describe('simplifyDebts (pure) — Module 8 greedy simplification', () => {
  it('fully cancels a three-person cycle with no net balances (hand-computed: 0 transactions)', () => {
    // A owes B 10, B owes C 10, C owes A 10 -> everyone nets to zero.
    const settlements = simplifyDebts([
      { fromUserId: 'a', toUserId: 'b', amount: 10 },
      { fromUserId: 'b', toUserId: 'c', amount: 10 },
      { fromUserId: 'c', toUserId: 'a', amount: 10 },
    ]);
    expect(settlements).toEqual([]);
  });

  it('collapses a 3-person chain into 2 transactions (hand-computed)', () => {
    // A owes B 30, A owes C 10, B owes C 20.
    // Net: a = -40, b = +30-20 = +10, c = +10+20 = +30.
    // Largest debtor (a, 40) pays largest creditor (c, 30) first, then
    // remaining 10 to the last creditor (b).
    const settlements = simplifyDebts([
      { fromUserId: 'a', toUserId: 'b', amount: 30 },
      { fromUserId: 'a', toUserId: 'c', amount: 10 },
      { fromUserId: 'b', toUserId: 'c', amount: 20 },
    ]);

    expect(settlements).toEqual([
      { fromUserId: 'a', toUserId: 'c', amount: 30 },
      { fromUserId: 'a', toUserId: 'b', amount: 10 },
    ]);
  });

  it('matches two debtors to two creditors in 2 transactions (hand-computed)', () => {
    // Net balances: a = -10, b = -20, c = +20, d = +10.
    // Largest debtor b(20) exactly matches largest creditor c(20); the
    // remaining debtor a(10) exactly matches the remaining creditor d(10).
    const settlements = simplifyDebts([
      { fromUserId: 'a', toUserId: 'd', amount: 10 },
      { fromUserId: 'b', toUserId: 'c', amount: 20 },
    ]);

    expect(settlements).toEqual([
      { fromUserId: 'b', toUserId: 'c', amount: 20 },
      { fromUserId: 'a', toUserId: 'd', amount: 10 },
    ]);
  });

  it('matches 3 debtors against 2 creditors in the minimum transactions (hand-computed)', () => {
    // Net: a = -5, c = -30, e = -25, b = +15, d = +45.
    // Debtors sorted desc: c(30), e(25), a(5). Creditors sorted desc: d(45), b(15).
    // c(30) -> d(45): d has 15 left. e(25) -> d(15): d done, e has 10 left.
    // e(10) -> b(15): b has 5 left. a(5) -> b(5): both done. 4 transactions.
    const settlements = simplifyDebts([
      { fromUserId: 'a', toUserId: 'b', amount: 5 },
      { fromUserId: 'c', toUserId: 'd', amount: 30 },
      { fromUserId: 'e', toUserId: 'd', amount: 15 },
      { fromUserId: 'e', toUserId: 'b', amount: 10 },
    ]);

    expect(settlements).toEqual([
      { fromUserId: 'c', toUserId: 'd', amount: 30 },
      { fromUserId: 'e', toUserId: 'd', amount: 15 },
      { fromUserId: 'e', toUserId: 'b', amount: 10 },
      { fromUserId: 'a', toUserId: 'b', amount: 5 },
    ]);
  });

  it('never produces more transactions than there are non-zero balances minus one', () => {
    const raw = [
      { fromUserId: 'a', toUserId: 'b', amount: 15 },
      { fromUserId: 'c', toUserId: 'b', amount: 5 },
      { fromUserId: 'c', toUserId: 'd', amount: 25 },
      { fromUserId: 'a', toUserId: 'd', amount: 5 },
    ];
    const settlements = simplifyDebts(raw);

    const net = new Map<string, number>();
    for (const d of raw) {
      net.set(d.fromUserId, (net.get(d.fromUserId) ?? 0) - d.amount);
      net.set(d.toUserId, (net.get(d.toUserId) ?? 0) + d.amount);
    }
    const nonZeroBalances = [...net.values()].filter((v) => Math.round(v * 100) !== 0).length;
    expect(settlements.length).toBeLessThanOrEqual(Math.max(0, nonZeroBalances - 1));

    // Simplification must preserve each user's net position exactly.
    const simplifiedNet = new Map<string, number>();
    for (const d of settlements) {
      simplifiedNet.set(d.fromUserId, (simplifiedNet.get(d.fromUserId) ?? 0) - d.amount);
      simplifiedNet.set(d.toUserId, (simplifiedNet.get(d.toUserId) ?? 0) + d.amount);
    }
    for (const [userId, amount] of net) {
      expect(simplifiedNet.get(userId) ?? 0).toBeCloseTo(amount, 5);
    }
  });
});

describe('balancesService.getRawGroupBalances (wired to a real DB)', () => {
  let db: AppDatabase;
  let expenseSplitsRepo: ExpenseSplitsRepository;
  let settlementsRepo: SettlementsRepository;
  let groupsRepo: GroupsRepository;
  let expensesService: ExpensesService;
  let balancesService: BalancesService;
  let groupId: string;

  beforeEach(async () => {
    db = createTestDatabase();
    expenseSplitsRepo = createExpenseSplitsRepository(db);
    settlementsRepo = createSettlementsRepository(db);
    groupsRepo = createGroupsRepository(db);
    expensesService = createExpensesService(createExpensesRepository(db), expenseSplitsRepo, createActivityLogRepository(db));
    balancesService = createBalancesService(expenseSplitsRepo, settlementsRepo);
    groupId = (await groupsRepo.create({ name: 'Trip' })).id;
  });

  it('reflects the raw balances after adding one equal-split expense', async () => {
    await expensesService.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b', 'c'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    const balances = await balancesService.getRawGroupBalances(groupId);
    expect(balances).toEqual(
      expect.arrayContaining([
        { fromUserId: 'b', toUserId: 'a', amount: 30 },
        { fromUserId: 'c', toUserId: 'a', amount: 30 },
      ])
    );
  });

  it('aggregates balances across multiple expenses in the group', async () => {
    await expensesService.create({
      groupId,
      description: 'Dinner',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 100 }],
    });
    await expensesService.create({
      groupId,
      description: 'Movie',
      totalAmount: 20,
      currency: 'USD',
      date: '2026-01-02',
      category: 'Fun',
      createdBy: 'b',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'b', paidAmount: 20 }],
    });

    const balances = await balancesService.getRawGroupBalances(groupId);
    // b owed a 50 from dinner, a owed b 10 from the movie -> net b owes a 40.
    expect(balances).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 40 }]);
  });

  it('excludes balances from a different group', async () => {
    const otherGroupId = (await groupsRepo.create({ name: 'Roommates' })).id;
    await expensesService.create({
      groupId: otherGroupId,
      description: 'Rent',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Housing',
      createdBy: 'x',
      splitType: 'EQUAL',
      participantUserIds: ['x', 'y'],
      paidBy: [{ userId: 'x', paidAmount: 100 }],
    });

    expect(await balancesService.getRawGroupBalances(groupId)).toEqual([]);
  });

  it('reduces the balance after recording a settlement (Module 7)', async () => {
    await expensesService.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });

    await settlementsRepo.create({ groupId, fromUserId: 'b', toUserId: 'a', amount: 45, date: '2026-01-02' });

    expect(await balancesService.getRawGroupBalances(groupId)).toEqual([]);
  });

  it('excludes settlements from a different group', async () => {
    const otherGroupId = (await groupsRepo.create({ name: 'Roommates' })).id;
    await expensesService.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });
    await settlementsRepo.create({ groupId: otherGroupId, fromUserId: 'b', toUserId: 'a', amount: 45, date: '2026-01-02' });

    expect(await balancesService.getRawGroupBalances(groupId)).toEqual([{ fromUserId: 'b', toUserId: 'a', amount: 45 }]);
  });

  it('nets settlements between multiple different pairs in the same group', async () => {
    // a paid 90, split equally a/b/c -> b owes a 30, c owes a 30.
    await expensesService.create({
      groupId,
      description: 'Dinner',
      totalAmount: 90,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Food',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b', 'c'],
      paidBy: [{ userId: 'a', paidAmount: 90 }],
    });
    await settlementsRepo.create({ groupId, fromUserId: 'b', toUserId: 'a', amount: 30, date: '2026-01-02' });
    await settlementsRepo.create({ groupId, fromUserId: 'c', toUserId: 'a', amount: 10, date: '2026-01-02' });

    const balances = await balancesService.getRawGroupBalances(groupId);
    expect(balances).toEqual([{ fromUserId: 'c', toUserId: 'a', amount: 20 }]);
  });

  it('getSimplifiedGroupBalances collapses a 3-person chain into the minimum transactions', async () => {
    // a paid 100 split equally a/b/c -> b owes a ~33.33, c owes a ~33.34.
    await expensesService.create({
      groupId,
      description: 'Trip fund',
      totalAmount: 100,
      currency: 'USD',
      date: '2026-01-01',
      category: 'Travel',
      createdBy: 'a',
      splitType: 'EQUAL',
      participantUserIds: ['a', 'b', 'c'],
      paidBy: [{ userId: 'a', paidAmount: 100 }],
    });
    // b paid 30 split equally b/c -> c owes b 15.
    await expensesService.create({
      groupId,
      description: 'Snacks',
      totalAmount: 30,
      currency: 'USD',
      date: '2026-01-02',
      category: 'Food',
      createdBy: 'b',
      splitType: 'EQUAL',
      participantUserIds: ['b', 'c'],
      paidBy: [{ userId: 'b', paidAmount: 30 }],
    });

    const raw = await balancesService.getRawGroupBalances(groupId);
    expect(raw).toHaveLength(3); // b->a, c->a, c->b: unsimplified

    const simplified = await balancesService.getSimplifiedGroupBalances(groupId);
    // Net: a = +66.67, b = +33.33-15 = +18.33, c = -33.33-15 = -48.33 (roughly).
    // Simplified should need at most 2 transactions (3 non-zero balances).
    expect(simplified.length).toBeLessThanOrEqual(2);
    const total = simplified.reduce((sum, d) => sum + d.amount, 0);
    expect(total).toBeGreaterThan(0);
  });
});
