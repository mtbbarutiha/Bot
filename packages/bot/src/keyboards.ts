import { InlineKeyboard } from 'grammy';
import { USER_ROLE_LABELS, USER_ROLES } from '@petdate/shared';

export function roleKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard();
  USER_ROLES.forEach((role, index) => {
    kb.text(USER_ROLE_LABELS[role], `role:${role}`);
    if (index % 2 === 1) kb.row();
  });
  return kb;
}

export function webAppKeyboard(webUrl: string): InlineKeyboard {
  return new InlineKeyboard().url('🌐 ادامه در petdate', webUrl);
}

export function exploreKeyboard(webUrl: string): InlineKeyboard {
  return new InlineKeyboard()
    .url('🔍 کشف همبازی‌ها', `${webUrl}/explore`)
    .row()
    .url('➕ ثبت پت', `${webUrl}/add-pet`);
}
