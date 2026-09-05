import type { OnboardingStatus, PetProfile, PlaydateChatMessage, PlaydateRequest, PlaydateStatus, User, UserRole } from '@petdate/shared';

/** Empty = same-origin (Vite proxies /api → API). Override with VITE_API_URL if needed. */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    // headers must come after ...init so Authorization does not wipe Content-Type
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('اتصال به سرور برقرار نشد. مطمئن شو API روشن است.');
  }
  if (!res.ok) {
    const body = await res.text();
    try {
      const json = JSON.parse(body) as { error?: string; message?: string };
      throw new Error(json.error || json.message || body || `خطای ${res.status}`);
    } catch (err) {
      if (err instanceof Error && !err.message.startsWith('{') && err.message !== body) throw err;
      throw new Error(body || `خطای ${res.status}`);
    }
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
  species?: string;
}): Promise<PetProfile[]> {
  const params = new URLSearchParams();
  if (filters?.ownerId) params.set('ownerId', String(filters.ownerId));
  if (filters?.lookingForPlaymate !== undefined) {
    params.set('lookingForPlaymate', String(filters.lookingForPlaymate));
  }
  if (filters?.species) params.set('species', filters.species);
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

export async function getPlaydateRequest(id: number): Promise<PlaydateRequest | null> {
  try {
    return await request<PlaydateRequest>(`/api/playdate-requests/${id}`);
  } catch {
    return null;
  }
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
  status: PlaydateStatus,
  userId: number
): Promise<PlaydateRequest> {
  return request<PlaydateRequest>(`/api/playdate-requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, userId }),
  });
}

export async function listPlaydateChatMessages(
  playdateId: number,
  userId: number,
  afterId?: number
): Promise<PlaydateChatMessage[]> {
  const params = new URLSearchParams({ userId: String(userId) });
  if (afterId != null) params.set('afterId', String(afterId));
  return request(`/api/playdate-requests/${playdateId}/messages?${params}`);
}

export async function postPlaydateChatMessage(
  playdateId: number,
  senderUserId: number,
  text: string
): Promise<PlaydateChatMessage> {
  return request(`/api/playdate-requests/${playdateId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ senderUserId, text }),
  });
}

/** Upload a chat attachment (photo / video / audio / document). */
export async function uploadPlaydateChatFile(
  playdateId: number,
  senderUserId: number,
  file: File,
  caption = ''
): Promise<PlaydateChatMessage> {
  const form = new FormData();
  form.append('file', file);
  form.append('senderUserId', String(senderUserId));
  if (caption.trim()) form.append('caption', caption.trim());

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/playdate-requests/${playdateId}/messages/upload`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error('اتصال به سرور برقرار نشد. مطمئن شو API روشن است.');
  }
  if (!res.ok) {
    const body = await res.text();
    try {
      const json = JSON.parse(body) as { error?: string; message?: string };
      throw new Error(json.error || json.message || body || `خطای ${res.status}`);
    } catch (err) {
      if (err instanceof Error && !err.message.startsWith('{') && err.message !== body) throw err;
      throw new Error(body || `خطای ${res.status}`);
    }
  }
  return res.json() as Promise<PlaydateChatMessage>;
}

export async function clearPlaydateChatMessages(
  playdateId: number,
  userId: number
): Promise<{ ok: true; cleared: number }> {
  return request(`/api/playdate-requests/${playdateId}/messages?userId=${userId}`, {
    method: 'DELETE',
  });
}


export async function addUserContact(
  userId: number,
  contactUserId: number
): Promise<{ ok: true; created: boolean }> {
  return request(`/api/users/${userId}/contacts`, {
    method: 'POST',
    body: JSON.stringify({ contactUserId }),
  });
}

export async function endPlaydateChat(
  playdateId: number,
  userId: number
): Promise<{ ok: true; playdate: PlaydateRequest }> {
  return request(`/api/playdate-requests/${playdateId}/end-chat`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function setPlaydateChatSecure(
  playdateId: number,
  userId: number,
  secure: boolean
): Promise<PlaydateRequest> {
  return request(`/api/playdate-requests/${playdateId}/chat-secure`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, secure }),
  });
}

export function playdateChatMediaUrl(
  playdateId: number,
  messageId: number,
  userId: number
): string {
  return `${API_BASE}/api/playdate-requests/${playdateId}/messages/${messageId}/file?userId=${userId}`;
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
