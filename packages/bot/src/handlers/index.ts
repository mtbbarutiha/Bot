import type { Bot, Context } from 'grammy';
import type { PetGender, PetSize, UserGender, UserRole } from '@petdate/shared';
import { ROLE_CONFIRM_LABEL, USER_ROLE_LABELS, USER_ROLES } from '@petdate/shared';
import { forceJoinMiddleware, missingChannels, safeAnswerCallback, sendForceJoinPrompt } from '../force-join';
import {
  MENU_LABELS,
  PET_OWNER_MENU,
  DEFAULT_MENU,
  MY_PETS_SECTION,
  SEARCH_PETS_MENU,
  WIZARD_NAV,
  mainMenuKeyboard,
} from '../keyboards';
import { getSession } from '../session';
import { handleExplore, handleExploreBack, handleExploreForPet, handleExplorePet, handleExplorePickPet, handleFindPlaymate } from './explore';
import {
  handleAddPetCommand,
  handleBreedCustom,
  handleBreedSelect,
  handlePetBoolSelect,
  handlePetGenderSelect,
  handlePetPhoto,
  handlePetSizeSelect,
  handleSpeciesSelect,
  handleWizardSkip,
  handleWizardText,
} from './wizard';
import {
  handleMyPetDeleteAsk,
  handleMyPetDeleteConfirm,
  handleMyPetView,
  handleMyPets,
  handlePlaydateAction,
  handlePlaydateAsk,
  handlePlaydateCancel,
  handlePlaydateFrom,
  handlePlaydateSend,
  handleRequests,
} from './playdates';
import {
  handleProfile,
  handleProfileContact,
  handleProfileDeactivateAsk,
  handleProfileDeactivateConfirm,
  handleProfileDeleteAsk,
  handleProfileDeleteConfirm,
  handleProfileActivate,
  handleProfileGender,
  handleProfilePhoto,
  handleProfileSkip,
  handleProfileWizardText,
  startProfileWizard,
} from './profile';
import {
  handleCancel,
  handleHelp,
  handleMenu,
  handleRoleConfirm,
  handleRoleSelect,
  handleStart,
  getCtxUser,
} from './start';
import {
  handleComingSoon,
  handleInviteFriends,
  handleMedical,
  handlePetShop,
  handleQuickVet,
  handleServices,
} from './services';
import {
  handleCoins,
  handleCoinsBack,
  handleCoinsDaily,
  handleCoinsDailyDone,
  handleCoinsPackage,
  handleCoinsPay,
  handleEarn,
  handleEarnCancel,
  handleEarnCardText,
  handleEarnClose,
  handleEarnConfirm,
  handleEarnSell,
} from './coins';
import {
  handleNearbyPets,
  handleSearchAll,
  handleSearchBreedText,
  handleSearchByBreedStart,
  handleSearchHomeCallback,
  handleSearchMashhad,
  handleSearchMenuCallback,
  handleSearchPage,
  handleSearchPetsMenu,
  handleSearchPetView,
  handleSearchSameProvince,
} from './search';
import {
  handleAdminApprove,
  handleAdminRejectAsk,
  handleAdminRejectReasonText,
  handleAdminRejectSkip,
  handleAdminVerifyNext,
  handleAdminVerifyQueue,
  handleVerifyCancel,
  handleVerifyPhoto,
  handleVerifyStart,
  handleVerifyStatus,
  handleVerifyUseAvatar,
} from './verification';

export function registerHandlers(bot: Bot): void {
  // عضویت اجباری در کانال‌ها — قبل از همهٔ دستورات
  bot.use(forceJoinMiddleware);

  bot.callbackQuery('join:check', async (ctx) => {
    try {
      const { missing } = await missingChannels(ctx);
      if (missing.length === 0) {
        await safeAnswerCallback(ctx, { text: 'عضویت تأیید شد ✅' });
        try {
          await ctx.editMessageText('✅ عضویت تأیید شد. خوش اومدی!');
        } catch {
          /* ignore */
        }
        await handleStart(ctx);
        return;
      }
      await safeAnswerCallback(ctx, {
        text: 'هنوز عضو کانال نشدی',
        show_alert: true,
      });
      await sendForceJoinPrompt(ctx, missing);
    } catch (err) {
      console.error('join:check failed:', err);
      await safeAnswerCallback(ctx, { text: 'خطا — دوباره /start بزن', show_alert: true });
    }
  });

  bot.command('start', handleStart);
  bot.command('menu', handleMenu);
  bot.command('help', handleHelp);
  bot.command('cancel', handleCancel);
  bot.command('explore', (ctx) => handleFindPlaymate(ctx));
  bot.command('pets', handleMyPets);
  bot.command('requests', handleRequests);
  bot.command('profile', handleProfile);
  bot.command('addpet', handleAddPetCommand);
  bot.command('admin', handleAdminVerifyQueue);
  bot.command('verify', handleAdminVerifyQueue);

  bot.callbackQuery('role:confirm', async (ctx) => {
    try {
      await handleRoleConfirm(ctx);
    } catch (err) {
      console.error('Role confirm failed:', err);
      await ctx.answerCallbackQuery({ text: 'خطا. دوباره /start بزن.', show_alert: true });
    }
  });

  bot.callbackQuery(/^role:(.+)$/, async (ctx) => {
    try {
      const role = ctx.match![1] as UserRole;
      if (!USER_ROLES.includes(role)) {
        await ctx.answerCallbackQuery({ text: 'نقش نامعتبر', show_alert: true });
        return;
      }
      await handleRoleSelect(ctx, role);
    } catch (err) {
      console.error('Role selection failed:', err);
      await ctx.answerCallbackQuery({ text: 'خطا. دوباره /start بزن.', show_alert: true });
    }
  });

  bot.callbackQuery(/^species:(.+)$/, (ctx) => handleSpeciesSelect(ctx, ctx.match![1]!));
  bot.callbackQuery(/^breed:(\d+)$/, (ctx) => handleBreedSelect(ctx, Number(ctx.match![1])));
  bot.callbackQuery('breed:custom', (ctx) => handleBreedCustom(ctx));
  bot.callbackQuery(/^pet:gender:(male|female)$/, (ctx) =>
    handlePetGenderSelect(ctx, ctx.match![1] as PetGender)
  );
  bot.callbackQuery(/^pet:size:(small|medium|large)$/, (ctx) =>
    handlePetSizeSelect(ctx, ctx.match![1] as PetSize)
  );
  bot.callbackQuery(/^pet:bool:(vaccinated|neutered|looking):(0|1)$/, (ctx) =>
    handlePetBoolSelect(ctx, ctx.match![1] as 'vaccinated' | 'neutered' | 'looking', ctx.match![2] === '1')
  );

  bot.callbackQuery('wizard:skip_breed', (ctx) => handleWizardSkip(ctx, 'breed'));
  bot.callbackQuery('wizard:skip_color', (ctx) => handleWizardSkip(ctx, 'color'));
  bot.callbackQuery('wizard:skip_diseases', (ctx) => handleWizardSkip(ctx, 'diseases'));
  bot.callbackQuery('wizard:skip_bio', (ctx) => handleWizardSkip(ctx, 'bio'));
  bot.callbackQuery('wizard:skip_photo', (ctx) => handleWizardSkip(ctx, 'photo'));
  bot.callbackQuery('noop', (ctx) => ctx.answerCallbackQuery());

  bot.callbackQuery(/^explore:page:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await handleExplore(ctx, Number(ctx.match![1]));
  });
  bot.callbackQuery(/^explore:pet:(\d+)$/, (ctx) => handleExplorePet(ctx, Number(ctx.match![1])));
  bot.callbackQuery('explore:back', handleExploreBack);
  bot.callbackQuery('explore:pick', (ctx) => handleExplorePickPet(ctx));
  bot.callbackQuery('explore:for:all', (ctx) => handleExploreForPet(ctx, 'all'));
  bot.callbackQuery(/^explore:for:(\d+)$/, (ctx) =>
    handleExploreForPet(ctx, Number(ctx.match![1]))
  );

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
    try {
      await ctx.answerCallbackQuery();
    } catch {
      /* ignore */
    }
    await handleAddPetCommand(ctx);
  });
  bot.callbackQuery('pets:list', async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
    } catch {
      /* ignore */
    }
    await handleMyPets(ctx);
  });
  bot.callbackQuery(/^pets:view:(\d+)$/, (ctx) =>
    handleMyPetView(ctx, Number(ctx.match![1]))
  );
  bot.callbackQuery(/^pets:delete:yes:(\d+)$/, (ctx) =>
    handleMyPetDeleteConfirm(ctx, Number(ctx.match![1]))
  );
  bot.callbackQuery(/^pets:delete:(\d+)$/, (ctx) =>
    handleMyPetDeleteAsk(ctx, Number(ctx.match![1]))
  );

  bot.callbackQuery('profile:edit', async (ctx) => {
    await ctx.answerCallbackQuery();
    await startProfileWizard(ctx);
  });
  bot.callbackQuery(/^profile:gender:(male|female)$/, (ctx) =>
    handleProfileGender(ctx, ctx.match![1] as UserGender)
  );
  bot.callbackQuery('profile:skip_phone', (ctx) => handleProfileSkip(ctx, 'phone'));
  bot.callbackQuery('profile:skip_photo', (ctx) => handleProfileSkip(ctx, 'photo'));
  bot.callbackQuery('profile:skip_bio', (ctx) => handleProfileSkip(ctx, 'bio'));
  bot.callbackQuery('profile:deactivate', (ctx) => handleProfileDeactivateAsk(ctx));
  bot.callbackQuery('profile:activate', (ctx) => handleProfileActivate(ctx));
  bot.callbackQuery('profile:delete', (ctx) => handleProfileDeleteAsk(ctx));
  bot.callbackQuery('profile:deactivate:yes', (ctx) => handleProfileDeactivateConfirm(ctx, true));
  bot.callbackQuery('profile:deactivate:no', (ctx) => handleProfileDeactivateConfirm(ctx, false));
  bot.callbackQuery('profile:delete:yes', (ctx) => handleProfileDeleteConfirm(ctx, true));
  bot.callbackQuery('profile:delete:no', (ctx) => handleProfileDeleteConfirm(ctx, false));

  bot.callbackQuery('verify:start', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => undefined);
    await handleVerifyStart(ctx);
  });
  bot.callbackQuery('verify:status', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => undefined);
    await handleVerifyStatus(ctx);
  });
  bot.callbackQuery('verify:use_avatar', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => undefined);
    await handleVerifyUseAvatar(ctx);
  });
  bot.callbackQuery('verify:cancel', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => undefined);
    await handleVerifyCancel(ctx);
  });
  bot.callbackQuery('verify:admin:queue', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => undefined);
    await handleAdminVerifyQueue(ctx);
  });
  bot.callbackQuery('verify:admin:next', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => undefined);
    await handleAdminVerifyNext(ctx);
  });
  bot.callbackQuery(/^verify:approve:(\d+)$/, (ctx) =>
    handleAdminApprove(ctx, Number(ctx.match![1]))
  );
  bot.callbackQuery(/^verify:reject:(\d+)$/, (ctx) =>
    handleAdminRejectAsk(ctx, Number(ctx.match![1]))
  );
  bot.callbackQuery('verify:reject_skip', async (ctx) => {
    await ctx.answerCallbackQuery().catch(() => undefined);
    await handleAdminRejectSkip(ctx);
  });

  bot.callbackQuery(/^medical:/, (ctx) => handleComingSoon(ctx, 'پزشکی'));
  bot.callbackQuery(/^vet:/, (ctx) => handleComingSoon(ctx, 'مشاوره دامپزشک'));
  bot.callbackQuery(/^shop:/, (ctx) => handleComingSoon(ctx, 'پت شاپ'));
  bot.callbackQuery(/^svc:/, (ctx) => handleComingSoon(ctx, 'خدمات'));

  bot.callbackQuery('coins:daily', (ctx) => handleCoinsDaily(ctx));
  bot.callbackQuery('coins:daily:done', (ctx) => handleCoinsDailyDone(ctx));
  bot.callbackQuery(/^coins:pkg:(.+)$/, (ctx) => handleCoinsPackage(ctx, ctx.match![1]!));
  bot.callbackQuery(/^coins:pay:(stars|card):(.+)$/, (ctx) =>
    handleCoinsPay(ctx, ctx.match![1] as 'stars' | 'card', ctx.match![2]!)
  );
  bot.callbackQuery('coins:back', (ctx) => handleCoinsBack(ctx));

  bot.callbackQuery('earn:sell', (ctx) => handleEarnSell(ctx));
  bot.callbackQuery(/^earn:confirm:(\d+)$/, (ctx) =>
    handleEarnConfirm(ctx, Number(ctx.match![1]))
  );
  bot.callbackQuery('earn:cancel', (ctx) => handleEarnCancel(ctx));
  bot.callbackQuery('earn:close', (ctx) => handleEarnClose(ctx));

  bot.callbackQuery(/^search:page:([^:]+):(\d+)$/, (ctx) =>
    handleSearchPage(ctx, ctx.match![1]!, Number(ctx.match![2]))
  );
  bot.callbackQuery(/^search:pet:(\d+)$/, (ctx) =>
    handleSearchPetView(ctx, Number(ctx.match![1]))
  );
  bot.callbackQuery('search:menu', (ctx) => handleSearchMenuCallback(ctx));
  bot.callbackQuery('search:home', (ctx) => handleSearchHomeCallback(ctx));

  bot.on('message:contact', async (ctx) => {
    await handleProfileContact(ctx);
  });

  bot.on('message:photo', async (ctx) => {
    if (await handleVerifyPhoto(ctx)) return;
    if (await handlePetPhoto(ctx)) return;
    await handleProfilePhoto(ctx);
  });

  bot.on('message:text', handleTextMessage);
}

async function handleTextMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim();
  if (!text || text.startsWith('/')) return;

  // Global cancel from reply keyboard while in any flow
  if (text === WIZARD_NAV.cancel) {
    const from = ctx.from;
    if (from) {
      const session = await getSession(String(from.id));
      if (session && session.step !== 'ready' && session.step !== 'start') {
        await handleCancel(ctx);
        return;
      }
    }
  }

  // Role selection via reply keyboard
  if (await handleRoleReplyText(ctx, text)) return;

  if (await handleAdminRejectReasonText(ctx, text)) return;
  if (await handleEarnCardText(ctx, text)) return;
  if (await handleSearchBreedText(ctx, text)) return;
  if (await handleProfileWizardText(ctx, text)) return;
  if (await handleWizardText(ctx, text)) return;

  const m = PET_OWNER_MENU;
  const d = DEFAULT_MENU;
  const petsSection = MY_PETS_SECTION;
  const search = SEARCH_PETS_MENU;

  switch (text) {
    case m.findPlaymate:
    case d.explore:
      return handleFindPlaymate(ctx);
    case m.nearbyPets:
      return handleNearbyPets(ctx);
    case m.searchPets:
      return handleSearchPetsMenu(ctx);
    case search.byBreed:
      return handleSearchByBreedStart(ctx);
    case search.sameProvince:
      return handleSearchSameProvince(ctx);
    case search.mashhad:
      return handleSearchMashhad(ctx);
    case search.allPets:
      return handleSearchAll(ctx);
    case search.backToMenu: {
      const user = await getCtxUser(ctx);
      await ctx.reply('منوی اصلی 👇', {
        reply_markup: mainMenuKeyboard(user?.role, user?.roles),
      });
      return;
    }
    case m.myProfile:
    case d.profile:
      return handleProfile(ctx);
    case m.myPets:
    case d.myPets:
      return handleMyPets(ctx);
    case m.addPet:
    case d.addPet:
    case petsSection.addPet:
      return handleAddPetCommand(ctx);
    case petsSection.backToMenu: {
      const user = await getCtxUser(ctx);
      await ctx.reply('منوی اصلی 👇', {
        reply_markup: mainMenuKeyboard(user?.role, user?.roles),
      });
      return;
    }
    case m.coins:
      return handleCoins(ctx);
    case m.earn:
      return handleEarn(ctx);
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
    case '📬 درخواست‌ها':
    case 'درخواست‌ها':
      // دکمه قدیمی حذف‌شده از منو — نادیده بگیر و منوی اصلی را تازه کن
      {
        const user = await getCtxUser(ctx);
        await ctx.reply('این دکمه حذف شده. از منوی جدید استفاده کن 👇', {
          reply_markup: mainMenuKeyboard(user?.role, user?.roles),
        });
      }
      return;
    default:
      if (!MENU_LABELS.has(text)) {
        const user = await getCtxUser(ctx);
        await ctx.reply('از منو یا /help استفاده کن.', {
          reply_markup: mainMenuKeyboard(user?.role, user?.roles),
        });
      }
  }
}

async function handleRoleReplyText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;

  const session = await getSession(String(from.id));
  if (!session || session.step !== 'role_select') return false;

  if (text === ROLE_CONFIRM_LABEL) {
    await handleRoleConfirm(ctx);
    return true;
  }

  const normalized = text.replace(/^✓\s*/, '').trim();
  const role = USER_ROLES.find(
    (r) => USER_ROLE_LABELS[r] === text || USER_ROLE_LABELS[r] === normalized
  );
  if (!role) {
    await ctx.reply(
      `لطفاً نقش رو از دکمه‌ها انتخاب کن، بعد «${ROLE_CONFIRM_LABEL}» رو بزن.`
    );
    return true;
  }

  await handleRoleSelect(ctx, role);
  return true;
}
