import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, CircleAlert, Loader2, Wallet } from 'lucide-react';
import {
  BRAND,
  COIN_SELL_STATUS_LABELS_FA,
  formatCardGrouped,
  formatPersianDateTime,
  sellAmountToman,
  toEnglishDigits,
  toPersianDigits,
  validateIranCard,
} from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  fetchEarnStatus,
  invalidateAuthGetCache,
  submitEarnWithdraw,
  type EarnRequestSummary,
  type EarnStatusResponse,
} from '../lib/api';

function formatFaInt(n: number): string {
  return toPersianDigits(new Intl.NumberFormat('en-US').format(Math.max(0, Math.floor(n))));
}

function formatFaToman(n: number): string {
  return `${formatFaInt(n)} تومان`;
}

/**
 * کسب درآمد + درخواست برداشت — هم‌تراز جریان ربات «فروش سکه».
 * Route auth-gated via AuthGuard (same as /wallet).
 */
export function EarningsPage() {
  const { token, refreshMe } = useAuthStore();
  const [data, setData] = useState<EarnStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [coinsInput, setCoinsInput] = useState('');
  const [cardInput, setCardInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchEarnStatus(token);
      setData(res);
      setCoinsInput((prev) => {
        if (prev.trim()) return prev;
        return String(res.coins >= res.minCoins ? res.coins : res.minCoins);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const coinsNum = useMemo(() => {
    const n = Math.floor(Number(toEnglishDigits(coinsInput).replace(/[^\d]/g, '')) || 0);
    return Number.isFinite(n) ? n : 0;
  }, [coinsInput]);

  const previewToman = data ? sellAmountToman(coinsNum, data.rateToman) : 0;
  const pending = Boolean(data?.hasOpenRequest);
  const canSubmit =
    Boolean(data?.canSell) &&
    coinsNum >= (data?.minCoins ?? 50) &&
    coinsNum <= (data?.coins ?? 0) &&
    !submitting;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !data) return;
    setFormError('');
    setSuccess('');

    if (pending) {
      setFormError('یک درخواست تسویه باز داری — تا بررسی ادمین صبر کن.');
      return;
    }
    if (coinsNum < data.minCoins) {
      setFormError(`حداقل ${formatFaInt(data.minCoins)} سکه لازم است.`);
      return;
    }
    if (coinsNum > data.coins) {
      setFormError('سکه کافی نیست.');
      return;
    }
    const cardCheck = validateIranCard(cardInput);
    if (!cardCheck.ok) {
      setFormError(
        cardCheck.reason === 'luhn'
          ? 'شماره کارت معتبر نیست (چک رقم). ۱۶ رقم را دوباره وارد کن.'
          : 'شماره کارت ۱۶ رقمی بانکی ایران را درست وارد کن.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitEarnWithdraw(token, {
        coins: coinsNum,
        cardNumber: cardCheck.card,
      });
      invalidateAuthGetCache(token);
      await refreshMe().catch(() => undefined);
      setSuccess(
        `درخواست #${toPersianDigits(res.requestId)} ثبت شد · ${formatFaInt(res.coins)} سکه رزرو · ${formatFaToman(res.amountToman)}`
      );
      setCardInput('');
      const fresh = await fetchEarnStatus(token);
      setData(fresh);
      setCoinsInput(String(fresh.coins >= fresh.minCoins ? fresh.coins : fresh.minCoins));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pepito-earn-page">
      <header className="pepito-earn-hero">
        <div className="pepito-earn-hero-wash" aria-hidden />
        <div className="pepito-earn-hero-inner">
          <p className="pepito-kicker pepito-earn-kicker">
            <span className="pepito-kicker-dot" aria-hidden>
              <Banknote size={16} />
            </span>
            {BRAND.displayName}
          </p>
          <h1>کسب درآمد</h1>
          <p className="pepito-earn-lead">
            فروش سکه ربات و درخواست برداشت به کارت بانکی — همان قوانین تلگرام
          </p>
        </div>
      </header>

      {loading && !data ? (
        <p className="pepito-earn-status" aria-live="polite">
          <Loader2 size={16} className="pepito-spin" aria-hidden />
          در حال بارگذاری…
        </p>
      ) : null}

      {error ? (
        <p className="pepito-earn-status pepito-earn-status--warn" role="alert">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <section className="pepito-earn-balance" aria-label="موجودی و نرخ">
            <div className="pepito-earn-balance-main">
              <span className="pepito-earn-balance-label">موجودی سکه</span>
              <p className="pepito-earn-balance-val">
                <span aria-hidden>🪙</span>
                {formatFaInt(data.coins)}
              </p>
              <p className="pepito-earn-balance-note">
                ارزش تقریبی ≈ {formatFaToman(data.estimatedToman)}
              </p>
            </div>
            <ul className="pepito-earn-meta" aria-label="شرایط فروش">
              <li>
                <strong>نرخ فروش</strong>
                <span>هر سکه {formatFaInt(data.rateToman)} تومان</span>
              </li>
              <li>
                <strong>حداقل فروش</strong>
                <span>{formatFaInt(data.minCoins)} سکه</span>
              </li>
              <li>
                <strong>روش پرداخت</strong>
                <span>{data.methodLabelFa}</span>
              </li>
            </ul>
          </section>

          <section className="pepito-earn-how" aria-labelledby="earn-how-title">
            <h2 id="earn-how-title">فرآیند کسب درآمد</h2>
            <ol>
              <li>سکه را از جوایز، خرید، یا فعالیت در پت‌دیت جمع کن.</li>
              <li>
                تعداد سکه (حداقل {formatFaInt(data.minCoins)}) و شماره کارت بانکی ایران را وارد کن.
              </li>
              <li>سکه‌ها تا تأیید ادمین رزرو می‌شوند؛ پس از بررسی، مبلغ به کارت واریز می‌شود.</li>
            </ol>
          </section>

          {pending && data.openRequest ? (
            <section className="pepito-earn-pending" role="status" aria-live="polite">
              <CircleAlert size={18} aria-hidden />
              <div>
                <h2>درخواست باز</h2>
                <p>
                  #{toPersianDigits(data.openRequest.id)} · {formatFaInt(data.openRequest.coins)}{' '}
                  سکه · {formatFaToman(data.openRequest.amountToman)}
                </p>
                <p className="pepito-earn-pending-card">
                  کارت {toPersianDigits(data.openRequest.cardMasked)} ·{' '}
                  {COIN_SELL_STATUS_LABELS_FA[data.openRequest.status]}
                </p>
                <p className="pepito-earn-pending-hint">
                  تا بررسی ادمین نمی‌توانی درخواست جدید ثبت کنی.
                </p>
              </div>
            </section>
          ) : null}

          <section className="pepito-earn-form-wrap" aria-labelledby="earn-form-title">
            <h2 id="earn-form-title">درخواست برداشت</h2>
            <form className="pepito-earn-form" onSubmit={(e) => void onSubmit(e)}>
              <label className="pepito-earn-field">
                <span>تعداد سکه</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={coinsInput}
                  onChange={(e) => setCoinsInput(e.target.value)}
                  disabled={pending || submitting}
                  placeholder={formatFaInt(data.minCoins)}
                />
              </label>
              <p className="pepito-earn-preview">
                مبلغ پرداختی ≈ <strong>{formatFaToman(previewToman)}</strong>
                {coinsNum > 0 && coinsNum < data.minCoins ? (
                  <span className="pepito-earn-preview-warn"> (کمتر از حداقل)</span>
                ) : null}
              </p>
              <label className="pepito-earn-field">
                <span>شماره کارت بانکی (۱۶ رقم)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardInput}
                  onChange={(e) => setCardInput(formatCardGrouped(e.target.value))}
                  disabled={pending || submitting}
                  placeholder="6037-****-****-****"
                  maxLength={19}
                />
              </label>
              <p className="pepito-earn-field-hint">
                فقط رقم؛ فاصله یا خط تیره مجاز است. کارت بانکی ایران.
              </p>

              {formError ? (
                <p className="pepito-earn-form-error" role="alert">
                  {formError}
                </p>
              ) : null}
              {success ? (
                <p className="pepito-earn-form-ok" role="status">
                  {success}
                </p>
              ) : null}

              <button
                type="submit"
                className="pepito-btn button-1 pepito-earn-submit"
                disabled={!canSubmit}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="pepito-spin" aria-hidden />
                    در حال ثبت…
                  </>
                ) : (
                  'ثبت درخواست برداشت'
                )}
              </button>
            </form>
          </section>

          <EarnHistory requests={data.requests} />
        </>
      ) : null}

      <div className="pepito-earn-actions">
        <Link to="/wallet" className="pepito-btn button-2">
          <Wallet size={16} aria-hidden />
          کیف پول
        </Link>
        <Link to="/profile" className="pepito-btn button-2 pepito-earn-back">
          <ArrowRight size={16} aria-hidden />
          پروفایل
        </Link>
      </div>
    </div>
  );
}

function EarnHistory({ requests }: { requests: EarnRequestSummary[] }) {
  if (!requests.length) return null;
  return (
    <section className="pepito-earn-history" aria-labelledby="earn-history-title">
      <h2 id="earn-history-title">درخواست‌های اخیر</h2>
      <ul>
        {requests.map((r) => (
          <li
            key={r.id}
            className={`pepito-earn-history-item pepito-earn-history-item--${r.status}`}
          >
            <div className="pepito-earn-history-top">
              <strong>#{toPersianDigits(r.id)}</strong>
              <span className="pepito-earn-history-status">
                {COIN_SELL_STATUS_LABELS_FA[r.status]}
              </span>
            </div>
            <p>
              {formatFaInt(r.coins)} سکه · {formatFaToman(r.amountToman)}
            </p>
            <p className="pepito-earn-history-meta">
              {toPersianDigits(r.cardMasked)} · {formatPersianDateTime(r.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
