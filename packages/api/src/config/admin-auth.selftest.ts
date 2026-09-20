/**
 * Prove the admin password has no built-in fallback: unset means "locked",
 * never "open with a default anyone can read in the repo".
 * Run: npx tsx src/config/admin-auth.selftest.ts
 */
import {
  ADMIN_PASSWORD_ENV,
  AdminPasswordNotConfiguredError,
  isAdminPasswordConfigured,
  normalizeAdminPassword,
  requireAdminPassword,
} from './admin-auth';

function check(ok: boolean, what: string) {
  if (!ok) throw new Error(`admin-auth.selftest: ${what}`);
}

check(normalizeAdminPassword(undefined) === undefined, 'unset must not resolve to a value');
check(normalizeAdminPassword('') === undefined, 'empty must not resolve to a value');
check(normalizeAdminPassword('   ') === undefined, 'whitespace must not resolve to a value');
check(normalizeAdminPassword('  s3cret  ') === 's3cret', 'configured value is trimmed');

const original = process.env[ADMIN_PASSWORD_ENV];
try {
  for (const unset of [undefined, '', '  ']) {
    if (unset === undefined) delete process.env[ADMIN_PASSWORD_ENV];
    else process.env[ADMIN_PASSWORD_ENV] = unset;

    check(!isAdminPasswordConfigured(), `isAdminPasswordConfigured must be false for ${JSON.stringify(unset)}`);
    let threw = false;
    try {
      requireAdminPassword();
    } catch (err) {
      threw = err instanceof AdminPasswordNotConfiguredError;
    }
    check(threw, `requireAdminPassword must throw for ${JSON.stringify(unset)}`);
  }

  process.env[ADMIN_PASSWORD_ENV] = 'selftest-value';
  check(isAdminPasswordConfigured(), 'configured env must report configured');
  check(requireAdminPassword() === 'selftest-value', 'configured env must be returned verbatim');
} finally {
  if (original === undefined) delete process.env[ADMIN_PASSWORD_ENV];
  else process.env[ADMIN_PASSWORD_ENV] = original;
}

console.log('admin-auth.selftest: OK (no default admin password, unset fails closed)');
