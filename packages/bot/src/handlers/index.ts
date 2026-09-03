import type { Bot, Context } from 'grammy';
import type { UserRole } from '@petdate/shared';
import { MENU_LABELS, PET_OWNER_MENU, DEFAULT_MENU, mainMenuKeyboard } from '../keyboards';
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
import {
  handleCancel,
  handleHelp,
  handleMenu,
  handleRoleSelect,
  handleStart,
  getCtxUser,
} from './start';
import {
  handleCoins,
  handleComingSoon,
  handleInviteFriends,
  handleMedical,
  handlePetShop,
  handleQuickVet,
  handleServices,
} from './services';

export function registerHandlers(bot: Bot): void {
  bot.command('start', handleStart);
  bot.command('menu', handleMenu);
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

  bot.callbackQuery('pets:add', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleAddPetCommand(ctx);
  });
  bot.callbackQuery('pets:requests', async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleRequests(ctx);
  });

  bot.callbackQuery(/^medical:/, (ctx) => handleComingSoon(ctx, 'پزشکی'));
  bot.callbackQuery(/^vet:/, (ctx) => handleComingSoon(ctx, 'مشاوره دامپزشک'));
  bot.callbackQuery(/^shop:/, (ctx) => handleComingSoon(ctx, 'پت شاپ'));
  bot.callbackQuery(/^svc:/, (ctx) => handleComingSoon(ctx, 'خدمات'));

  bot.on('message:text', handleTextMessage);
}

async function handleTextMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text || text.startsWith('/')) return;

  if (await handleWizardText(ctx, text)) return;

  const m = PET_OWNER_MENU;
  const d = DEFAULT_MENU;

  switch (text) {
    case m.findPlaymate:
    case d.explore:
      return handleExplore(ctx);
    case m.myProfile:
    case d.profile:
      return handleProfile(ctx);
    case m.myPets:
    case d.myPets:
      return handleMyPets(ctx);
    case m.coins:
      return handleCoins(ctx);
    case m.medical:
      return handleMedical(ctx);
    case m.invite:
      return handleInviteFriends(ctx);
    case m.help:
    case d.help:
      return handleHelp(ctx);
    case m.quickVet:
      return handleQuickVet(ctx);
    case m.shop:
      return handlePetShop(ctx);
    case m.services:
      return handleServices(ctx);
    case d.requests:
      return handleRequests(ctx);
    case d.addPet:
      return handleAddPetCommand(ctx);
    default:
      if (!MENU_LABELS.has(text)) {
        const user = await getCtxUser(ctx);
        await ctx.reply('از منو یا /help استفاده کن.', {
          reply_markup: mainMenuKeyboard(user?.role),
        });
      }
  }
}
