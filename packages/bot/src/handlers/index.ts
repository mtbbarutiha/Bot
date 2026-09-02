import type { Bot, Context } from 'grammy';
import type { UserRole } from '@petdate/shared';
import { MENU_LABELS } from '../keyboards';
import { handleExplore, handleExploreBack, handleExplorePet } from './explore';
import {
  handleAddPetCommand,
  handleSpeciesSelect,
  handleWizardSkip,
  handleWizardText,
} from './wizard';
import {
  handleMyPets,
  handlePlaydateAction,
  handlePlaydateAsk,
  handlePlaydateCancel,
  handlePlaydateFrom,
  handlePlaydateSend,
  handleRequests,
} from './playdates';
import { handleProfile } from './profile';
import { handleCancel, handleHelp, handleRoleSelect, handleStart } from './start';

export function registerHandlers(bot: Bot): void {
  bot.command('start', handleStart);
  bot.command('menu', async (ctx) => {
    const { mainMenuKeyboard } = await import('../keyboards');
    await ctx.reply('منوی petdate 👇', { reply_markup: mainMenuKeyboard() });
  });
  bot.command('help', handleHelp);
  bot.command('cancel', handleCancel);
  bot.command('explore', (ctx) => handleExplore(ctx));
  bot.command('pets', handleMyPets);
  bot.command('requests', handleRequests);
  bot.command('profile', handleProfile);
  bot.command('addpet', handleAddPetCommand);

  bot.callbackQuery(/^role:(.+)$/, async (ctx) => {
    try {
      await handleRoleSelect(ctx, ctx.match![1] as UserRole);
    } catch (err) {
      console.error('Role selection failed:', err);
      await ctx.answerCallbackQuery({ text: 'خطا. دوباره /start بزن.', show_alert: true });
    }
  });

  bot.callbackQuery(/^species:(.+)$/, (ctx) => handleSpeciesSelect(ctx, ctx.match![1]!));
  bot.callbackQuery('wizard:skip_breed', (ctx) => handleWizardSkip(ctx, 'breed'));
  bot.callbackQuery('wizard:skip_city', (ctx) => handleWizardSkip(ctx, 'city'));
  bot.callbackQuery('noop', (ctx) => ctx.answerCallbackQuery());

  bot.callbackQuery(/^explore:page:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleExplore(ctx, Number(ctx.match![1]));
  });
  bot.callbackQuery(/^explore:pet:(\d+)$/, (ctx) => handleExplorePet(ctx, Number(ctx.match![1])));
  bot.callbackQuery('explore:back', handleExploreBack);

  bot.callbackQuery(/^playdate:ask:(\d+)$/, (ctx) => handlePlaydateAsk(ctx, Number(ctx.match![1])));
  bot.callbackQuery(/^playdate:from:(\d+):(\d+)$/, (ctx) =>
    handlePlaydateFrom(ctx, Number(ctx.match![1]), Number(ctx.match![2]))
  );
  bot.callbackQuery(/^playdate:send:(\d+):(\d+)$/, (ctx) =>
    handlePlaydateSend(ctx, Number(ctx.match![1]), Number(ctx.match![2]))
  );
  bot.callbackQuery(/^playdate:accept:(\d+)$/, (ctx) =>
    handlePlaydateAction(ctx, Number(ctx.match![1]), 'accept')
  );
  bot.callbackQuery(/^playdate:reject:(\d+)$/, (ctx) =>
    handlePlaydateAction(ctx, Number(ctx.match![1]), 'reject')
  );
  bot.callbackQuery('playdate:cancel', handlePlaydateCancel);

  bot.on('message:text', handleTextMessage);
}

async function handleTextMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text || text.startsWith('/')) return;

  if (await handleWizardText(ctx, text)) return;

  switch (text) {
    case '🔍 کشف همبازی':
      return handleExplore(ctx);
    case '🐾 پت‌های من':
      return handleMyPets(ctx);
    case '📬 درخواست‌ها':
      return handleRequests(ctx);
    case '👤 پروفایل':
      return handleProfile(ctx);
    case '➕ ثبت پت':
      return handleAddPetCommand(ctx);
    case '❓ راهنما':
      return handleHelp(ctx);
    default:
      if (!MENU_LABELS.has(text)) {
        await ctx.reply('از منو یا /help استفاده کن.', {
          reply_markup: (await import('../keyboards')).mainMenuKeyboard(),
        });
      }
  }
}
