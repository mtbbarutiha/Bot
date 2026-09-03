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
  try {
    await api.setMyName(BRAND.botTitle);
    console.log('   Branding: name set →', BRAND.botTitle);
  } catch (err) {
    console.warn('   Branding: name skipped —', (err as Error).message);
  }

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
    await api.setMyDescription(BRAND.descriptionFa);
    await api.setMyShortDescription(BRAND.shortDescriptionFa);
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
  await ctx.replyWithPhoto(new InputFile(WELCOME_LOGO_JPG), {
    caption,
    parse_mode: 'Markdown',
    ...extra,
  });
  return true;
}
