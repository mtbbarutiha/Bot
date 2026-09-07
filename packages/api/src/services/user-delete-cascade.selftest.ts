/**
 * Prove account delete purges pets and clears mergeable identity
 * so re-register (/start → findOrCreateUser) starts with zero pets.
 *
 * Run: cd packages/api && npx tsx src/services/user-delete-cascade.selftest.ts
 */
import { dbService, getDb, getResolvedDatabasePath } from '../db';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  getDb();
  const tg = `selftest_del_${Date.now()}`;
  const d = getDb();

  const { user, created } = dbService.findOrCreateUser({
    telegramId: tg,
    name: 'Selftest Delete',
    username: 'selftest_delete',
  });
  assert(created || user.telegramId === tg, 'user must exist');

  const pet = dbService.createPet({
    ownerId: user.id,
    name: 'CascadePup',
    species: 'dog',
    breed: 'mix',
  });
  assert(pet?.id, 'pet must be created');

  // Leave mergeable identity fields that previously survived soft-delete
  d.prepare(
    `UPDATE users SET email = ?, email_verified = 1, phone = ?, phone_verified = 1 WHERE id = ?`
  ).run(`del_${tg}@petdate.test`, '989120000001', user.id);

  const beforePets = dbService.listPets({ ownerId: user.id });
  assert(beforePets.length >= 1, 'precondition: at least one pet');

  const ok = dbService.deleteUserByTelegramId(tg);
  assert(ok, 'deleteUserByTelegramId must succeed');

  const gone = dbService.getUserByTelegramId(tg);
  assert(!gone, 'telegram id must be detached');

  const shell = dbService.getUserById(user.id);
  assert(shell, 'anonymized shell row kept for FK history');
  assert(shell.name.startsWith('[حذف‌شده'), 'name anonymized');
  assert(!shell.telegramId, 'telegram cleared');
  assert(!shell.phone, 'phone cleared');
  assert(!shell.email, 'email cleared (prevents merge resurrection)');
  assert(shell.isActive === false, 'inactive');
  assert((shell.coins ?? 0) === 0, 'coins zeroed');

  const afterPets = dbService.listPets({ ownerId: user.id });
  assert(afterPets.length === 0, `pets must be purged, got ${afterPets.length}`);

  // Re-register same telegram → fresh user, zero pets
  const again = dbService.findOrCreateUser({
    telegramId: tg,
    name: 'Selftest Fresh',
  });
  assert(again.created, 're-register must create a new user row');
  assert(again.user.id !== user.id, 'new user id differs from deleted shell');
  const freshPets = dbService.listPets({ ownerId: again.user.id });
  assert(freshPets.length === 0, 'fresh account must have zero pets');

  dbService.deleteUserById(again.user.id);

  console.log(
    `user-delete-cascade.selftest: OK (sqlite=${getResolvedDatabasePath()})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
