import { createBudgetsRepository, type BudgetsRepository } from '../../repositories/budgets.repository';
import {
  createPersonalTransactionsRepository,
  type PersonalTransactionsRepository,
} from '../../repositories/personalTransactions.repository';
import { createTestDatabase } from '../../repositories/testUtils/testDatabase';
import { createBudgetOverviewService, type BudgetOverviewService } from '../budgetOverview.service';

describe('budgetOverviewService', () => {
  let service: BudgetOverviewService;
  let budgetsRepo: BudgetsRepository;
  let transactionsRepo: PersonalTransactionsRepository;

  beforeEach(() => {
    const db = createTestDatabase();
    budgetsRepo = createBudgetsRepository(db);
    transactionsRepo = createPersonalTransactionsRepository(db);
    service = createBudgetOverviewService(transactionsRepo, budgetsRepo);
  });

  describe('getCategorySpend', () => {
    it('sums expense amounts per category within the given month', async () => {
      await transactionsRepo.create({
        accountId: 'a1',
        type: 'expense',
        amount: 20,
        category: 'Food',
        date: '2026-01-05',
      });
      await transactionsRepo.create({
        accountId: 'a1',
        type: 'expense',
        amount: 15,
        category: 'Food',
        date: '2026-01-20',
      });
      await transactionsRepo.create({
        accountId: 'a1',
        type: 'expense',
        amount: 100,
        category: 'Rent',
        date: '2026-01-01',
      });

      const spend = await service.getCategorySpend('2026-01');
      expect(spend).toEqual([
        { category: 'Rent', spent: 100 },
        { category: 'Food', spent: 35 },
      ]);
    });

    it('excludes income/transfer transactions and other months', async () => {
      await transactionsRepo.create({
        accountId: 'a1',
        type: 'income',
        amount: 500,
        category: 'Salary',
        date: '2026-01-01',
      });
      await transactionsRepo.create({
        accountId: 'a1',
        type: 'expense',
        amount: 50,
        category: 'Food',
        date: '2026-02-01',
      });

      expect(await service.getCategorySpend('2026-01')).toEqual([]);
    });
  });

  describe('getBudgetProgress', () => {
    it('pairs each budget with its category spend for that month', async () => {
      await budgetsRepo.create({ category: 'Food', monthlyLimit: 200, month: '2026-01' });
      await budgetsRepo.create({ category: 'Rent', monthlyLimit: 1000, month: '2026-01' });
      await transactionsRepo.create({
        accountId: 'a1',
        type: 'expense',
        amount: 60,
        category: 'Food',
        date: '2026-01-10',
      });

      const progress = await service.getBudgetProgress('2026-01');
      expect(progress).toEqual([
        { budget: expect.objectContaining({ category: 'Food', monthlyLimit: 200 }), spent: 60 },
        { budget: expect.objectContaining({ category: 'Rent', monthlyLimit: 1000 }), spent: 0 },
      ]);
    });

    it('ignores budgets from other months', async () => {
      await budgetsRepo.create({ category: 'Food', monthlyLimit: 200, month: '2026-02' });
      expect(await service.getBudgetProgress('2026-01')).toEqual([]);
    });
  });
});
