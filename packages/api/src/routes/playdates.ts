import { Router } from 'express';
import type { PlaydateStatus } from '@petdate/shared';
import { dbService } from '../db';
import { notifyPlaydateRequestTelegram } from '../services/telegram-playdate-notify';
import {
  notifyPlaydateChatEndedTelegram,
  notifyPlaydateChatSecureTelegram,
  notifyPlaydateChatTelegram,
  resolveTelegramFile,
} from '../services/telegram-chat-notify';
import { startOwnerChatFromApi } from '../services/telegram-owner-chat-start';

const VALID_STATUSES: PlaydateStatus[] = ['pending', 'accepted', 'rejected', 'cancelled'];

export const playdatesRouter = Router();

function peerTelegramIds(playdate: NonNullable<ReturnType<typeof dbService.getPlaydateRequest>>, exceptUserId?: number): string[] {
  const ids: string[] = [];
  for (const userId of [playdate.fromUserId, playdate.toUserId]) {
    if (!userId || userId === exceptUserId) continue;
    const user = dbService.getUserById(userId);
    if (user?.telegramId) ids.push(user.telegramId);
  }
  // Fallback via pets if toUserId missing
  if (!playdate.toUserId) {
    const ownerId = dbService.getPet(playdate.toPetId)?.ownerId;
    if (ownerId && ownerId !== exceptUserId) {
      const user = dbService.getUserById(ownerId);
      if (user?.telegramId) ids.push(user.telegramId);
    }
  }
  return [...new Set(ids)];
}


function enrichPlaydate(req: ReturnType<typeof dbService.getPlaydateRequest>) {
  if (!req) return null;
  return {
    ...req,
    fromPet: dbService.getPet(req.fromPetId) ?? undefined,
    toPet: dbService.getPet(req.toPetId) ?? undefined,
  };
}

function requireParticipant(playdateId: number, userId: number) {
  const playdate = dbService.getPlaydateRequest(playdateId);
  if (!playdate) return { error: 'not_found' as const };
  if (!dbService.isPlaydateParticipant(playdate, userId)) {
    return { error: 'forbidden' as const, playdate };
  }
  return { playdate };
}

/** Fire-and-forget Telegram notify to recipient (bot-equivalent). */
async function notifyNewPlaydateTelegram(
  request: NonNullable<ReturnType<typeof enrichPlaydate>>
): Promise<boolean> {
  if (!request.toUserId || !request.fromPet || !request.toPet) return false;
  const owner = dbService.getUserById(request.toUserId);
  if (!owner?.telegramId) return false;
  return notifyPlaydateRequestTelegram({
    requestId: request.id,
    toTelegramId: owner.telegramId,
    fromPet: request.fromPet,
    toPetName: request.toPet.name,
  });
}

async function openOwnerChatOnAccept(
  request: NonNullable<ReturnType<typeof enrichPlaydate>>,
  previousStatus: PlaydateStatus
): Promise<boolean> {
  if (request.status !== 'accepted' || previousStatus === 'accepted') return false;
  const fromUser = dbService.getUserById(request.fromUserId);
  const toUserId =
    request.toUserId ?? dbService.getPet(request.toPetId)?.ownerId ?? undefined;
  const toUser = toUserId ? dbService.getUserById(toUserId) : null;
  if (!fromUser || !toUser) return false;

  // Recipient (toUser) is the accepter in the normal flow.
  return startOwnerChatFromApi({
    playdateId: request.id,
    accepter: toUser,
    requester: fromUser,
    fromPetName: request.fromPet?.name,
    toPetName: request.toPet?.name,
    fromPetId: request.fromPetId,
    toPetId: request.toPetId,
  });
}

playdatesRouter.get('/', (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const petId = req.query.petId ? Number(req.query.petId) : undefined;
  const status = req.query.status as PlaydateStatus | undefined;

  const requests = dbService
    .listPlaydateRequests({ userId, petId, status })
    .map((r) => enrichPlaydate(r)!);
  res.json(requests);
});

playdatesRouter.get('/active-owner-chat', (req, res) => {
  const telegramId = String(req.query.telegramId ?? '').trim();
  if (!telegramId) {
    res.status(400).json({ error: 'telegramId الزامی است' });
    return;
  }
  const user = dbService.getUserByTelegramId(telegramId);
  if (!user) {
    res.json(null);
    return;
  }

  const accepted = dbService.listPlaydateRequests({ userId: user.id, status: 'accepted' });
  // newest first
  const sorted = [...accepted].sort((a, b) => b.id - a.id);
  for (const pd of sorted) {
    const fromUser = dbService.getUserById(pd.fromUserId);
    const toUserId = pd.toUserId ?? dbService.getPet(pd.toPetId)?.ownerId;
    const toUser = toUserId ? dbService.getUserById(toUserId) : null;
    if (!fromUser?.telegramId || !toUser?.telegramId) continue;
    if (fromUser.telegramId.startsWith('fake_') || toUser.telegramId.startsWith('fake_')) continue;

    const iAmFrom = fromUser.id === user.id;
    const peer = iAmFrom ? toUser : fromUser;
    res.json({
      playdateId: pd.id,
      peerTelegramId: peer.telegramId,
      peerUserId: peer.id,
      myPetId: iAmFrom ? pd.fromPetId : pd.toPetId,
      peerPetId: iAmFrom ? pd.toPetId : pd.fromPetId,
      peerName: peer.name,
    });
    return;
  }
  res.json(null);
});

playdatesRouter.get('/:id/messages', (req, res) => {
  const playdateId = Number(req.params.id);
  const userId = Number(req.query.userId);
  if (!Number.isFinite(playdateId) || !Number.isFinite(userId)) {
    res.status(400).json({ error: 'شناسه درخواست و userId الزامی هستند' });
    return;
  }

  const gate = requireParticipant(playdateId, userId);
  if (gate.error === 'not_found') {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  if (gate.error === 'forbidden') {
    res.status(403).json({ error: 'دسترسی به این چت مجاز نیست' });
    return;
  }

  const afterId = req.query.afterId ? Number(req.query.afterId) : undefined;
  const messages = dbService.listPlaydateChatMessages(playdateId, {
    afterId: Number.isFinite(afterId) ? afterId : undefined,
  });
  res.json(messages);
});

playdatesRouter.post('/:id/messages', async (req, res) => {
  const playdateId = Number(req.params.id);
  const senderUserId = Number(req.body?.senderUserId ?? req.body?.userId);
  const text = typeof req.body?.text === 'string' ? req.body.text : '';
  const mediaKind = typeof req.body?.mediaKind === 'string' ? req.body.mediaKind : undefined;
  const telegramFileId =
    typeof req.body?.telegramFileId === 'string' ? req.body.telegramFileId : undefined;
  const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : undefined;
  const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName : undefined;
  /** When true, skip Telegram fan-out (bot already delivered the line). */
  const skipTelegram = Boolean(req.body?.skipTelegram);

  if (!Number.isFinite(playdateId) || !Number.isFinite(senderUserId)) {
    res.status(400).json({ error: 'شناسه درخواست و senderUserId الزامی هستند' });
    return;
  }

  const gate = requireParticipant(playdateId, senderUserId);
  if (gate.error === 'not_found') {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  if (gate.error === 'forbidden') {
    res.status(403).json({ error: 'دسترسی به این چت مجاز نیست' });
    return;
  }
  if (gate.playdate.status !== 'accepted') {
    res.status(409).json({ error: 'چت فقط بعد از قبول درخواست فعال است' });
    return;
  }
  if (gate.playdate.chatEnded) {
    res.status(409).json({ error: 'این چت قطع شده است' });
    return;
  }

  try {
    const message = dbService.createPlaydateChatMessage({
      playdateId,
      senderUserId,
      text,
      mediaKind,
      telegramFileId,
      mimeType,
      fileName,
    });

    if (!skipTelegram) {
      const playdate = gate.playdate;
      let peerUserId =
        playdate.fromUserId === senderUserId ? playdate.toUserId : playdate.fromUserId;
      if (!peerUserId) {
        const peerPetId =
          playdate.fromUserId === senderUserId ? playdate.toPetId : playdate.fromPetId;
        peerUserId = dbService.getPet(peerPetId)?.ownerId;
      }
      const peer = peerUserId ? dbService.getUserById(peerUserId) : null;
      const sender = dbService.getUserById(senderUserId);
      if (peer?.telegramId) {
        void notifyPlaydateChatTelegram({
          toTelegramId: peer.telegramId,
          senderName: sender?.name || 'همبازی',
          text: message.text,
          playdateId,
          protectContent: Boolean(playdate.chatSecure),
        });
      }
    }

    res.status(201).json(message);
  } catch (err) {
    if (err instanceof Error && err.message === 'EMPTY_TEXT') {
      res.status(400).json({ error: 'متن پیام خالی است' });
      return;
    }
    if (err instanceof Error && err.message === 'TEXT_TOO_LONG') {
      res.status(400).json({ error: 'پیام خیلی طولانی است' });
      return;
    }
    throw err;
  }
});


playdatesRouter.get('/:id/messages/:messageId/file', async (req, res) => {
  const playdateId = Number(req.params.id);
  const messageId = Number(req.params.messageId);
  const userId = Number(req.query.userId);
  if (!Number.isFinite(playdateId) || !Number.isFinite(messageId) || !Number.isFinite(userId)) {
    res.status(400).json({ error: 'شناسه درخواست، پیام و userId الزامی هستند' });
    return;
  }

  const gate = requireParticipant(playdateId, userId);
  if (gate.error === 'not_found') {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  if (gate.error === 'forbidden') {
    res.status(403).json({ error: 'دسترسی به این چت مجاز نیست' });
    return;
  }

  const message = dbService.getPlaydateChatMessage(messageId);
  if (!message || message.playdateId !== playdateId || !message.telegramFileId) {
    res.status(404).json({ error: 'فایل پیدا نشد' });
    return;
  }

  const file = await resolveTelegramFile(message.telegramFileId);
  if (!file) {
    res.status(502).json({ error: 'دریافت فایل از تلگرام ناموفق بود' });
    return;
  }

  try {
    const upstream = await fetch(file.downloadUrl);
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ error: 'دانلود فایل ناموفق بود' });
      return;
    }
    const contentType =
      message.mimeType ||
      upstream.headers.get('content-type') ||
      'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (message.fileName) {
      res.setHeader(
        'Content-Disposition',
        `inline; filename*=UTF-8''${encodeURIComponent(message.fileName)}`
      );
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.warn('proxy telegram file failed:', (err as Error).message);
    res.status(502).json({ error: 'پروکسی فایل ناموفق بود' });
  }
});

playdatesRouter.post('/:id/end-chat', async (req, res) => {
  const playdateId = Number(req.params.id);
  const userId = Number(req.body?.userId);
  if (!Number.isFinite(playdateId) || !Number.isFinite(userId)) {
    res.status(400).json({ error: 'شناسه درخواست و userId الزامی هستند' });
    return;
  }

  const gate = requireParticipant(playdateId, userId);
  if (gate.error === 'not_found') {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  if (gate.error === 'forbidden') {
    res.status(403).json({ error: 'دسترسی به این چت مجاز نیست' });
    return;
  }
  if (gate.playdate.status !== 'accepted') {
    res.status(409).json({ error: 'فقط چت درخواست پذیرفته‌شده قابل قطع است' });
    return;
  }

  const updated = dbService.endPlaydateChat(playdateId);
  for (const telegramId of peerTelegramIds(gate.playdate, userId)) {
    void notifyPlaydateChatEndedTelegram({ toTelegramId: telegramId });
  }
  res.json({ ok: true, playdate: enrichPlaydate(updated) });
});

playdatesRouter.patch('/:id/chat-secure', async (req, res) => {
  const playdateId = Number(req.params.id);
  const userId = Number(req.body?.userId);
  const secure = Boolean(req.body?.secure);
  if (!Number.isFinite(playdateId) || !Number.isFinite(userId)) {
    res.status(400).json({ error: 'شناسه درخواست و userId الزامی هستند' });
    return;
  }

  const gate = requireParticipant(playdateId, userId);
  if (gate.error === 'not_found') {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  if (gate.error === 'forbidden') {
    res.status(403).json({ error: 'دسترسی به این چت مجاز نیست' });
    return;
  }
  if (gate.playdate.status !== 'accepted') {
    res.status(409).json({ error: 'چت امن فقط برای درخواست پذیرفته‌شده فعال است' });
    return;
  }
  if (gate.playdate.chatEnded) {
    res.status(409).json({ error: 'این چت قطع شده است' });
    return;
  }

  const updated = dbService.setPlaydateChatSecure(playdateId, secure);
  for (const telegramId of peerTelegramIds(gate.playdate, userId)) {
    void notifyPlaydateChatSecureTelegram({ toTelegramId: telegramId, secure });
  }
  res.json(enrichPlaydate(updated));
});

playdatesRouter.delete('/:id/messages', (req, res) => {
  const playdateId = Number(req.params.id);
  const userId = Number(req.query.userId ?? req.body?.userId);
  if (!Number.isFinite(playdateId) || !Number.isFinite(userId)) {
    res.status(400).json({ error: 'شناسه درخواست و userId الزامی هستند' });
    return;
  }

  const gate = requireParticipant(playdateId, userId);
  if (gate.error === 'not_found') {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  if (gate.error === 'forbidden') {
    res.status(403).json({ error: 'دسترسی به این چت مجاز نیست' });
    return;
  }

  const cleared = dbService.clearPlaydateChatMessages(playdateId);
  res.json({ ok: true, cleared });
});

playdatesRouter.get('/:id', (req, res) => {
  const request = enrichPlaydate(dbService.getPlaydateRequest(Number(req.params.id)));
  if (!request) {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  res.json(request);
});

playdatesRouter.post('/', async (req, res) => {
  const { fromPetId, toPetId, fromUserId, toUserId, message, scheduledAt, location } = req.body;

  if (!fromPetId || !toPetId || !fromUserId) {
    res.status(400).json({ error: 'fromPetId، toPetId و fromUserId الزامی هستند' });
    return;
  }

  const fromPet = dbService.getPet(Number(fromPetId));
  const toPet = dbService.getPet(Number(toPetId));
  if (!fromPet || !toPet) {
    res.status(404).json({ error: 'پت مبدأ یا مقصد پیدا نشد' });
    return;
  }

  if (dbService.hasPendingPlaydate(Number(fromPetId), Number(toPetId))) {
    const existing = dbService
      .listPlaydateRequests({ userId: Number(fromUserId), status: 'pending' })
      .find((r) => r.fromPetId === Number(fromPetId) && r.toPetId === Number(toPetId));
    res.status(200).json({ ...enrichPlaydate(existing ?? null), telegramNotified: false });
    return;
  }

  const request = dbService.createPlaydateRequest({
    fromPetId: Number(fromPetId),
    toPetId: Number(toPetId),
    fromUserId: Number(fromUserId),
    toUserId: toUserId ? Number(toUserId) : toPet.ownerId,
    message,
    scheduledAt,
    location,
  });

  const enriched = enrichPlaydate(request)!;
  const telegramNotified = await notifyNewPlaydateTelegram(enriched);
  res.status(201).json({ ...enriched, telegramNotified });
});

playdatesRouter.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const actorUserId = Number(req.body?.userId ?? req.body?.actorUserId);
  /** Bot already runs startOwnerChat — pass false to avoid duplicate intros. */
  const startOwnerChat = req.body?.startOwnerChat !== false;
  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'وضعیت نامعتبر است' });
    return;
  }
  if (!Number.isFinite(actorUserId)) {
    res.status(400).json({ error: 'userId الزامی است' });
    return;
  }

  const id = Number(req.params.id);
  const previous = dbService.getPlaydateRequest(id);
  if (!previous) {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }

  const recipientId =
    previous.toUserId ?? dbService.getPet(previous.toPetId)?.ownerId ?? undefined;
  const isRecipient = recipientId === actorUserId;
  const isSender = previous.fromUserId === actorUserId;

  // Accept/reject: ONLY the recipient (owner of toPet) may confirm.
  if (status === 'accepted' || status === 'rejected') {
    if (!isRecipient) {
      res.status(403).json({
        error: 'فقط گیرندهٔ درخواست می‌تواند قبول یا رد کند',
      });
      return;
    }
    if (previous.status !== 'pending') {
      res.status(409).json({ error: 'این درخواست قبلاً پاسخ داده شده است' });
      return;
    }
  } else if (status === 'cancelled') {
    if (!isRecipient && !isSender) {
      res.status(403).json({ error: 'اجازه لغو این درخواست را ندارید' });
      return;
    }
  } else if (!isRecipient && !isSender) {
    res.status(403).json({ error: 'اجازه تغییر این درخواست را ندارید' });
    return;
  }

  const updated = enrichPlaydate(dbService.updatePlaydateStatus(id, status));
  if (!updated) {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }

  let ownerChatStarted = false;
  // Only after the recipient accepts — never when sender self-accepts.
  if (startOwnerChat && isRecipient) {
    ownerChatStarted = await openOwnerChatOnAccept(updated, previous.status);
  }

  res.json({ ...updated, ownerChatStarted });
});
