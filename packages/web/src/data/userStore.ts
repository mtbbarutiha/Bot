import type { OnboardingStatus, UserRole } from '@petdate/shared';
import { getUserByTelegramId, registerUser, setUserOnboarding, setUserRole, setUserRoleById } from '../lib/api';

const STORAGE_KEY = 'petdate_user_v1';

export interface LocalUser {
  id?: number;
  telegramId?: string;
  name: string;
  role?: UserRole;
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
      if (raw) return JSON.parse(raw) as LocalUser;
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
    return Boolean(this.data.role);
  }

  get isOnboarded(): boolean {
    return this.data.onboarding === 'profile_complete';
  }

  setName(name: string) {
    this.data = { ...this.data, name };
    this.persist();
  }

  setRole(role: UserRole) {
    this.data = { ...this.data, role, onboarding: 'role_selected' };
    this.persist();
  }

  setOnboarding(onboarding: OnboardingStatus) {
    this.data = { ...this.data, onboarding };
    this.persist();
  }

  linkApiUser(user: { id: number; telegramId?: string; role?: UserRole; onboarding?: OnboardingStatus; name: string }) {
    this.data = {
      id: user.id,
      telegramId: user.telegramId ?? this.data.telegramId,
      name: user.name,
      role: user.role ?? this.data.role,
      onboarding: user.onboarding ?? (this.data.onboarding === 'none' ? 'role_selected' : this.data.onboarding),
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
      onboarding: user.onboarding,
    });
  }

  async saveRoleToApi(role: UserRole): Promise<void> {
    this.setRole(role);
    if (this.data.telegramId) {
      const user = await setUserRole(this.data.telegramId, role);
      this.linkApiUser(user);
      return;
    }
    if (!this.data.id) {
      const user = await registerUser({ name: this.data.name });
      this.linkApiUser(user);
    }
    if (this.data.id) {
      const user = await setUserRoleById(this.data.id, role);
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
