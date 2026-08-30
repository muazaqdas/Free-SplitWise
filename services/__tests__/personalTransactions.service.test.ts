import { createAccountsRepository, type AccountsRepository } from '../../repositories/accounts.repository';
import {
  createPersonalTransactionsRepository,
  type PersonalTransactionsRepository,
} from '../../repositories/personalTransactions.repository';
import { createTestDatabase } from '../../repositories/testUtils/testDatabase';
import { createPersonalTransactionsService, type PersonalTransactionsService } from '../personalTransactions.service';

describe('personalTransactionsService', () => {
  let service: PersonalTransactionsService;
  let accountsRepo: AccountsRepository;
  let transactionsRepo: PersonalTransactionsRepository;

  beforeEach(async () => {
    const db = createTestDatabase();
    accountsRepo = createAccountsRepository(db);
    transactionsRepo = createPersonalTransactionsRepository(db);
    service = createPersonalTransactionsService(transactionsRepo, accountsRepo);
  });

  it('increases balance on an income transaction', async () => {
    const account = await accountsRepo.create({ name: 'Cash', type: 'cash', balance: 0 });
    await service.create({ accountId: account.id, type: 'income', amount: 100, category: 'Salary', date: '2026-01-01' });
    expect((await accountsRepo.getById(account.id))?.balance).toBe(100);
  });

  it('decreases balance on an expense transaction', async () => {
    const account = await accountsRepo.create({ name: 'Cash', type: 'cash', balance: 100 });
    await service.create({ accountId: account.id, type: 'expense', amount: 30, category: 'Food', date: '2026-01-01' });
    expect((await accountsRepo.getById(account.id))?.balance).toBe(70);
  });

  it('accumulates balance across multiple transactions', async () => {
    const account = await accountsRepo.create({ name: 'Cash', type: 'cash', balance: 0 });
    await service.create({ accountId: account.id, type: 'income', amount: 500, category: 'Salary', date: '2026-01-01' });
    await service.create({ accountId: account.id, type: 'expense', amount: 120, category: 'Rent', date: '2026-01-02' });
    await service.create({ accountId: account.id, type: 'expense', amount: 30.5, category: 'Food', date: '2026-01-03' });
    expect((await accountsRepo.getById(account.id))?.balance).toBe(349.5);
  });

  it('recomputes balance after editing a transaction amount', async () => {
    const account = await accountsRepo.create({ name: 'Cash', type: 'cash', balance: 0 });
    const tx = await service.create({
      accountId: account.id,
      type: 'expense',
      amount: 30,
      category: 'Food',
      date: '2026-01-01',
    });

    await service.update(tx.id, { amount: 50 });
    expect((await accountsRepo.getById(account.id))?.balance).toBe(-50);
  });

  it('recomputes both accounts when a transaction moves between accounts', async () => {
    const accountA = await accountsRepo.create({ name: 'Cash', type: 'cash', balance: 0 });
    const accountB = await accountsRepo.create({ name: 'Bank', type: 'bank', balance: 0 });
    const tx = await service.create({
      accountId: accountA.id,
      type: 'expense',
      amount: 40,
      category: 'Food',
      date: '2026-01-01',
    });

    await service.update(tx.id, { accountId: accountB.id });

    expect((await accountsRepo.getById(accountA.id))?.balance).toBe(0);
    expect((await accountsRepo.getById(accountB.id))?.balance).toBe(-40);
  });

  it('recomputes balance after deleting a transaction', async () => {
    const account = await accountsRepo.create({ name: 'Cash', type: 'cash', balance: 0 });
    const tx = await service.create({
      accountId: account.id,
      type: 'income',
      amount: 100,
      category: 'Salary',
      date: '2026-01-01',
    });
    await service.create({ accountId: account.id, type: 'expense', amount: 20, category: 'Food', date: '2026-01-02' });

    await service.remove(tx.id);

    expect((await accountsRepo.getById(account.id))?.balance).toBe(-20);
  });

  it('throws when updating an unknown transaction id', async () => {
    await expect(service.update('does-not-exist', { amount: 1 })).rejects.toThrow();
  });

  it('throws when removing an unknown transaction id', async () => {
    await expect(service.remove('does-not-exist')).rejects.toThrow();
  });
});
