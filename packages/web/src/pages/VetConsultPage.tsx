import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Stethoscope } from 'lucide-react';
import {
  BRAND,
  QUICK_VET_COST,
  toPersianDigits,
  type PetProfile,
  type VetConsultation,
} from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  listPets,
  listVetConsultations,
  quickVetConnect,
  telegramBotDeepLink,
} from '../lib/api';

type Phase = 'ready' | 'sending' | 'waiting' | 'connected';

function formatCoins(n: number): string {
  return toPersianDigits(String(n));
}

function PawIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

export function VetConsultPage() {
  const { user, token, isLoggedIn, refreshMe } = useAuthStore();
  const [pets, setPets] = useState<PetProfile[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [error, setError] = useState<string | null>(null);
  const [statusLines, setStatusLines] = useState<string[] | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [activeConsult, setActiveConsult] = useState<VetConsultation | null>(null);
  const [requestedIds, setRequestedIds] = useState<number[]>([]);

  const coins = user?.coins ?? user?.wallet?.coins ?? 0;
  const botUrl = telegramBotDeepLink();

  const loadPets = useCallback(async () => {
    if (!user?.id) {
      setPets([]);
      return;
    }
    setPetsLoading(true);
    try {
      setPets(await listPets({ ownerId: user.id }));
    } catch {
      setPets([]);
    } finally {
      setPetsLoading(false);
    }
  }, [user?.id]);

  const refreshConsultStatus = useCallback(async () => {
    if (!user?.id) return;
    try {
      const rows = await listVetConsultations({ patientUserId: user.id });
      const active = rows.find((c) => c.status === 'active') ?? null;
      if (active) {
        setActiveConsult(active);
        setPhase('connected');
        return;
      }
      const pending = rows.filter(
        (c) =>
          c.status === 'requested' &&
          (requestedIds.length === 0 || requestedIds.includes(c.id))
      );
      if (pending.length && phase !== 'sending') {
        setPhase('waiting');
      }
    } catch {
      /* ignore poll errors */
    }
  }, [user?.id, requestedIds, phase]);

  useEffect(() => {
    void loadPets();
  }, [loadPets]);

  useEffect(() => {
    void refreshConsultStatus();
  }, [refreshConsultStatus]);

  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'connected') return;
    const t = window.setInterval(() => {
      void refreshConsultStatus();
    }, 8000);
    return () => window.clearInterval(t);
  }, [phase, refreshConsultStatus]);

  const needsLogin = !isLoggedIn || !user?.id;
  const needsPet = !needsLogin && !petsLoading && pets.length === 0;
  const lowCoins = !needsLogin && !needsPet && coins < QUICK_VET_COST;

  const lead = useMemo(() => {
    if (needsLogin) return 'برای ارتباط سریع با پزشک وارد حساب شو.';
    if (needsPet) return 'برای درخواست ارتباط با پزشک، اول باید حداقل یک پت ثبت کنی.';
    if (lowCoins) {
      return `برای اتصال سریع حداقل ${formatCoins(QUICK_VET_COST)} سکه لازم داری. موجودی: ${formatCoins(coins)} — از ربات «🪙 سکه» بگیر.`;
    }
    return 'دامپزشک آنلاین در دسترسه.';
  }, [needsLogin, needsPet, lowCoins, coins]);

  async function onConnect() {
    if (!user?.id) {
      setError('اول وارد حساب شو.');
      return;
    }
    if (pets.length === 0) {
      setError('برای درخواست ارتباط با پزشک، اول باید حداقل یک پت ثبت کنی.');
      return;
    }
    if (coins < QUICK_VET_COST) {
      setError(
        `برای اتصال سریع حداقل ${formatCoins(QUICK_VET_COST)} سکه لازم داری.\nموجودی: ${formatCoins(coins)} — از ربات «🪙 سکه» بگیر.`
      );
      return;
    }

    setPhase('sending');
    setError(null);
    setStatusLines(null);
    setActiveConsult(null);

    try {
      const result = await quickVetConnect(user.id, token);
      setSentCount(result.sent);
      setRequestedIds(result.consultations.map((c) => c.id));
      setStatusLines([
        '✅ درخواستت برای پزشک‌های آنلاین ارسال شد.',
        `پزشک‌های مطلع‌شده: ${formatCoins(result.sent)}`,
        `سکه کسر شده: ${formatCoins(result.cost)}`,
        'به‌زودی یکی از دامپزشک‌ها باهات هماهنگ می‌کنه.',
      ]);
      setPhase('waiting');
      try {
        await refreshMe();
      } catch {
        /* wallet chip may lag until next refresh */
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در ارسال درخواست';
      setError(msg);
      setPhase('ready');
    }
  }

  return (
    <div className="pepito-vet-consult">
      <header className="pepito-home-section-head pepito-vet-consult-head">
        <p className="pepito-eyebrow">{BRAND.displayName}</p>
        <h1>⚡ ارتباط سریع با پزشک</h1>
        <p>{lead}</p>
      </header>

      <section className="pepito-vet-consult-panel" aria-label="ارتباط سریع با پزشک">
        <div className="pepito-vet-consult-cost" role="status">
          <Stethoscope size={20} strokeWidth={2} aria-hidden />
          <div>
            <strong>هزینه اتصال فوری</strong>
            <span>{formatCoins(QUICK_VET_COST)} سکه</span>
          </div>
          {!needsLogin ? (
            <small>
              موجودی: {formatCoins(coins)} سکه
            </small>
          ) : null}
        </div>

        {needsLogin ? (
          <Link to="/auth/login" className="pepito-btn button-1">
            <PawIcon />
            ورود برای ارتباط با پزشک
          </Link>
        ) : needsPet ? (
          <>
            <p className="pepito-vet-consult-hint">
              🐾 هنوز پتی ثبت نکردی.
              <br />
              برای درخواست ارتباط با پزشک، اول باید حداقل یک پت ثبت کنی.
            </p>
            <Link to="/add-pet" className="pepito-btn button-1">
              <PawIcon />
              ثبت پت
            </Link>
          </>
        ) : (
          <button
            type="button"
            className="pepito-btn button-1"
            data-testid="vet-quick-connect"
            disabled={phase === 'sending' || petsLoading || lowCoins}
            onClick={() => void onConnect()}
          >
            <PawIcon />
            {phase === 'sending'
              ? 'در حال ارسال درخواست…'
              : phase === 'waiting' || phase === 'connected'
                ? 'ارسال دوباره درخواست'
                : '🩺 به یه پزشک آنلاین وصلم کن'}
          </button>
        )}

        {lowCoins && !needsLogin && !needsPet ? (
          <a
            className="pepito-btn pepito-btn--ghost pepito-vet-consult-bot"
            href={botUrl}
            target="_blank"
            rel="noreferrer"
          >
            خرید سکه در ربات تلگرام
          </a>
        ) : null}

        {error ? (
          <p className="auth-error pepito-vet-consult-status" role="alert">
            {error}
          </p>
        ) : null}

        {statusLines && !error ? (
          <div className="pepito-vet-consult-status" role="status">
            {statusLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}

        {phase === 'waiting' ? (
          <div className="pepito-vet-consult-wait">
            <p>
              درخواست برای{' '}
              <strong>{formatCoins(sentCount || requestedIds.length)}</strong> پزشک آنلاین ارسال
              شد. منتظر قبول دامپزشک باش.
            </p>
            <p>
              چت مشاوره مثل ربات در <strong>تلگرام</strong> باز می‌شود — وقتی پزشک قبول کند، از
              ربات ادامه بده.
            </p>
            <a
              className="pepito-btn pepito-btn--ghost"
              href={botUrl}
              target="_blank"
              rel="noreferrer"
            >
              باز کردن ربات تلگرام
            </a>
          </div>
        ) : null}

        {phase === 'connected' && activeConsult ? (
          <div className="pepito-vet-consult-connected" role="status">
            <p>
              ✅ دامپزشک{' '}
              <strong>{activeConsult.vetName?.trim() || `#${activeConsult.vetUserId}`}</strong>{' '}
              درخواست را قبول کرد.
            </p>
            <p>
              ادامهٔ مشاوره و پیام‌ها در ربات تلگرام است — همان سازوکار «ارتباط سریع با پزشک».
            </p>
            <a className="pepito-btn button-1" href={botUrl} target="_blank" rel="noreferrer">
              <PawIcon />
              ورود به چت در تلگرام
            </a>
          </div>
        ) : null}
      </section>
    </div>
  );
}
