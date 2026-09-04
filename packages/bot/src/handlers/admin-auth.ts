import type { Context } from 'grammy';
import { isTelegramAdmin } from '../config';
import { getSession } from '../session';

/** ID در env یا ورود با رمز در سشن */
export async function isAdminAuthorized(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;
  if (isTelegramAdmin(from.id)) return true;
  const session = await getSession(String(from.id));
  return Boolean(session?.adminAuthed);
}

export async function requireAdminAuth(ctx: Context): Promise<boolean> {
  if (await isAdminAuthorized(ctx)) return true;
  await ctx.reply('این بخش فقط برای ادمین است.');
  return false;
}
