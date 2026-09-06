import type { User, UserRole, VetConsultation } from '@petdate/shared';
import { primaryRole, userHasRole } from '@petdate/shared';
import type { MatchRequest, Pet } from '../types';
import {
  acceptVetConsultation,
  listPlaydateRequests,
  listVetConsultations,
  rejectVetConsultation,
  updatePlaydateStatus,
} from './api';
import { playdateToMatchRequest } from './playdateMap';

export type InboxKind = 'playmate' | 'vet';

/** Scope of chats tied to the active primary role (no cross-role mixing). */
export type InboxScope = 'vet' | 'owner';

export type InboxConversation = {
  key: string;
  kind: InboxKind;
  id: number;
  title: string;
  preview: string;
  createdAt: string;
  pending: boolean;
  ended: boolean;
  direction: 'incoming' | 'outgoing';
  /** طرف مقابل می‌تواند قبول/رد کند (مثل ربات) */
  canDecide: boolean;
  href: string;
  peerPet?: Pet;
};

export function inboxScopeForRole(role?: UserRole | null): InboxScope {
  return role === 'vet' ? 'vet' : 'owner';
}

export function inboxScopeForUser(user?: User | null): InboxScope {
  return inboxScopeForRole(primaryRole(user?.roles, user?.role));
}

function sortInbox(items: InboxConversation[]): InboxConversation[] {
  return [...items].sort((a, b) => {
    const rank = (m: InboxConversation) => (m.pending ? 0 : m.ended ? 2 : 1);
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function playmateToInbox(match: MatchRequest): InboxConversation {
  const peer = match.fromPet;
  const pending = match.status === 'pending';
  const ended = Boolean(match.chatEnded);
  const preview = ended
    ? 'چت پایان یافته'
    : pending
      ? match.direction === 'incoming'
        ? 'درخواست همبازی جدید'
        : 'منتظر پاسخ درخواست'
      : match.chatSecure
        ? 'چت امن · همبازی'
        : `${peer.name} · همبازی`;

  return {
    key: `playmate:${match.id}`,
    kind: 'playmate',
    id: match.id,
    title: peer.ownerName || peer.name,
    preview,
    createdAt: match.createdAt,
    pending,
    ended,
    direction: match.direction === 'outgoing' ? 'outgoing' : 'incoming',
    canDecide: pending && match.direction === 'incoming',
    href: `/chats/${match.id}`,
    peerPet: peer,
  };
}

export function vetToInbox(
  c: VetConsultation,
  myUserId: number,
  mode: 'as_vet' | 'as_patient',
): InboxConversation | null {
  if (c.status === 'cancelled') return null;

  const asVet = c.vetUserId === myUserId;
  const asPatient = c.patientUserId === myUserId;
  if (mode === 'as_vet' && !asVet) return null;
  if (mode === 'as_patient' && !asPatient) return null;
  if (!asVet && !asPatient) return null;

  const pending = c.status === 'requested';
  const ended = c.status === 'completed';
  const direction: 'incoming' | 'outgoing' = mode === 'as_vet' ? 'incoming' : 'outgoing';

  const peerTitle =
    mode === 'as_vet'
      ? c.patientName?.trim() || (c.petName ? `بیمار · ${c.petName}` : `بیمار #${c.patientUserId}`)
      : c.vetName?.trim() || `پزشک #${c.vetUserId}`;

  const preview = pending
    ? mode === 'as_vet'
      ? 'درخواست مشاوره جدید'
      : 'منتظر پاسخ پزشک'
    : ended
      ? 'مشاوره پایان یافته'
      : c.petName
        ? `مشاوره · ${c.petName}`
        : 'مشاوره دامپزشک';

  return {
    key: `vet:${c.id}`,
    kind: 'vet',
    id: c.id,
    title: peerTitle,
    preview,
    createdAt: c.createdAt,
    pending,
    ended,
    direction,
    canDecide: pending && mode === 'as_vet',
    href: `/vet-chats/${c.id}`,
  };
}

/**
 * Role-scoped inbox:
 * - primary vet → only consultations as veterinarian
 * - any other primary role → playmate chats + consultations as patient
 * Never mixes vet-practice threads into owner view (or the reverse).
 */
export async function loadInboxConversations(
  myUserId: number,
  user?: User | null,
): Promise<InboxConversation[]> {
  const scope = inboxScopeForUser(user);

  if (scope === 'vet') {
    if (!userHasRole(user, 'vet')) return [];
    const rows = await listVetConsultations({ vetUserId: myUserId }).catch(
      () => [] as VetConsultation[],
    );
    const items: InboxConversation[] = [];
    for (const row of rows) {
      const item = vetToInbox(row, myUserId, 'as_vet');
      if (item) items.push(item);
    }
    return sortInbox(items);
  }

  const playmatePromise = listPlaydateRequests({ userId: myUserId }).then((rows) =>
    rows
      .filter((r) => {
        if (r.status === 'rejected' || r.status === 'cancelled') return false;
        const owns =
          r.toUserId === myUserId ||
          r.fromUserId === myUserId ||
          r.toPet?.ownerId === myUserId ||
          r.fromPet?.ownerId === myUserId;
        return owns;
      })
      .map((r) => playmateToInbox(playdateToMatchRequest(r, myUserId))),
  );

  const patientPromise = listVetConsultations({ patientUserId: myUserId }).catch(
    () => [] as VetConsultation[],
  );

  const [playmates, asPatient] = await Promise.all([playmatePromise, patientPromise]);

  const vetItems: InboxConversation[] = [];
  for (const row of asPatient) {
    const item = vetToInbox(row, myUserId, 'as_patient');
    if (item) vetItems.push(item);
  }

  return sortInbox([...playmates, ...vetItems]);
}

export async function acceptInboxItem(
  item: InboxConversation,
  myUserId: number,
  token?: string | null,
): Promise<void> {
  if (item.kind === 'playmate') {
    await updatePlaydateStatus(item.id, 'accepted', myUserId);
    return;
  }
  await acceptVetConsultation(item.id, token);
}

export async function rejectInboxItem(
  item: InboxConversation,
  myUserId: number,
  token?: string | null,
): Promise<void> {
  if (item.kind === 'playmate') {
    await updatePlaydateStatus(item.id, 'rejected', myUserId);
    return;
  }
  await rejectVetConsultation(item.id, token);
}
