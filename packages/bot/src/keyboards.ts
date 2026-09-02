import { InlineKeyboard } from 'grammy';
import { USER_ROLE_LABELS, USER_ROLES } from '@petdate/shared';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

export function roleKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  USER_ROLES.forEach((role, index) => {
    kb.text(USER_ROLE_LABELS[role], `role:${role}`);
    if (index % 2 === 1) kb.row();
  });
  return kb;
}

export function webAppKeyboard(webUrl: string): InlineKeyboard | undefined {
  if (!isTelegramInlineUrl(webUrl)) return undefined;
  return new InlineKeyboard().url('🌐 ادامه در petdate', webUrl);
}

export function exploreKeyboard(webUrl?: string): InlineKeyboard | undefined {
  const base = webUrl ?? effectiveWebUrl();
  if (!isTelegramInlineUrl(base)) return undefined;

  return new InlineKeyboard()
    .url('🔍 کشف همبازی‌ها', `${base}/explore`)
    .row()
    .url('➕ ثبت پت', `${base}/onboarding/pet`)
    .row()
    .url('🩺 کلینیک‌ها', `${base}/clinics`)
    .row()
    .url('👤 پروفایل', `${base}/profile`);
}

export function profileLinksKeyboard(telegramId: string, webUrl?: string): InlineKeyboard | undefined {
  const base = webUrl ?? effectiveWebUrl();
  if (!isTelegramInlineUrl(base)) return undefined;

  const profileUrl = `${base}/profile?from=telegram&tg=${telegramId}`;
  const onboardingUrl = `${base}/onboarding/role?from=telegram&tg=${telegramId}`;

  return new InlineKeyboard()
    .url('🌐 تکمیل پروفایل', profileUrl)
    .row()
    .url('📝 ویزارد نقش', onboardingUrl);
}
