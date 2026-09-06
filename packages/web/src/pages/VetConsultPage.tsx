import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PawPrint, Stethoscope } from 'lucide-react';
import {
  BRAND,
  QUICK_VET_COST,
  toPersianDigits,
  userHasRole,
  type PetProfile,
  type VetConsultation,
} from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  acceptVetConsultation,
  listPets,
  listVetConsultations,
  quickVetConnect,
  rejectVetConsultation,
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
  const navigate = useNavigate();
  const { user, token, isLoggedIn, refreshMe } = useAuthStore();

  const [pets, setPets] = useState<PetProfile[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [error, setError] = useState<string | null>(null);
  const [statusLines, setStatusLines] = useState<string[] | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [activeConsult, setActiveConsult] = useState<VetConsultation | null>(null);
  const [requestedIds, setRequestedIds] = useState<number[]>([]);
  const [incoming, setIncoming] = useState<VetConsultation[]>([]);
  const [actingId, setActingId] = useState<number | null>(null);
  const autoNavRef = useRef<number | null>(null);

  const coins = user?.coins ?? user?.wallet?.coins ?? 0;
  const botUrl = telegramBotDeepLink();
  const isVet = userHasRole(user, 'vet');

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

  const loadIncoming = useCallback(async () => {
    if (!user?.id || !isVet) {
      setIncoming([]);
      return;
    }
    try {
      const rows = await listVetConsultations({
        vetUserId: user.id,
        status: 'requested',
      });
      setIncoming(rows);
    } catch {
      setIncoming([]);
    }
  }, [user?.id, isVet]);

  useEffect(() => {
    void loadPets();
  }, [loadPets]);

  useEffect(() => {
    void refreshConsultStatus();
  }, [refreshConsultStatus]);

  useEffect(() => {
    void loadIncoming();
  }, [loadIncoming]);

  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'connected' && !isVet) return;
    const t = window.setInterval(() => {
      void refreshConsultStatus();
      void loadIncoming();
    }, 5000);
    return () => window.clearInterval(t);
  }, [phase, isVet, refreshConsultStatus, loadIncoming]);

  useEffect(() => {
    if (phase === 'connected' && activeConsult?.id && autoNavRef.current !== activeConsult.id) {
      autoNavRef.current = activeConsult.id;
      navigate(`/vet-chats/${activeConsult.id}`);
    }
  }, [phase, activeConsult?.id, navigate]);

  const needsLogin = !isLoggedIn || !user?.id;
  const needsPet = !needsLogin && !petsLoading && pets.length === 0;
  const lowCoins = !needsLogin && !needsPet && coins < QUICK_VET_COST;

  const lead = useMemo(() => {
    if (needsLogin) return 'برای ارتباط سریع با پزشک وارد حساب شو.';
    if (needsPet) return 'برای درخواست ارتباط با پزشک، اول باید حداقل یک پت ثبت کنی.';
    if (lowCoins) {
      return `برای اتصال سریع حداقل ${formatCoins(QUICK_VET_COST)} سکه لازم داری. موجودی: ${formatCoins(coins)} — از ربات «🪙 سکه» بگیر.`;
    }
    return 'درخواست وب برای پزشک‌های آنلاین ربات و پزشک‌های آنلاین وب ارسال می‌شود.';
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
    autoNavRef.current = null;

    try {
      const result = await quickVetConnect(user.id, token);
      setSentCount(result.sent);
      setRequestedIds(result.consultations.map((c) => c.id));
      setStatusLines([
        '✅ درخواستت برای پزشک‌های آنلاین ربات و وب ارسال شد.',
        `پزشک‌های هدف: ${formatCoins(result.sent)}`,
        `سکه کسر شده: ${formatCoins(result.cost)}`,
        'به‌محض قبول پزشک، همین‌جا وارد چت وب می‌شوی.',
      ]);
      setPhase('waiting');
      try {
        await refreshMe();
      } catch {
        /* wallet chip may lag */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ارسال درخواست');
      setPhase('ready');
    }
  }

  async function onAcceptIncoming(id: number) {
    if (!token) return;
    setActingId(id);
    setError(null);
    try {
      await acceptVetConsultation(id, token);
      navigate(`/vet-chats/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'قبول درخواست ناموفق بود');
    } finally {
      setActingId(null);
    }
  }

  async function onRejectIncoming(id: number) {
    if (!token) return;
    setActingId(id);
    setError(null);
    try {
      await rejectVetConsultation(id, token);
      await loadIncoming();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رد درخواست ناموفق بود');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="pepito-vet-consult">
      <header className="pepito-home-section-head pepito-vet-consult-head">
        <p className="pepito-eyebrow">{BRAND.displayNameFa}</p>
        <h1>⚡ ارتباط سریع با پزشک</h1>
        <p>{lead}</p>
      </header>

      {isVet && incoming.length > 0 ? (
        <section className="pepito-vet-consult-incoming" aria-label="درخواست‌های ورودی پزشک">
          <h2>درخواست‌های جدید بیماران</h2>
          <ul className="pepito-vet-consult-incoming-list">
            {incoming.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{c.patientName?.trim() || `بیمار #${c.patientUserId}`}</strong>
                  <span>درخواست مشاوره سریع</span>
                </div>
                <div className="pepito-vet-consult-incoming-actions">
                  <button
                    type="button"
                    className="pepito-btn button-1"
                    disabled={actingId === c.id}
                    onClick={() => void onAcceptIncoming(c.id)}
                  >
                    قبول و ورود به چت
                  </button>
                  <button
                    type="button"
                    className="pepito-btn pepito-btn--ghost"
                    disabled={actingId === c.id}
                    onClick={() => void onRejectIncoming(c.id)}
                  >
                    رد
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pepito-vet-consult-panel" aria-label="ارتباط سریع با پزشک">
        <div className="pepito-vet-consult-cost" role="status">
          <Stethoscope size={20} strokeWidth={2} aria-hidden />
          <div>
            <strong>هزینه اتصال فوری</strong>
            <span>{formatCoins(QUICK_VET_COST)} سکه</span>
          </div>
          {!needsLogin ? <small>موجودی: {formatCoins(coins)} سکه</small> : null}
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
              <strong>{formatCoins(sentCount || requestedIds.length)}</strong> پزشک آنلاین (ربات و
              وب) ارسال شد. منتظر قبول باش.
            </p>
            <p>
              وقتی پزشک قبول کند، <strong>همین‌جا وارد چت وب</strong> می‌شوی — پزشک‌های آنلاین ربات
              هم در تلگرام مطلع می‌شوند.
            </p>
            {requestedIds[0] ? (
              <Link className="pepito-btn pepito-btn--ghost" to={`/vet-chats/${requestedIds[0]}`}>
                مشاهده وضعیت درخواست
              </Link>
            ) : null}
          </div>
        ) : null}

        {phase === 'connected' && activeConsult ? (
          <div className="pepito-vet-consult-connected" role="status">
            <p>
              ✅ دامپزشک{' '}
              <strong>{activeConsult.vetName?.trim() || `#${activeConsult.vetUserId}`}</strong>{' '}
              درخواست را قبول کرد.
            </p>
            <Link className="pepito-btn button-1" to={`/vet-chats/${activeConsult.id}`}>
              <PawIcon />
              ورود به چت وب با پزشک
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
