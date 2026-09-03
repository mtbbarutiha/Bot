import type { OnboardingStatus, PetProfile, PlaydateRequest, PlaydateStatus, User, UserRole } from '@petdate/shared';
import { config } from './config';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function registerTelegramUser(data: {
  telegramId: string;
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

export async function setUserOnboarding(telegramId: string, onboarding: OnboardingStatus): Promise<User> {
  return request<User>(`/api/users/telegram/${encodeURIComponent(telegramId)}/onboarding`, {
    method: 'PATCH',
    body: JSON.stringify({ onboarding }),
  });
}

export async function updateUserProfile(
  telegramId: string,
  patch: Partial<{
    name: string;
    age: number;
    gender: import('@petdate/shared').UserGender;
    city: string;
    phone: string;
    bio: string;
    avatarUrl: string;
    onboarding: OnboardingStatus;
  }>
): Promise<User> {
  return request<User>(`/api/users/telegram/${encodeURIComponent(telegramId)}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function listPets(filters?: { ownerId?: number; lookingForPlaymate?: boolean }): Promise<PetProfile[]> {
  const params = new URLSearchParams();
  if (filters?.ownerId) params.set('ownerId', String(filters.ownerId));
  if (filters?.lookingForPlaymate !== undefined) {
    params.set('lookingForPlaymate', String(filters.lookingForPlaymate));
  }
  const qs = params.toString();
  return request<PetProfile[]>(`/api/pets${qs ? `?${qs}` : ''}`);
}

export async function getPet(id: number): Promise<PetProfile | null> {
  try {
    return await request<PetProfile>(`/api/pets/${id}`);
  } catch {
    return null;
  }
}

export async function createPet(data: {
  ownerId: number;
  name: string;
  species: string;
  breed?: string;
  city?: string;
  lookingForPlaymate?: boolean;
}): Promise<PetProfile> {
  return request<PetProfile>('/api/pets', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      vaccinated: true,
      neutered: false,
      lookingForPlaymate: data.lookingForPlaymate ?? true,
    }),
  });
}

export async function listPlaydates(filters?: {
  userId?: number;
  status?: PlaydateStatus;
}): Promise<PlaydateRequest[]> {
  const params = new URLSearchParams();
  if (filters?.userId) params.set('userId', String(filters.userId));
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  return request<PlaydateRequest[]>(`/api/playdate-requests${qs ? `?${qs}` : ''}`);
}

export async function createPlaydate(data: {
  fromPetId: number;
  toPetId: number;
  fromUserId: number;
  message?: string;
}): Promise<PlaydateRequest> {
  return request<PlaydateRequest>('/api/playdate-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePlaydateStatus(id: number, status: PlaydateStatus): Promise<PlaydateRequest> {
  return request<PlaydateRequest>(`/api/playdate-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
