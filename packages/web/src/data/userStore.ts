import type { OnboardingStatus, UserRole } from '@petdate/shared';
import { normalizeRoles, primaryRole } from '@petdate/shared';
import {
  getUserByTelegramId,
  registerUser,
  setUserOnboarding,
  setUserRoles,
  setUserRolesById,
} from '../lib/api';

const STORAGE_KEY = 'petdate_user_v1';

export interface LocalUser {
  id?: number;
  telegramId?: string;
  name: string;
  role?: UserRole;
  roles?: UserRole[];
  onboarding: OnboardingStatus | 'none';
}

function defaultUser(): LocalUser {
  return {
    name: 'کاربر petdate',
    onboarding: 'none',
  };
}

class UserStore {
  private listeners = new Set<() => void>();
  private data: LocalUser;

  constructor() {
    this.data = this.load();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): LocalUser => this.data;

  private emit() {
    for (const l of this.listeners) l();
  }

  private load(): LocalUser {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LocalUser;
        const roles = normalizeRoles(parsed.roles, parsed.role);
        return {
          ...parsed,
          roles,
          role: primaryRole(roles, parsed.role) ?? parsed.role,
        };
      }
    } catch {
      /* use default */
    }
    return defaultUser();
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.emit();
  }

  get hasRole(): boolean {
    return normalizeRoles(this.data.roles, this.data.role).length > 0;
  }

  get isOnboarded(): boolean {
    return this.data.onboarding === 'profile_complete';
  }

  setName(name: string) {
    this.data = { ...this.data, name };
    this.persist();
  }

  setRole(role: UserRole) {
    this.setRoles([role]);
  }

  setRoles(roles: UserRole[]) {
    const normalized = normalizeRoles(roles);
    this.data = {
      ...this.data,
      roles: normalized,
      role: primaryRole(normalized),
      onboarding: 'role_selected',
    };
    this.persist();
  }

  setOnboarding(onboarding: OnboardingStatus) {
    this.data = { ...this.data, onboarding };
    this.persist();
  }

  linkApiUser(user: {
    id: number;
    telegramId?: string;
    role?: UserRole;
    roles?: UserRole[];
    onboarding?: OnboardingStatus;
    name: string;
  }) {
    const roles = normalizeRoles(user.roles, user.role ?? this.data.role);
    this.data = {
      id: user.id,
      telegramId: user.telegramId ?? this.data.telegramId,
      name: user.name,
      role: primaryRole(roles, user.role) ?? this.data.role,
      roles,
      onboarding:
        user.onboarding ??
        (this.data.onboarding === 'none' ? 'role_selected' : this.data.onboarding),
    };
    this.persist();
  }

  async syncFromTelegram(telegramId: string): Promise<void> {
    let user = await getUserByTelegramId(telegramId);
    if (!user) {
      user = await registerUser({ telegramId, name: this.data.name });
    }
    this.linkApiUser({
      id: user.id,
      telegramId: user.telegramId,
      name: user.name,
      role: user.role,
      roles: user.roles,
      onboarding: user.onboarding,
    });
  }

  async saveRoleToApi(role: UserRole): Promise<void> {
    return this.saveRolesToApi([role]);
  }

  async saveRolesToApi(roles: UserRole[]): Promise<void> {
    this.setRoles(roles);
    if (this.data.telegramId) {
      const user = await setUserRoles(this.data.telegramId, roles);
      this.linkApiUser(user);
      return;
    }
    if (!this.data.id) {
      const user = await registerUser({ name: this.data.name });
      this.linkApiUser(user);
    }
    if (this.data.id) {
      const user = await setUserRolesById(this.data.id, roles);
      this.linkApiUser(user);
    }
  }

  async saveOnboardingToApi(onboarding: OnboardingStatus): Promise<void> {
    this.setOnboarding(onboarding);
    if (this.data.id) {
      const user = await setUserOnboarding(this.data.id, onboarding);
      this.linkApiUser(user);
    }
  }

  reset() {
    this.data = defaultUser();
    this.persist();
  }
}

export const userStore = new UserStore();
