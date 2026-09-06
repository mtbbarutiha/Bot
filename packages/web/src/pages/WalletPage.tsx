import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Link2, RefreshCw, Wallet } from 'lucide-react';
import {
  WALLET_CURRENCY_LABELS_FA,
  WALLET_CURRENCY_STATUS,
  WALLET_CURRENCY_SYMBOLS,
  toPersianDigits,
  walletFromUserFields,
  type WalletBalances,
  type WalletCurrency,
} from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import { fetchWallet, startTelegramAttach } from '../lib/api';

const ORDER: WalletCurrency[] = ['coins', 'toman', 'stars', 'ton'];

function formatBal(n: number): string {
  return toPersianDigits(new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(n))));
}

/**
 * Dedicated wallet page — multi-currency balances (same source as WalletChip).
 * Includes Telegram attach + Stars sync (bot wallet_stars, not Telegram Payment API).
 * Route is auth-gated via AuthGuard; landing dock sends guests through login?next=/wallet.
 */
export function WalletPage() {
  const { user, token, refreshMe } = useAuthStore();
  const [wallet, setWallet] = useState<WalletBalances | null>(null);
  const [telegramLinked, setTelegramLinked] = useState<boolean>(() => Boolean(user?.telegramId));
  const [telegramId, setTelegramId] = useState<string | null>(user?.telegramId ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkHint, setLinkHint] = useState('');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);

  const loadWallet = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!token) return;
      if (!opts?.soft) setLoading(true);
      else setSyncing(true);
      setError('');
      try {
        const res = await fetchWallet(token);
        setWallet(res.wallet);
        if (res.telegram) {
          setTelegramLinked(Boolean(res.telegram.linked));
          setTelegramId(res.telegram.telegramId);
        } else {
          const me = await refreshMe().catch(() => null);
          setTelegramLinked(Boolean(me?.telegramId));
          setTelegramId(me?.telegramId ?? null);
        }
        await refreshMe().catch(() => undefined);
        setSyncedAt(new Date().toISOString());
      } catch {
        setError('نتوانستیم موجودی را از سرور تازه کنیم؛ آخرین موجودی محلی نمایش داده شد.');
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [token, refreshMe]
  );

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const balances: WalletBalances =
    wallet ?? (user ? user.wallet ?? walletFromUserFields(user) : { ton: 0, stars: 0, coins: 0, toman: 0 });

  const linked = telegramLinked || Boolean(user?.telegramId);
  const tgDisplay = telegramId || user?.telegramId || null;

  async function onLinkTelegram() {
    if (!token) return;
    setLinkBusy(true);
    setLinkHint('');
    try {
      const res = await startTelegramAttach(token);
      if (res.alreadyLinked) {
        setTelegramLinked(true);
        setTelegramId(res.telegramId ?? null);
        setLinkHint('حساب شما از قبل به تلگرام وصل است.');
        await loadWallet({ soft: true });
        return;
      }
      setLinkHint('ربات را باز کن، دکمه Start را بزن، بعد اینجا «همگام‌سازی» را بزن.');
      window.open(res.deepLink, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ساخت لینک اتصال ناموفق بود';
      setLinkHint(msg);
    } finally {
      setLinkBusy(false);
    }
  }

  return (
    <div className="pepito-wallet-page">
      <header className="pepito-wallet-hero">
        <p className="pepito-kicker">
          <span className="pepito-kicker-dot" aria-hidden>
            <Wallet size={16} />
          </span>
          حساب شما
        </p>
        <h1>کیف پول</h1>
        <p className="pepito-wallet-lead">موجودی چندارزی شما در پت‌دیت — مشترک بین وب و ربات تلگرام</p>
      </header>

      <section className="pepito-wallet-tg" aria-labelledby="wallet-tg-title">
        <div className="pepito-wallet-tg-head">
          <h2 id="wallet-tg-title">اتصال / همگام‌سازی تلگرام</h2>
          <p className="pepito-wallet-tg-lead">
            موجودی ستاره مشترک با ربات (wallet_stars) — موجودی بومی Stars حساب تلگرام از API تلگرام خوانده
            نمی‌شود.
          </p>
        </div>

        {linked ? (
          <div className="pepito-wallet-tg-body">
            <p className="pepito-wallet-tg-status">
              <span className="pepito-wallet-tg-dot" aria-hidden />
              متصل به تلگرام
              {tgDisplay ? (
                <span className="pepito-wallet-tg-id"> · شناسه {toPersianDigits(tgDisplay)}</span>
              ) : null}
            </p>
            <p className="pepito-wallet-tg-stars">
              <span aria-hidden>⭐</span>
              موجودی ستاره مشترک با ربات:{' '}
              <strong>{formatBal(balances.stars)}</strong>
            </p>
            <button
              type="button"
              className="pepito-btn button-2 pepito-wallet-tg-sync"
              onClick={() => void loadWallet({ soft: true })}
              disabled={syncing || loading}
            >
              <RefreshCw size={16} aria-hidden className={syncing ? 'pepito-spin' : undefined} />
              {syncing ? 'در حال همگام‌سازی…' : 'همگام‌سازی / تازه‌سازی'}
            </button>
            {syncedAt ? (
              <p className="pepito-wallet-tg-meta">آخرین همگام‌سازی از همان کیف پول ربات انجام شد.</p>
            ) : null}
          </div>
        ) : (
          <div className="pepito-wallet-tg-body">
            <p className="pepito-wallet-tg-status pepito-wallet-tg-status--off">
              تلگرام هنوز به این حساب وب وصل نشده است.
            </p>
            <button
              type="button"
              className="pepito-btn button-1 pepito-wallet-tg-link"
              onClick={() => void onLinkTelegram()}
              disabled={linkBusy}
            >
              <Link2 size={16} aria-hidden />
              {linkBusy ? 'در حال ساخت لینک…' : 'اتصال به تلگرام'}
            </button>
            {linkHint ? <p className="pepito-wallet-tg-hint">{linkHint}</p> : null}
            <button
              type="button"
              className="pepito-btn button-2 pepito-wallet-tg-sync"
              onClick={() => void loadWallet({ soft: true })}
              disabled={syncing || loading}
            >
              <RefreshCw size={16} aria-hidden />
              بعد از Start در ربات — همگام‌سازی
            </button>
          </div>
        )}
      </section>

      {loading ? <p className="pepito-wallet-status">در حال بارگذاری موجودی…</p> : null}
      {error ? <p className="pepito-wallet-status pepito-wallet-status--warn">{error}</p> : null}

      <ul className="pepito-wallet-list" aria-label="موجودی‌ها">
        {ORDER.map((key) => (
          <li key={key} className="pepito-wallet-row">
            <div className="pepito-wallet-row-main">
              <span className="pepito-wallet-row-sym" aria-hidden>
                {key === 'toman' ? '﷼' : WALLET_CURRENCY_SYMBOLS[key]}
              </span>
              <div>
                <p className="pepito-wallet-row-label">{WALLET_CURRENCY_LABELS_FA[key]}</p>
                <p className="pepito-wallet-row-note">{WALLET_CURRENCY_STATUS[key].noteFa}</p>
              </div>
            </div>
            <p className="pepito-wallet-row-val">
              {formatBal(balances[key])}
              {key === 'toman' ? <span className="pepito-wallet-row-unit"> تومان</span> : null}
            </p>
          </li>
        ))}
      </ul>

      <p className="pepito-wallet-soon">به‌زودی واریز مستقیم از وب</p>

      <div className="pepito-wallet-actions">
        <Link to="/shop" className="pepito-btn button-1">
          رفتن به شاپ
        </Link>
        <Link to="/profile" className="pepito-btn button-2 pepito-wallet-back">
          <ArrowRight size={16} aria-hidden />
          پروفایل
        </Link>
      </div>
    </div>
  );
}
