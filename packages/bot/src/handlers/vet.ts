import type { Context } from 'grammy';
import type { VetConsultation } from '@petdate/shared';
import { userHasRole } from '@petdate/shared';
import { listVetConsultations } from '../api-client';
import { mainMenuKeyboard } from '../keyboards';
import { getCtxUser, menuKeyboardFor } from './helpers';

const STATUS_FA: Record<string, string> = {
  requested: 'درخواست‌شده',
  active: 'فعال',
  completed: 'انجام‌شده',
  cancelled: 'لغو شده',
};

function formatConsultLine(c: VetConsultation, index: number): string {
  const patient = c.patientName?.trim() || `بیمار #${c.patientUserId}`;
  const petBits = [c.petName, c.petBreed || c.petSpecies].filter(Boolean).join(' · ');
  const city = c.patientCity ? ` · ${c.patientCity}` : '';
  const status = STATUS_FA[c.status] ?? c.status;
  const date = c.createdAt ? c.createdAt.slice(0, 10) : '—';
  const petPart = petBits ? ` — پت: ${petBits}` : '';
  return `${index + 1}. ${patient}${city}${petPart}\n   وضعیت: ${status} · ${date}`;
}

/** لیست بیمارانی که از این دامپزشک مشاوره گرفته‌اند */
export async function handleVetPatients(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  if (!userHasRole(user, 'vet')) {
    await ctx.reply('این بخش مخصوص دامپزشکان است.', {
      reply_markup: menuKeyboardFor(ctx, user),
    });
    return;
  }

  try {
    const consultations = await listVetConsultations(user.id);
    if (!consultations.length) {
      await ctx.reply(
        [
          '📋 **بیماران / مشاوره‌ها**',
          '',
          'هنوز بیماری که از شما مشاوره گرفته باشد ثبت نشده.',
          'وقتی مشاوره‌ای انجام شود، اینجا لیست بیماران را می‌بینی.',
        ].join('\n'),
        {
          parse_mode: 'Markdown',
          reply_markup: menuKeyboardFor(ctx, user),
        }
      );
      return;
    }

    // یک ردیف به‌ازای هر بیمار یکتا (آخرین مشاوره)
    const byPatient = new Map<number, VetConsultation>();
    for (const c of consultations) {
      if (!byPatient.has(c.patientUserId)) byPatient.set(c.patientUserId, c);
    }
    const patients = [...byPatient.values()];

    const lines = [
      '📋 **بیماران / مشاوره‌ها**',
      '',
      `تعداد بیماران: ${patients.length}`,
      '',
      ...patients.map((c, i) => formatConsultLine(c, i)),
    ];

    await ctx.reply(lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: menuKeyboardFor(ctx, user),
    });
  } catch (err) {
    console.error('vet patients list failed:', err);
    await ctx.reply('فعلاً لیست بیماران در دسترس نیست. کمی بعد دوباره امتحان کن.', {
      reply_markup: menuKeyboardFor(ctx, user),
    });
  }
}
