import { InlineKeyboard, Keyboard } from 'grammy';
import type { Context } from 'grammy';
import type { PetMedicalEntry, PetMedicalRecord, PetProfile, User } from '@petdate/shared';
import {
  addPetMedicalEntry,
  getPetMedical,
  getVetConsultation,
  listPets,
  updateVetConsultationStatus,
} from '../api-client';
import { getSession, upsertSession } from '../session';
import { getCtxUser, menuKeyboardFor } from './helpers';

export const VET_CHAT_BTNS = {
  end: '🔌 قطع چت',
  medical: '📋 پرونده پزشکی پت',
  addNote: '✍️ ثبت در پرونده',
} as const;

export function vetChatReplyKeyboard(isVet: boolean): Keyboard {
  const kb = new Keyboard().text(VET_CHAT_BTNS.end).row();
  if (isVet) {
    kb.text(VET_CHAT_BTNS.medical).row().text(VET_CHAT_BTNS.addNote);
  } else {
    kb.text(VET_CHAT_BTNS.medical);
  }
  return kb.resized().persistent();
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatMedicalRecord(
  pet: PetProfile,
  record: PetMedicalRecord,
  entries: PetMedicalEntry[]
): string {
  const lines = [
    `📋 <b>پرونده پزشکی — ${escapeHtml(pet.name)}</b>`,
    pet.species ? `گونه: ${escapeHtml(pet.species)}` : null,
    pet.breed ? `نژاد: ${escapeHtml(pet.breed)}` : null,
    '',
    `📝 یادداشت: ${escapeHtml(record.notes || '—')}`,
    `💉 واکسن‌ها: ${escapeHtml(record.vaccinations || '—')}`,
    `⚠️ آلرژی: ${escapeHtml(record.allergies || '—')}`,
    `🩺 بیماری مزمن: ${escapeHtml(record.chronicConditions || '—')}`,
    `📅 آخرین معاینه: ${escapeHtml(record.lastCheckup || '—')}`,
    `💊 دارو: ${escapeHtml(record.medications || '—')}`,
  ].filter((l): l is string => l != null);

  if (entries.length) {
    lines.push('', '<b>ثبت‌های بالینی:</b>');
    for (const e of entries.slice(0, 8)) {
      const who = e.authorName || `کاربر #${e.authorUserId}`;
      const when = e.createdAt?.slice(0, 16).replace('T', ' ') || '';
      lines.push(`• <i>${escapeHtml(when)}</i> — ${escapeHtml(who)}: ${escapeHtml(e.text)}`);
    }
  }
  return lines.join('\n');
}

export async function startVetChat(
  ctx: Context,
  consultId: number,
  vet: User,
  patient: User
): Promise<void> {
  if (!vet.telegramId || !patient.telegramId) {
    await ctx.reply('برای شروع چت، هر دو طرف باید از ربات استفاده کرده باشند.');
    return;
  }

  await upsertSession(String(vet.telegramId), {
    step: 'vet_chat',
    vetChatConsultId: consultId,
    vetChatPeerTelegramId: String(patient.telegramId),
    vetChatRole: 'vet',
    medicalNotePetId: undefined,
  });
  await upsertSession(String(patient.telegramId), {
    step: 'vet_chat',
    vetChatConsultId: consultId,
    vetChatPeerTelegramId: String(vet.telegramId),
    vetChatRole: 'patient',
    medicalNotePetId: undefined,
  });

  const vetIntro = [
    '💬 <b>چت با صاحب پت فعال شد</b>',
    '',
    `صاحب پت: <b>${escapeHtml(patient.name)}</b>`,
    'هر پیامی بفرستی مستقیم به صاحب پت می‌رسد.',
    '',
    `• ${VET_CHAT_BTNS.medical}`,
    `• ${VET_CHAT_BTNS.addNote}`,
    `• ${VET_CHAT_BTNS.end}`,
  ].join('\n');

  const patientIntro = [
    '💬 <b>چت با دامپزشک فعال شد</b>',
    '',
    `پزشک: <b>${escapeHtml(vet.name)}</b>`,
    'هر پیامی بفرستی مستقیم به پزشک می‌رسد.',
    '',
    `پایان چت: ${VET_CHAT_BTNS.end}`,
  ].join('\n');

  await ctx.reply(vetIntro, {
    parse_mode: 'HTML',
    reply_markup: vetChatReplyKeyboard(true),
  });

  try {
    await ctx.api.sendMessage(patient.telegramId, patientIntro, {
      parse_mode: 'HTML',
      reply_markup: vetChatReplyKeyboard(false),
    });
  } catch (err) {
    console.warn('notify patient chat start failed:', err);
  }
}

export async function handleVetChatEnd(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || (session.step !== 'vet_chat' && session.step !== 'vet_medical_note')) {
    return false;
  }

  const consultId = session.vetChatConsultId;
  const peerId = session.vetChatPeerTelegramId;
  const user = await getCtxUser(ctx);

  if (consultId) {
    try {
      await updateVetConsultationStatus(consultId, 'completed');
    } catch (err) {
      console.warn('complete consult on chat end failed:', err);
    }
  }

  await upsertSession(String(from.id), {
    step: 'ready',
    vetChatConsultId: undefined,
    vetChatPeerTelegramId: undefined,
    vetChatRole: undefined,
    medicalNotePetId: undefined,
  });

  if (peerId) {
    await upsertSession(peerId, {
      step: 'ready',
      vetChatConsultId: undefined,
      vetChatPeerTelegramId: undefined,
      vetChatRole: undefined,
      medicalNotePetId: undefined,
    });
    try {
      await ctx.api.sendMessage(peerId, '🔌 چت مشاوره قطع شد.');
    } catch {
      /* ignore */
    }
  }

  await ctx.reply('چت مشاوره پایان یافت.', {
    reply_markup: menuKeyboardFor(ctx, user),
  });
  return true;
}

async function showPetMedical(ctx: Context, petId: number, viewerId: number): Promise<void> {
  try {
    const data = await getPetMedical(petId, viewerId);
    await ctx.reply(formatMedicalRecord(data.pet, data.record, data.entries), {
      parse_mode: 'HTML',
    });
  } catch (err) {
    console.error('get medical failed:', err);
    await ctx.reply('دسترسی به پرونده ممکن نشد.');
  }
}

async function showMedicalForPatientPets(
  ctx: Context,
  patientUserId: number,
  viewer: User
): Promise<void> {
  let pets: PetProfile[] = [];
  try {
    pets = await listPets({ ownerId: patientUserId });
  } catch (err) {
    console.error('list pets for medical failed:', err);
    await ctx.reply('خطا در دریافت لیست پت‌ها.');
    return;
  }

  if (!pets.length) {
    await ctx.reply('این بیمار هنوز پتی ثبت نکرده.');
    return;
  }

  if (pets.length === 1) {
    await showPetMedical(ctx, pets[0]!.id, viewer.id);
    return;
  }

  const kb = new InlineKeyboard();
  for (const pet of pets.slice(0, 12)) {
    kb.text(`🐾 ${pet.name}`, `vchat:med:${pet.id}`).row();
  }
  await ctx.reply('کدام پت؟', { reply_markup: kb });
}

export async function handleVetChatMedicalView(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session?.vetChatConsultId) return false;
  if (session.step !== 'vet_chat' && session.step !== 'vet_medical_note') return false;

  const user = await getCtxUser(ctx);
  if (!user) return true;

  const consult = await getVetConsultation(session.vetChatConsultId);
  if (!consult) {
    await ctx.reply('مشاوره پیدا نشد.');
    return true;
  }

  if (consult.petId) {
    await showPetMedical(ctx, consult.petId, user.id);
    return true;
  }

  await showMedicalForPatientPets(ctx, consult.patientUserId, user);
  return true;
}

export async function handleVetChatMedicalPetPick(ctx: Context, petId: number): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.answerCallbackQuery({ text: 'اول /start', show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();
  await showPetMedical(ctx, petId, user.id);
}

export async function handleVetChatAddNoteStart(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'vet_chat' || session.vetChatRole !== 'vet') {
    return false;
  }
  if (!session.vetChatConsultId) return false;

  const consult = await getVetConsultation(session.vetChatConsultId);
  if (!consult) {
    await ctx.reply('مشاوره پیدا نشد.');
    return true;
  }

  let pets: PetProfile[] = [];
  try {
    pets = await listPets({ ownerId: consult.patientUserId });
  } catch {
    await ctx.reply('لیست پت‌ها در دسترس نیست.');
    return true;
  }

  if (!pets.length) {
    await ctx.reply('بیمار پتی ندارد؛ اول از او بخواه پت ثبت کند.');
    return true;
  }

  if (pets.length === 1) {
    await upsertSession(String(from.id), {
      step: 'vet_medical_note',
      medicalNotePetId: pets[0]!.id,
    });
    await ctx.reply(
      `✍️ مورد بالینی برای «${pets[0]!.name}» را بنویس و بفرست.\nانصراف با: ${VET_CHAT_BTNS.end}`,
      { reply_markup: vetChatReplyKeyboard(true) }
    );
    return true;
  }

  const kb = new InlineKeyboard();
  for (const pet of pets.slice(0, 12)) {
    kb.text(`✍️ ${pet.name}`, `vchat:note:${pet.id}`).row();
  }
  await ctx.reply('ثبت مورد برای کدام پت؟', { reply_markup: kb });
  return true;
}

export async function handleVetChatNotePetPick(ctx: Context, petId: number): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  const session = await getSession(String(from.id));
  if (!session || session.vetChatRole !== 'vet') {
    await ctx.answerCallbackQuery({ text: 'فقط دامپزشک', show_alert: true });
    return;
  }
  await upsertSession(String(from.id), {
    step: 'vet_medical_note',
    medicalNotePetId: petId,
  });
  await ctx.answerCallbackQuery();
  await ctx.reply('متن مورد بالینی را بنویس و بفرست (تشخیص، دارو، توصیه…).', {
    reply_markup: vetChatReplyKeyboard(true),
  });
}

export async function handleVetChatNoteText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || session.step !== 'vet_medical_note' || !session.medicalNotePetId) {
    return false;
  }

  if ((Object.values(VET_CHAT_BTNS) as string[]).includes(text)) {
    return false;
  }

  const user = await getCtxUser(ctx);
  if (!user) return true;

  try {
    await addPetMedicalEntry(session.medicalNotePetId, {
      authorUserId: user.id,
      text,
      consultId: session.vetChatConsultId,
    });
  } catch (err) {
    console.error('add medical entry failed:', err);
    await ctx.reply('ثبت در پرونده ناموفق بود.');
    return true;
  }

  await upsertSession(String(from.id), {
    step: 'vet_chat',
    medicalNotePetId: undefined,
  });

  await ctx.reply('✅ مورد در پرونده پزشکی پت ثبت شد. می‌تونی ادامه چت بدی.', {
    reply_markup: vetChatReplyKeyboard(true),
  });

  if (session.vetChatPeerTelegramId) {
    try {
      await ctx.api.sendMessage(
        session.vetChatPeerTelegramId,
        `📋 پزشک موردی در پرونده پزشکی پت ثبت کرد:\n«${text.slice(0, 400)}»`
      );
    } catch {
      /* ignore */
    }
  }
  return true;
}

export async function handleVetChatRelay(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  const session = await getSession(String(from.id));
  if (!session || !session.vetChatPeerTelegramId) return false;
  if (session.step !== 'vet_chat' && session.step !== 'vet_medical_note') return false;

  const text = ctx.message?.text?.trim();
  if (text) {
    if (text === VET_CHAT_BTNS.end) return handleVetChatEnd(ctx);
    if (text === VET_CHAT_BTNS.medical) return handleVetChatMedicalView(ctx);
    if (text === VET_CHAT_BTNS.addNote) return handleVetChatAddNoteStart(ctx);
    if (session.step === 'vet_medical_note') return handleVetChatNoteText(ctx, text);
  }

  if (session.step !== 'vet_chat') return false;

  const peer = session.vetChatPeerTelegramId;
  const roleLabel = session.vetChatRole === 'vet' ? '🩺 پزشک' : '👤 صاحب پت';
  const name = from.first_name || '';

  try {
    if (ctx.message?.photo?.length) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1]!.file_id;
      const caption = ctx.message.caption
        ? `${roleLabel} ${name}:\n${ctx.message.caption}`
        : `${roleLabel} ${name} عکس فرستاد`;
      await ctx.api.sendPhoto(peer, fileId, { caption });
      return true;
    }
    if (ctx.message?.document) {
      await ctx.api.sendDocument(peer, ctx.message.document.file_id, {
        caption: `${roleLabel} ${name} فایل فرستاد`,
      });
      return true;
    }
    if (ctx.message?.voice) {
      await ctx.api.sendVoice(peer, ctx.message.voice.file_id, {
        caption: `${roleLabel} ${name}`,
      });
      return true;
    }
    if (text) {
      await ctx.api.sendMessage(
        peer,
        `${roleLabel} <b>${escapeHtml(name)}</b>:\n${escapeHtml(text)}`,
        { parse_mode: 'HTML' }
      );
      return true;
    }
  } catch (err) {
    console.warn('vet chat relay failed:', err);
    await ctx.reply('ارسال به طرف مقابل ناموفق بود. ممکن است ربات را بلاک کرده باشد.');
    return true;
  }
  return false;
}
