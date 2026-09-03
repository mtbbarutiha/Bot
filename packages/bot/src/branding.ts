import fs from 'fs';
import path from 'path';
import type { Api, Context } from 'grammy';
import { InputFile } from 'grammy';
import { BRAND } from '@petdate/shared';

const ASSETS = path.join(__dirname, '..', 'assets');
export const BOT_PROFILE_JPG = path.join(ASSETS, 'bot-profile.jpg');
export const WELCOME_LOGO_JPG = path.join(ASSETS, 'welcome-logo.jpg');

export function logoExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/** Set bot name, profile photo, and descriptions on boot. */
export async function applyBotBranding(api: Api): Promise<void> {
  // نام را هر بار ست نکن — محدودیت 429 تلگرام
  try {
    await api.setMyDescription(BRAND?.descriptionFa ?? '🐾 petdate — همبازی برای پت');
    await api.setMyShortDescription(BRAND?.shortDescriptionFa ?? '🐾 petdate — همبازی برای پت');
    console.log('   Branding: description set');
  } catch (err) {
    console.warn('   Branding: description skipped —', (err as Error).message);
  }
}

/** Send branded welcome logo photo. Returns true if sent. */
export async function sendWelcomeLogo(
  ctx: Context,
  caption: string,
  extra?: Record<string, unknown>
): Promise<boolean> {
  if (!logoExists(WELCOME_LOGO_JPG)) return false;
  try {
    await ctx.replyWithPhoto(new InputFile(WELCOME_LOGO_JPG), {
      caption,
      parse_mode: 'Markdown',
      ...extra,
    });
    return true;
  } catch (err) {
    console.warn('welcome logo markdown failed, retry plain:', (err as Error).message);
    try {
      await ctx.replyWithPhoto(new InputFile(WELCOME_LOGO_JPG), {
        caption: caption.replace(/\*/g, '').replace(/_/g, ''),
        ...extra,
      });
      return true;
    } catch (err2) {
      console.warn('welcome logo failed:', (err2 as Error).message);
      return false;
    }
  }
}
