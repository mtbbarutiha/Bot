import type { OnboardingStatus, User, UserRole } from '@petdate/shared';
import { normalizeRoles, primaryRole } from '@petdate/shared';
import {
  fetchMe,
  logoutWebSession,
  patchWebPrimaryRole,
  patchWebProfile,
  patchWebRoles,
  requestWebOtp,
  verifyWebOtp,
  type WebOtpChannel,
} from '../lib/api';
import { userStore } from './userStore';

const STORAGE_KEY = 'petdate_web_auth_v1';

export interface WebAuthState {
  token?: string;
  user?: User;
  pendingChannel?: WebOtpChannel;
  pendingTarget?: string;
  pendingDevCode?: string;
}

function load(): WebAuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as WebAuthState;
  } catch {
    return {};
  }
}

class AuthStore {
  private listeners = new Set<() => void>();
  private data: WebAuthState = load();

  constructor() {
    if (this.data.user) {
      userStore.linkApiUser({
        id: this.data.user.id,
        telegramId: this.data.user.telegramId,
        name: this.data.user.name,
        role: this.data.user.role,
        roles: this.data.user.roles,
        onboarding: this.data.user.onboarding,
      });
    }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.data;

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    if (this.data.user) {
      userStore.linkApiUser({
        id: this.data.user.id,
        telegramId: this.data.user.telegramId,
        name: this.data.user.name,
        role: this.data.user.role,
        roles: this.data.user.roles,
        onboarding: this.data.user.onboarding,
      });
    }
    this.listeners.forEach((l) => l());
  }

  get isLoggedIn() {
    return Boolean(this.data.token && this.data.user);
  }

  get hasRole() {
    return normalizeRoles(this.data.user?.roles, this.data.user?.role).length > 0;
  }

  get isProfileComplete() {
    const u = this.data.user;
    if (!u) return false;
    if (u.onboarding === 'profile_complete') return true;
    return Boolean(u.name?.trim() && u.age && u.gender && u.country && u.city);
  }

  setPending(channel: WebOtpChannel, target: string, devCode?: string) {
    this.data = {
      ...this.data,
      pendingChannel: channel,
      pendingTarget: target,
      pendingDevCode: devCode,
    };
    this.persist();
  }

  clearPending() {
    this.data = {
      ...this.data,
      pendingChannel: undefined,
      pendingTarget: undefined,
      pendingDevCode: undefined,
    };
    this.persist();
  }

  async requestOtp(channel: WebOtpChannel, target: string) {
    const result = await requestWebOtp(channel, target);
    this.setPending(channel, result.target, result.devCode);
    return result;
  }

  async verifyOtp(code: string) {
    if (!this.data.pendingChannel || !this.data.pendingTarget) {
      throw new Error('ابتدا شماره یا ایمیل را وارد کن');
    }
    const result = await verifyWebOtp(
      this.data.pendingChannel,
      this.data.pendingTarget,
      code
    );
    this.data = { token: result.token, user: result.user };
    this.persist();
    return result.user;
  }

  async refreshMe() {
    if (!this.data.token) return null;
    const me = await fetchMe(this.data.token);
    this.data = { ...this.data, user: me.user };
    this.persist();
    return me.user;
  }

  async saveProfile(patch: Record<string, unknown>) {
    if (!this.data.token) throw new Error('وارد نشده‌اید');
    const res = await patchWebProfile(this.data.token, patch);
    this.data = { ...this.data, user: res.user };
    this.persist();
    return res.user;
  }

  async saveRoles(roles: UserRole[], primary?: UserRole) {
    if (!this.data.token) throw new Error('وارد نشده‌اید');
    const res = await patchWebRoles(this.data.token, roles, primary);
    this.data = { ...this.data, user: res.user };
    this.persist();
    return res.user;
  }

  /** سوییچ نقش فعال بین نقش‌های موجود (بدون حذف بقیه) */
  async setPrimaryRole(role: UserRole) {
    if (!this.data.token) throw new Error('وارد نشده‌اید');
    const res = await patchWebPrimaryRole(this.data.token, role);
    this.data = { ...this.data, user: res.user };
    this.persist();
    return res.user;
  }

  setOnboardingLocal(onboarding: OnboardingStatus) {
    if (!this.data.user) return;
    this.data = { ...this.data, user: { ...this.data.user, onboarding } };
    this.persist();
  }

  async logout() {
    if (this.data.token) {
      try {
        await logoutWebSession(this.data.token);
      } catch {
        /* ignore */
      }
    }
    this.data = {};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    userStore.reset();
    this.listeners.forEach((l) => l());
  }
}

export const authStore = new AuthStore();

export function userPrimaryRole(user?: User | null): UserRole | undefined {
  return primaryRole(user?.roles, user?.role);
}
