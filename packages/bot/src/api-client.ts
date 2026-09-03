import type {
  OnboardingStatus,
  PetBreed,
  PetGender,
  PetProfile,
  PetSize,
  PetSpecies,
  PlaydateRequest,
  PlaydateStatus,
  User,
  UserRole,
} from '@petdate/shared';
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

export async function getUserById(id: number): Promise<User | null> {
  try {
    return await request<User>(`/api/users/id/${id}`);
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
    province: string;
    phone: string;
    bio: string;
    interests: string[];
    avatarUrl: string;
    coins: number;
    onboarding: OnboardingStatus;
    isActive: boolean;
  }>
): Promise<User> {
  return request<User>(`/api/users/telegram/${encodeURIComponent(telegramId)}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function setUserActive(telegramId: string, isActive: boolean): Promise<User> {
  return request<User>(`/api/users/telegram/${encodeURIComponent(telegramId)}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteUserAccount(telegramId: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/users/telegram/${encodeURIComponent(telegramId)}`, {
    method: 'DELETE',
  });
}

export async function listSpecies(): Promise<PetSpecies[]> {
  return request<PetSpecies[]>('/api/catalog/species');
}

export async function listBreeds(species?: string): Promise<PetBreed[]> {
  const qs = species ? `?species=${encodeURIComponent(species)}` : '';
  return request<PetBreed[]>(`/api/catalog/breeds${qs}`);
}

export async function listPets(filters?: {
  ownerId?: number;
  lookingForPlaymate?: boolean;
  species?: string;
}): Promise<PetProfile[]> {
  const params = new URLSearchParams();
  if (filters?.ownerId) params.set('ownerId', String(filters.ownerId));
  if (filters?.species) params.set('species', filters.species);
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
  gender?: PetGender;
  ageMonths?: number;
  size?: PetSize;
  color?: string;
  bio?: string;
  vaccinated?: boolean;
  neutered?: boolean;
  lookingForPlaymate?: boolean;
  health?: Record<string, unknown>;
  diseases?: string;
  imageUrl?: string;
  city?: string;
  neighborhood?: string;
}): Promise<PetProfile> {
  return request<PetProfile>('/api/pets', {
    method: 'POST',
    body: JSON.stringify({
      lookingForPlaymate: true,
      vaccinated: false,
      neutered: false,
      ...data,
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

export async function deletePet(id: number, ownerId: number): Promise<void> {
  await request<{ ok: boolean }>(`/api/pets/${id}?ownerId=${ownerId}`, {
    method: 'DELETE',
  });
}
