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

export async function setUserRoles(telegramId: string, roles: UserRole[]): Promise<User> {
  return request<User>(`/api/users/telegram/${encodeURIComponent(telegramId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
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
    country: string;
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

export async function submitVerification(
  telegramId: string,
  photoFileId?: string
): Promise<{ ok: true; user: User }> {
  return request<{ ok: true; user: User }>(
    `/api/users/telegram/${encodeURIComponent(telegramId)}/verification`,
    {
      method: 'POST',
      body: JSON.stringify(photoFileId ? { photoFileId } : {}),
    }
  );
}

export async function listPendingVerifications(): Promise<User[]> {
  return request<User[]>('/api/users/verification/pending');
}

export async function approveVerification(userId: number): Promise<{ ok: true; user: User }> {
  return request<{ ok: true; user: User }>(`/api/users/${userId}/verification/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function rejectVerification(
  userId: number,
  note?: string
): Promise<{ ok: true; user: User }> {
  return request<{ ok: true; user: User }>(`/api/users/${userId}/verification/reject`, {
    method: 'POST',
    body: JSON.stringify(note ? { note } : {}),
  });
}

export async function submitVetCredential(
  telegramId: string,
  fileId: string
): Promise<{ ok: true; user: User }> {
  return request<{ ok: true; user: User }>(
    `/api/users/telegram/${encodeURIComponent(telegramId)}/vet-credential`,
    {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    }
  );
}

export async function listPendingVetCredentials(): Promise<User[]> {
  return request<User[]>('/api/users/vet-credentials/pending');
}

export async function approveVetCredential(userId: number): Promise<{ ok: true; user: User }> {
  return request<{ ok: true; user: User }>(`/api/users/${userId}/vet-credential/approve`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function rejectVetCredential(userId: number): Promise<{ ok: true; user: User }> {
  return request<{ ok: true; user: User }>(`/api/users/${userId}/vet-credential/reject`, {
    method: 'POST',
    body: JSON.stringify({}),
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
  excludeOwnerId?: number;
  lookingForPlaymate?: boolean;
  species?: string;
  city?: string;
  province?: string;
  breed?: string;
}): Promise<PetProfile[]> {
  const params = new URLSearchParams();
  if (filters?.ownerId) params.set('ownerId', String(filters.ownerId));
  if (filters?.excludeOwnerId) params.set('excludeOwnerId', String(filters.excludeOwnerId));
  if (filters?.species) params.set('species', filters.species);
  if (filters?.city) params.set('city', filters.city);
  if (filters?.province) params.set('province', filters.province);
  if (filters?.breed) params.set('breed', filters.breed);
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

export async function claimDailyCoins(
  telegramId: string,
  amount = 10
): Promise<{ ok: true; awarded: number; user: User } | { ok: false; reason: string; user?: User }> {
  const res = await fetch(
    `${config.apiUrl}/api/users/telegram/${encodeURIComponent(telegramId)}/coins/daily`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }
  );
  const body = (await res.json()) as {
    ok?: boolean;
    awarded?: number;
    user?: User;
    reason?: string;
    error?: string;
  };
  if (!res.ok) {
    return { ok: false, reason: body.reason ?? body.error ?? 'error', user: body.user };
  }
  return { ok: true, awarded: body.awarded ?? amount, user: body.user! };
}

export async function hasOpenCoinSell(telegramId: string): Promise<boolean> {
  try {
    const data = await request<{ open: boolean }>(
      `/api/users/telegram/${encodeURIComponent(telegramId)}/coins/sell/open`
    );
    return Boolean(data.open);
  } catch {
    return false;
  }
}

export async function submitCoinSell(
  telegramId: string,
  data: { coins: number; cardNumber: string; rateToman: number; minCoins: number }
): Promise<
  | { ok: true; requestId: number; amountToman: number; rateToman: number; user: User }
  | { ok: false; reason: string }
> {
  const res = await fetch(
    `${config.apiUrl}/api/users/telegram/${encodeURIComponent(telegramId)}/coins/sell`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  const body = (await res.json()) as {
    ok?: boolean;
    requestId?: number;
    amountToman?: number;
    rateToman?: number;
    user?: User;
    reason?: string;
    error?: string;
  };
  if (!res.ok || !body.ok) {
    return { ok: false, reason: body.reason ?? body.error ?? 'error' };
  }
  return {
    ok: true,
    requestId: body.requestId!,
    amountToman: body.amountToman!,
    rateToman: body.rateToman!,
    user: body.user!,
  };
}
