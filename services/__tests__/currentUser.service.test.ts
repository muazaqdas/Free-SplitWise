import { createCurrentUserService, type CurrentUserService } from '../currentUser.service';
import { createUsersRepository, type UsersRepository } from '../../repositories/users.repository';
import { createTestDatabase } from '../../repositories/testUtils/testDatabase';

describe('currentUserService', () => {
  let usersRepo: UsersRepository;
  let service: CurrentUserService;

  beforeEach(() => {
    const db = createTestDatabase();
    usersRepo = createUsersRepository(db);
    service = createCurrentUserService(usersRepo);
  });

  it('getCurrentUser returns null before anyone is set up', async () => {
    await usersRepo.create({ name: 'Ralph' }); // a friend, not "me"
    expect(await service.getCurrentUser()).toBeNull();
  });

  it('saveCurrentUserProfile with no userId creates a new user and flags it current', async () => {
    const saved = await service.saveCurrentUserProfile({ name: '  Muaz  ', monthlyIncome: 5000 });

    expect(saved.name).toBe('Muaz');
    expect(saved.monthlyIncome).toBe(5000);
    expect(saved.isCurrentUser).toBe(true);
    expect((await service.getCurrentUser())?.id).toBe(saved.id);
  });

  it('saveCurrentUserProfile with a userId edits the existing current-user row in place', async () => {
    const created = await service.saveCurrentUserProfile({ name: 'Muaz' });

    const updated = await service.saveCurrentUserProfile({ userId: created.id, name: 'Muaz A.', monthlyIncome: 6000 });

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe('Muaz A.');
    expect(updated.monthlyIncome).toBe(6000);
    expect(await usersRepo.getAll()).toHaveLength(1);
  });

  it('rejects an empty name without creating a row', async () => {
    await expect(service.saveCurrentUserProfile({ name: '   ' })).rejects.toThrow('Give yourself a name.');
    expect(await usersRepo.getAll()).toHaveLength(0);
  });
});
