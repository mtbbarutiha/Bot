import type { Context } from 'grammy';
import { rankPlaymateMatches, PET_SPECIES_LABELS } from '@petdate/shared';
import {
  createPlaydate,
  getPet,
  getUserById,
  listPets,
} from '../api-client';
import {
  explorePickMyPetKeyboard,
  mainMenuKeyboard,
  myPetsActionKeyboard,
  playdateActionKeyboard,
} from '../keyboards';
import { upsertSession } from '../session';
import { getCtxUser } from './helpers';

const MAX_AUTO_REQUESTS = 30;

/** ورود از منو: فقط لیست پت‌های خود کاربر */
export async function handleFindPlaymate(ctx: Context): Promise<void> {
  await handleExplorePickPet(ctx);
}

export async function handleExplorePickPet(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) {
    await ctx.reply('اول /start بزن.');
    return;
  }

  const myPets = await listPets({ ownerId: user.id });
  if (myPets.length === 0) {
    await ctx.reply('اول باید حداقل یک پت ثبت کنی تا برات همبازی پیدا کنیم.', {
      reply_markup: myPetsActionKeyboard(),
    });
    await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role, user.roles) });
    return;
  }

  await upsertSession(String(ctx.from!.id), {
    step: 'ready',
    exploreForPicked: false,
    exploreForPetId: undefined,
    explorePage: 0,
  });

  const text = [
    '🔍 **پیدا کردن همبازی**',
    '',
    'کدوم پتت رو انتخاب می‌کنی؟',
    '',
    'با انتخاب پت، درخواست همبازی به‌صورت خودکار برای هم‌گروه‌ها ارسال می‌شه',
    '(اولویت: هم‌کشور ← هم‌استان ← هم‌دسته ← هم‌نژاد ← سن ← جنسیت متفاوت).',
  ].join('\n');
  const kb = explorePickMyPetKeyboard(myPets);

  if (ctx.callbackQuery) {
    await ctx.answerCallbackQuery();
    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: kb });
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: kb });
}

/** انتخاب پت → مچ اولویت‌دار → ارسال درخواست به همه هم‌گروه‌ها */
export async function handleExploreForPet(ctx: Context, petId: number | 'all'): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.id) return;

  if (petId === 'all') {
    await ctx.answerCallbackQuery({ text: 'یک پت مشخص انتخاب کن', show_alert: true });
    await handleExplorePickPet(ctx);
    return;
  }

  const myPets = await listPets({ ownerId: user.id });
  const source = myPets.find((p) => p.id === petId);
  if (!source) {
    await ctx.answerCallbackQuery({ text: 'این پت مال تو نیست', show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery({ text: 'در حال پیدا کردن همبازی…' });
  await upsertSession(String(ctx.from!.id), {
    exploreForPicked: true,
    exploreForPetId: petId,
    explorePage: 0,
  });

  const peers = await listPets({ lookingForPlaymate: true, species: source.species });
  const matches = rankPlaymateMatches(source, peers, { max: MAX_AUTO_REQUESTS });

  const speciesLabel = PET_SPECIES_LABELS[source.species] ?? source.species;

  if (matches.length === 0) {
    const empty = [
      `برای **${source.name}** فعلاً همبازی هم‌گروه (${speciesLabel}) پیدا نشد.`,
      '',
      'بعداً دوباره امتحان کن.',
    ].join('\n');
    try {
      await ctx.editMessageText(empty, {
        parse_mode: 'Markdown',
        reply_markup: explorePickMyPetKeyboard(myPets),
      });
    } catch {
      await ctx.reply(empty, {
        parse_mode: 'Markdown',
        reply_markup: explorePickMyPetKeyboard(myPets),
      });
    }
    return;
  }

  let sent = 0;
  let skipped = 0;
  /** فقط یک نمونه — ترجیح با هم‌کشور / هم‌استان */
  let sample: string | undefined;
  let preferredSample: string | undefined;

  for (const match of matches) {
    try {
      const req = await createPlaydate({
        fromPetId: source.id,
        toPetId: match.pet.id,
        fromUserId: user.id,
      });
      sent += 1;
      const locReasons = match.reasons.filter(
        (r) => r === 'هم‌کشور' || r === 'هم‌استان' || r === 'هم‌شهر'
      );
      const why =
        locReasons.length > 0
          ? locReasons.join(' · ')
          : match.reasons.slice(0, 2).join(' · ');
      const line = `• **${match.pet.name}**${why ? ` — ${why}` : ''}`;
      if (!sample) sample = line;
      if (
        !preferredSample &&
        (match.reasons.includes('هم‌استان') || match.reasons.includes('هم‌کشور'))
      ) {
        preferredSample = line;
      }

      // اطلاع به صاحب پت مقصد
      if (req.toUserId) {
        const owner = await getUserById(req.toUserId);
        if (owner?.telegramId) {
          try {
            await ctx.api.sendMessage(
              owner.telegramId,
              [
                '📬 **درخواست همبازی جدید**',
                '',
                `از طرف **${source.name}** برای **${match.pet.name}**`,
                `دسته: ${speciesLabel}`,
              ].join('\n'),
              {
                parse_mode: 'Markdown',
                reply_markup: playdateActionKeyboard(req.id),
              }
            );
          } catch {
            /* کاربر بلاک کرده یا در دسترس نیست */
          }
        }
      }
    } catch {
      skipped += 1;
    }
  }

  const oneSample = preferredSample ?? sample;

  const summary = [
    `✅ برای **${source.name}** درخواست همبازی ارسال شد.`,
    '',
    `هم‌گروه: ${speciesLabel}`,
    `ارسال‌شده: **${sent}** درخواست`,
    skipped ? `رد شده/تکراری: ${skipped}` : null,
    '',
    'اولویت مچ: هم‌کشور · هم‌استان · هم‌دسته · هم‌نژاد · سن · جنسیت متفاوت',
    '',
    oneSample ? 'نمونه:' : null,
    oneSample ?? null,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await ctx.editMessageText(summary, { parse_mode: 'Markdown' });
  } catch {
    await ctx.reply(summary, { parse_mode: 'Markdown' });
  }
  await ctx.reply('منوی اصلی 👇', { reply_markup: mainMenuKeyboard(user.role, user.roles) });
}

/** سازگاری با callbackهای قدیمی صفحه‌بندی — برمی‌گرداند به انتخاب پت */
export async function handleExplore(ctx: Context, _page = 0): Promise<void> {
  await handleExplorePickPet(ctx);
}

export async function handleExplorePet(ctx: Context, _petId: number): Promise<void> {
  await ctx.answerCallbackQuery({ text: 'از لیست پت خودت یکی انتخاب کن' });
  await handleExplorePickPet(ctx);
}

export async function handleExploreBack(ctx: Context): Promise<void> {
  await handleExplorePickPet(ctx);
}

export { getPet };
