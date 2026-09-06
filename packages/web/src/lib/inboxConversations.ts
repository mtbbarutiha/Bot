import type { VetConsultation } from '@petdate/shared';
import { userHasRole, type User } from '@petdate/shared';
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

export function vetToInbox(c: VetConsultation, myUserId: number): InboxConversation | null {
  if (c.status === 'cancelled') return null;

  const asVet = c.vetUserId === myUserId;
  const asPatient = c.patientUserId === myUserId;
  if (!asVet && !asPatient) return null;

  const pending = c.status === 'requested';
  const ended = c.status === 'completed';
  const direction: 'incoming' | 'outgoing' = asVet ? 'incoming' : 'outgoing';

  const peerTitle = asVet
    ? c.patientName?.trim() || (c.petName ? `بیمار · ${c.petName}` : `بیمار #${c.patientUserId}`)
    : c.vetName?.trim() || `پزشک #${c.vetUserId}`;

  const preview = pending
    ? direction === 'incoming'
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
    canDecide: pending && asVet,
    href: `/vet-chats/${c.id}`,
  };
}

/** فهرست یکپارچه همبازی + مشاوره برای صفحه گفتگوها */
export async function loadInboxConversations(
  myUserId: number,
  user?: User | null,
): Promise<InboxConversation[]> {
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

  const patientPromise = listVetConsultations({ patientUserId: myUserId }).catch(() => []);
  const vetPromise =
    user && userHasRole(user, 'vet')
      ? listVetConsultations({ vetUserId: myUserId }).catch(() => [])
      : Promise.resolve([] as VetConsultation[]);

  const [playmates, asPatient, asVet] = await Promise.all([
    playmatePromise,
    patientPromise,
    vetPromise,
  ]);

  const vetById = new Map<number, VetConsultation>();
  for (const row of [...asPatient, ...asVet]) {
    vetById.set(row.id, row);
  }

  const vetItems: InboxConversation[] = [];
  for (const row of vetById.values()) {
    const item = vetToInbox(row, myUserId);
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
