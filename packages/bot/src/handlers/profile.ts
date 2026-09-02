import type { Context } from 'grammy';
import type { UserRole } from '@petdate/shared';
import { ONBOARDING_STATUS_LABELS, USER_ROLE_LABELS } from '@petdate/shared';
import { listPets } from '../api-client';
import { mainMenuKeyboard } from '../keyboards';
import { getCtxUser } from './start';

export async function handleProfile(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const pets = user.id ? await listPets({ ownerId: user.id }) : [];
  const roleLabel = user.role ? USER_ROLE_LABELS[user.role as UserRole] : '—';
  const onboardingLabel = user.onboarding ? ONBOARDING_STATUS_LABELS[user.onboarding] : '—';

  const lines = [
    '👤 **پروفایل**',
    '',
    `نام: ${user.name}`,
    user.username ? `@${user.username}` : '',
    `نقش: ${roleLabel}`,
    `وضعیت: ${onboardingLabel}`,
    `پت‌ها: ${pets.length}`,
  ].filter(Boolean);

  await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() });
}
