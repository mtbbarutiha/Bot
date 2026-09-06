import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Wallet } from 'lucide-react';
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
import { fetchWallet } from '../lib/api';

const ORDER: WalletCurrency[] = ['coins', 'toman', 'stars', 'ton'];

function formatBal(n: number): string {
  return toPersianDigits(new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(n))));
}

/**
 * Dedicated wallet page — multi-currency balances (same source as WalletChip).
 * Route is auth-gated via AuthGuard; landing dock sends guests through login?next=/wallet.
 */
export function WalletPage() {
  const { user, token, refreshMe } = useAuthStore();
  const [wallet, setWallet] = useState<WalletBalances | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        if (token) {
          const res = await fetchWallet(token);
          if (!cancelled) setWallet(res.wallet);
          await refreshMe().catch(() => undefined);
        }
      } catch {
        if (!cancelled) {
          setError('نتوانستیم موجودی را از سرور تازه کنیم؛ آخرین موجودی محلی نمایش داده شد.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, refreshMe]);

  const balances: WalletBalances =
    wallet ?? (user ? user.wallet ?? walletFromUserFields(user) : { ton: 0, stars: 0, coins: 0, toman: 0 });

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
