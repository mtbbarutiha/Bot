import type { OnboardingStatus, PetProfile, PlaydateRequest, PlaydateStatus, User, UserRole } from '@petdate/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function registerUser(data: {
  telegramId?: string;
  name: string;
  username?: string;
}): Promise<User> {
  return request<User>('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  try {
    return await request<User>(`/api/users/telegram/${encodeURIComponent(telegramId)}`);
  } catch {
    return null;
  }
}

export async function setUserRole(telegramId: string, role: UserRole): Promise<User> {
  return request<User>(`/api/users/telegram/${encodeURIComponent(telegramId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function setUserRoles(telegramId: string, roles: UserRole[]): Promise<User> {
  return request<User>(`/api/users/telegram/${encodeURIComponent(telegramId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
  });
}

export async function setUserRoleById(userId: number, role: UserRole): Promise<User> {
  return request<User>(`/api/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function setUserRolesById(userId: number, roles: UserRole[]): Promise<User> {
  return request<User>(`/api/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
  });
}

export async function setUserOnboarding(
  userId: number,
  onboarding: OnboardingStatus
): Promise<User> {
  return request<User>(`/api/users/${userId}/onboarding`, {
    method: 'PATCH',
    body: JSON.stringify({ onboarding }),
  });
}

export async function listPets(filters?: {
  ownerId?: number;
  lookingForPlaymate?: boolean;
}): Promise<PetProfile[]> {
  const params = new URLSearchParams();
  if (filters?.ownerId) params.set('ownerId', String(filters.ownerId));
  if (filters?.lookingForPlaymate !== undefined) {
    params.set('lookingForPlaymate', String(filters.lookingForPlaymate));
  }
  const qs = params.toString();
  return request<PetProfile[]>(`/api/pets${qs ? `?${qs}` : ''}`);
}

export async function createPet(data: Record<string, unknown>): Promise<PetProfile> {
  return request<PetProfile>('/api/pets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listPlaydateRequests(filters?: {
  userId?: number;
  petId?: number;
  status?: PlaydateStatus;
}): Promise<PlaydateRequest[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.set('userId', String(filters.userId));
  if (filters?.petId) params.set('petId', String(filters.petId));
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  return request<PlaydateRequest[]>(`/api/playdate-requests${qs ? `?${qs}` : ''}`);
}

export async function createPlaydateRequest(data: {
  fromPetId: number;
  toPetId: number;
  fromUserId: number;
  toUserId?: number;
  message?: string;
  scheduledAt?: string;
  location?: string;
}): Promise<PlaydateRequest> {
  return request<PlaydateRequest>('/api/playdate-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlaydateStatus(
  id: number,
  status: PlaydateStatus
): Promise<PlaydateRequest> {
  return request<PlaydateRequest>(`/api/playdate-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export type WebOtpChannel = 'phone' | 'email';

export async function requestWebOtp(channel: WebOtpChannel, target: string) {
  return request<{
    ok: true;
    channel: WebOtpChannel;
    target: string;
    expiresAt: string;
    devCode?: string;
  }>('/api/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ channel, target }),
  });
}

export async function verifyWebOtp(
  channel: WebOtpChannel,
  target: string,
  code: string
) {
  return request<{ ok: true; token: string; user: User }>('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ channel, target, code }),
  });
}

export async function fetchMe(token: string) {
  return request<{ ok: true; user: User }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function logoutWebSession(token: string) {
  return request<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function patchWebProfile(token: string, patch: Record<string, unknown>) {
  return request<{ ok: true; user: User }>('/api/auth/profile', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
}

export async function patchWebRoles(token: string, roles: UserRole[]) {
  return request<{ ok: true; user: User }>('/api/auth/roles', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ roles }),
  });
}
