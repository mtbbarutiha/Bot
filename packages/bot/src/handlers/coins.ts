import type { Context } from 'grammy';
import {
  claimDailyCoins,
  hasOpenCoinSell,
  submitCoinSell,
} from '../api-client';
import {
  COIN_PACKAGES,
  COIN_SELL_PRICE_TOMAN,
  DAILY_COIN_REWARD,
  MIN_SELL_COINS,
  canClaimDaily,
  coinsShopIntroText,
  earnIntroText,
  formatNum,
  formatToman,
  packageCheckoutText,
  sellAmountToman,
  validateIranCard,
} from '../economy';
import {
  coinPackagePayKeyboard,
  coinsShopKeyboard,
  earnCancelKeyboard,
  earnConfirmKeyboard,
  earnKeyboard,
  mainMenuKeyboard,
  MENU_LABELS,
} from '../keyboards';
import { getSession, upsertSession } from '../session';
import { getCtxUser, menuKeyboardFor } from './helpers';

export async function handleCoins(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  const balance = user?.coins ?? 0;
  await ctx.reply(coinsShopIntroText(balance), {
    parse_mode: 'HTML',
    reply_markup: coinsShopKeyboard(user?.lastDailyCoinAt),
  });
  await ctx.reply('منوی اصلی 👇', { reply_markup: menuKeyboardFor(ctx, user) });
}

export async function handleCoinsDaily(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.telegramId) {
    await ctx.answerCallbackQuery({ text: 'اول /start بزن', show_alert: true });
    return;
  }

  if (!canClaimDaily(user.lastDailyCoinAt)) {
    await ctx.answerCallbackQuery({ text: 'امروز گرفتی — فردا بیا', show_alert: true });
    return;
  }

  const result = await claimDailyCoins(user.telegramId, DAILY_COIN_REWARD);
  if (!result.ok) {
    await ctx.answerCallbackQuery({
      text: result.reason === 'already' ? 'امروز گرفتی — فردا بیا' : 'خطا در دریافت سکه',
      show_alert: true,
    });
    return;
  }

  await ctx.answerCallbackQuery({
    text: `+${formatNum(result.awarded)} سکه 🎁`,
  });
  const text = coinsShopIntroText(result.user.coins ?? 0);
  try {
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: coinsShopKeyboard(result.user.lastDailyCoinAt),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: coinsShopKeyboard(result.user.lastDailyCoinAt),
    });
  }
}

export async function handleCoinsDailyDone(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery({ text: 'امروز گرفتی — فردا برگرد 🎁', show_alert: true });
}

export async function handleCoinsPackage(ctx: Context, pkgId: string): Promise<void> {
  const pkg = COIN_PACKAGES.find((p) => p.id === pkgId);
  if (!pkg) {
    await ctx.answerCallbackQuery({ text: 'بسته پیدا نشد', show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery();
  const text = packageCheckoutText(pkg);
  try {
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: coinPackagePayKeyboard(pkg.id),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: coinPackagePayKeyboard(pkg.id),
    });
  }
}

export async function handleCoinsPay(
  ctx: Context,
  _method: 'stars' | 'card',
  pkgId: string
): Promise<void> {
  const pkg = COIN_PACKAGES.find((p) => p.id === pkgId);
  await ctx.answerCallbackQuery({
    text: pkg
      ? `پرداخت ${formatNum(pkg.coins)} سکه به‌زودی فعال می‌شه`
      : 'پرداخت به‌زودی',
    show_alert: true,
  });
}

export async function handleCoinsBack(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  await ctx.answerCallbackQuery();
  const text = coinsShopIntroText(user?.coins ?? 0);
  try {
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: coinsShopKeyboard(user?.lastDailyCoinAt),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: coinsShopKeyboard(user?.lastDailyCoinAt),
    });
  }
}

export async function handleEarn(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.telegramId) {
    await ctx.reply('اول /start بزن.');
    return;
  }
  const balance = user.coins ?? 0;
  const pending = await hasOpenCoinSell(user.telegramId);
  const canSell = balance >= MIN_SELL_COINS && !pending;
  const extra = pending
    ? '\n\n⏳ یک درخواست تسویه باز داری — تا بررسی ادمین صبر کن.'
    : '';
  await ctx.reply(earnIntroText(balance) + extra, {
    parse_mode: 'HTML',
    reply_markup: earnKeyboard(canSell),
  });
  await ctx.reply('منوی اصلی 👇', { reply_markup: menuKeyboardFor(ctx, user) });
}

export async function handleEarnSell(ctx: Context): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.telegramId) {
    await ctx.answerCallbackQuery();
    return;
  }
  const balance = user.coins ?? 0;
  if (await hasOpenCoinSell(user.telegramId)) {
    await ctx.answerCallbackQuery({ text: 'یک درخواست تسویه باز داری', show_alert: true });
    return;
  }
  if (balance < MIN_SELL_COINS) {
    await ctx.answerCallbackQuery({
      text: `حداقل ${formatNum(MIN_SELL_COINS)} سکه لازم است`,
      show_alert: true,
    });
    return;
  }

  const coins = balance;
  const toman = sellAmountToman(coins, COIN_SELL_PRICE_TOMAN);
  await ctx.answerCallbackQuery();
  const text = [
    '💵 <b>تأیید فروش</b>',
    '',
    `تعداد سکه: <b>${formatNum(coins)}</b>`,
    `نرخ: هر سکه ${formatNum(COIN_SELL_PRICE_TOMAN)} تومان`,
    `مبلغ پرداختی: <b>${formatToman(toman)}</b>`,
    '',
    'با ارسال شماره کارت، سکه‌ها تا تأیید/رد ادمین نگه داشته می‌شوند.',
  ].join('\n');

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: earnConfirmKeyboard(coins),
    });
  } catch {
    await ctx.reply(text, {
      parse_mode: 'HTML',
      reply_markup: earnConfirmKeyboard(coins),
    });
  }
}

export async function handleEarnConfirm(ctx: Context, coins: number): Promise<void> {
  const user = await getCtxUser(ctx);
  if (!user?.telegramId || !ctx.from) {
    await ctx.answerCallbackQuery();
    return;
  }
  if (!Number.isFinite(coins) || coins < MIN_SELL_COINS) {
    await ctx.answerCallbackQuery({ text: 'مقدار نامعتبر', show_alert: true });
    return;
  }
  if ((user.coins ?? 0) < coins) {
    await ctx.answerCallbackQuery({ text: 'سکه کافی نیست', show_alert: true });
    return;
  }
  if (await hasOpenCoinSell(user.telegramId)) {
    await ctx.answerCallbackQuery({ text: 'یک درخواست تسویه باز داری', show_alert: true });
    return;
  }

  await upsertSession(String(ctx.from.id), {
    step: 'earn_card',
    earnPendingCoins: coins,
  });
  await ctx.answerCallbackQuery();
  const prompt = [
    '🏦 شماره کارت بانکی ۱۶ رقمی را برای واریز بفرست.',
    `مبلغ در انتظار: ${formatNum(coins)} سکه ≈ ${formatToman(sellAmountToman(coins))}`,
    '',
    'فقط رقم (فاصله/خط تیره مجاز است). کارت بانکی ایران.',
  ].join('\n');

  try {
    await ctx.editMessageText(prompt, { reply_markup: earnCancelKeyboard() });
  } catch {
    await ctx.reply(prompt, { reply_markup: earnCancelKeyboard() });
  }
}

export async function handleEarnCancel(ctx: Context): Promise<void> {
  if (ctx.from) {
    await upsertSession(String(ctx.from.id), {
      step: 'ready',
      earnPendingCoins: undefined,
    });
  }
  await ctx.answerCallbackQuery({ text: 'لغو شد' });
  try {
    await ctx.editMessageText('فروش لغو شد.');
  } catch {
    /* ignore */
  }
}

export async function handleEarnClose(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
  } catch {
    /* ignore */
  }
}

/** شماره کارت هنگام step=earn_card */
export async function handleEarnCardText(ctx: Context, text: string): Promise<boolean> {
  const from = ctx.from;
  if (!from) return false;

  const session = await getSession(String(from.id));
  if (!session || session.step !== 'earn_card' || !session.earnPendingCoins) {
    return false;
  }

  if (MENU_LABELS.has(text) || text.startsWith('/')) {
    await upsertSession(String(from.id), {
      step: 'ready',
      earnPendingCoins: undefined,
    });
    return false;
  }

  const user = await getCtxUser(ctx);
  if (!user?.telegramId) return true;

  const cardCheck = validateIranCard(text);
  if (!cardCheck.ok) {
    await ctx.reply(
      cardCheck.reason === 'luhn'
        ? 'شماره کارت معتبر نیست (چک رقم). ۱۶ رقم را دوباره بفرست.'
        : 'شماره کارت ۱۶ رقمی بانکی ایران را درست بفرست.',
      { reply_markup: earnCancelKeyboard() }
    );
    return true;
  }

  const coins = session.earnPendingCoins;
  const result = await submitCoinSell(user.telegramId, {
    coins,
    cardNumber: cardCheck.card,
    rateToman: COIN_SELL_PRICE_TOMAN,
    minCoins: MIN_SELL_COINS,
  });

  await upsertSession(String(from.id), {
    step: 'ready',
    earnPendingCoins: undefined,
  });

  if (!result.ok) {
    const msg =
      result.reason === 'min'
        ? `حداقل ${formatNum(MIN_SELL_COINS)} سکه لازم است.`
        : result.reason === 'balance'
          ? 'سکه کافی نیست.'
          : result.reason === 'pending'
            ? 'یک درخواست تسویه باز داری.'
            : 'ثبت درخواست ممکن نشد.';
    await ctx.reply(msg, { reply_markup: menuKeyboardFor(ctx, user) });
    return true;
  }

  await ctx.reply(
    [
      '✅ درخواست فروش ثبت شد.',
      `شماره درخواست: #${result.requestId}`,
      `${formatNum(coins)} سکه رزرو شد · ${formatToman(result.amountToman)}`,
      '',
      'ممنون! پرداخت پس از بررسی ادمین انجام می‌شود.',
    ].join('\n'),
    { reply_markup: menuKeyboardFor(ctx, result.user) }
  );
  return true;
}
