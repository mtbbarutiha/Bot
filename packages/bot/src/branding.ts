import fs from 'fs';
import path from 'path';
import type { Api, Context } from 'grammy';
import { InputFile } from 'grammy';

const ASSETS = path.join(__dirname, '..', 'assets');
export const BOT_PROFILE_JPG = path.join(ASSETS, 'bot-profile.jpg');
export const WELCOME_LOGO_JPG = path.join(ASSETS, 'welcome-logo.jpg');

export function logoExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/** Set bot profile photo + descriptions on boot. */
export async function applyBotBranding(api: Api): Promise<void> {
  if (logoExists(BOT_PROFILE_JPG)) {
    try {
      await api.setMyProfilePhoto({
        type: 'static',
        photo: new InputFile(BOT_PROFILE_JPG),
      });
      console.log('   Branding: profile photo set');
    } catch (err) {
      console.warn('   Branding: profile photo skipped —', (err as Error).message);
    }
  }

  try {
    await api.setMyDescription(
      '🐾 petdate — پیدا کردن همبازی برای پت، مشاوره دامپزشک و خدمات پت'
    );
    await api.setMyShortDescription('🐾 petdate — همبازی برای پت');
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
  await ctx.replyWithPhoto(new InputFile(WELCOME_LOGO_JPG), {
    caption,
    parse_mode: 'Markdown',
    ...extra,
  });
  return true;
}
