/**
 * Admin panel credential.
 *
 * There is deliberately no default: `scripts/deploy-vps.sh` creates `.env` from
 * `.env.example` when the server has none, so any value hardcoded here (or
 * shipped in the example file) would be a publicly known password on a freshly
 * provisioned host. Missing configuration must stop the process instead.
 */
export const ADMIN_PASSWORD_ENV = 'ADMIN_PASSWORD';

export const ADMIN_PASSWORD_MISSING_MESSAGE =
  `${ADMIN_PASSWORD_ENV} is not set. The admin panel has no default password; ` +
  `set ${ADMIN_PASSWORD_ENV} in .env to a value only you know, then restart.`;

export class AdminPasswordNotConfiguredError extends Error {
  constructor() {
    super(ADMIN_PASSWORD_MISSING_MESSAGE);
    this.name = 'AdminPasswordNotConfiguredError';
  }
}

export function normalizeAdminPassword(raw: string | undefined): string | undefined {
  const value = (raw ?? '').trim();
  return value.length > 0 ? value : undefined;
}

export function isAdminPasswordConfigured(): boolean {
  return normalizeAdminPassword(process.env[ADMIN_PASSWORD_ENV]) !== undefined;
}

/** Throws when unset — callers must fail closed rather than fall back. */
export function requireAdminPassword(): string {
  const value = normalizeAdminPassword(process.env[ADMIN_PASSWORD_ENV]);
  if (value === undefined) throw new AdminPasswordNotConfiguredError();
  return value;
}

/** Startup guard: refuse to boot without an admin password. */
export function assertAdminPasswordConfigured(): void {
  requireAdminPassword();
}
