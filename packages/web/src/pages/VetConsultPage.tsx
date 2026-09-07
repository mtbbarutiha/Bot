import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PawPrint, Stethoscope } from 'lucide-react';
import {
  BRAND,
  QUICK_VET_COST,
  VET_CREDENTIAL_STATUS_LABELS,
  formatPersianDateTime,
  isPrimaryRole,
  toPersianDigits,
  userHasRole,
  type PetProfile,
  type VetConsultation,
  type VetCredentialStatus,
} from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import { useLiveAjaxPoll } from '../hooks/useLiveAjaxPoll';
import {
  acceptVetConsultation,
  listPets,
  listVetConsultations,
  quickVetConnect,
  rejectVetConsultation,
  telegramBotDeepLink,
} from '../lib/api';
import { subscribeIncomingRefresh } from '../lib/liveIncoming';

type Phase = 'ready' | 'sending' | 'waiting' | 'connected';

function formatCoins(n: number): string {
  return toPersianDigits(String(n));
}

function credentialLabel(status?: VetCredentialStatus | null): string {
  const key: VetCredentialStatus = status && status in VET_CREDENTIAL_STATUS_LABELS ? status : 'none';
  return VET_CREDENTIAL_STATUS_LABELS[key];
}

function PawIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

function patientLabel(c: VetConsultation): string {
  const name = c.patientName?.trim() || `بیمار #${c.patientUserId}`;
  const pet = c.petName?.trim();
  return pet ? `${name} · ${pet}` : name;
}

function VetInboxSection({
  incoming,
  recent,
  actingId,
  onAccept,
  onReject,
}: {
  incoming: VetConsultation[];
  recent: VetConsultation[];
  actingId: number | null;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
}) {
  return (
    <>
      <section
        className="pepito-vet-consult-incoming"
        aria-label="درخواست‌های ورودی پزشک"
        data-testid="vet-incoming-inbox"
      >
        <h2>درخواست‌های جدید بیماران</h2>
        {incoming.length === 0 ? (
          <p className="pepito-vet-consult-hint">فعلاً درخواست جدیدی نیست.</p>
        ) : (
          <ul className="pepito-vet-consult-incoming-list">
            {incoming.map((c) => (
              <li key={c.id} data-testid={`vet-incoming-${c.id}`}>
                <div>
                  <strong>{patientLabel(c)}</strong>
                  <span className="pepito-vet-status">درخواست جدید — در انتظار پاسخ</span>
                  {c.createdAt ? (
                    <small>{formatPersianDateTime(c.createdAt)}</small>
                  ) : null}
                </div>
                <div className="pepito-vet-consult-incoming-actions">
                  <button
                    type="button"
                    className="pepito-btn button-1"
                    disabled={actingId === c.id}
                    onClick={() => onAccept(c.id)}
                    data-testid={`vet-accept-${c.id}`}
                  >
                    قبول و ورود به چت
                  </button>
                  <Link
                    to={`/vet-chats/${c.id}`}
                    className="pepito-btn pepito-btn--ghost"
                    data-testid={`vet-open-chat-${c.id}`}
                  >
                    مشاهده
                  </Link>
                  <button
                    type="button"
                    className="pepito-btn pepito-btn--ghost"
                    disabled={actingId === c.id}
                    onClick={() => onReject(c.id)}
                  >
                    رد
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="pepito-vet-consult-incoming"
        aria-label="آخرین بیمارها"
        data-testid="vet-recent-patients"
      >
        <h2>آخرین بیمارها</h2>
        {recent.length === 0 ? (
          <p className="pepito-vet-consult-hint">هنوز بیماری ثبت نشده.</p>
        ) : (
          <ul className="pepito-vet-consult-incoming-list">
            {recent.map((c) => (
              <li key={c.id}>
                <div>
                  <strong>{patientLabel(c)}</strong>
                  <span
                    className={`pepito-vet-status${
                      c.status === 'active' ? ' is-active' : ' is-done'
                    }`}
                  >
                    {c.status === 'active' ? 'مشاوره فعال' : 'پایان‌یافته'}
                  </span>
                  {c.createdAt ? (
                    <small>{formatPersianDateTime(c.createdAt)}</small>
                  ) : null}
                </div>
                {c.status === 'active' ? (
                  <div className="pepito-vet-consult-incoming-actions">
                    <Link
                      to={`/vet-chats/${c.id}`}
                      className="pepito-btn button-1"
                      data-testid={`vet-resume-chat-${c.id}`}
                    >
                      ورود به چت
                    </Link>
                  </div>
                ) : (
                  <div className="pepito-vet-consult-incoming-actions">
                    <Link
                      to={`/vet-chats/${c.id}`}
                      className="pepito-btn pepito-btn--ghost"
                      data-testid={`vet-view-chat-${c.id}`}
                    >
                      مشاهده گفتگو
                    </Link>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

export function VetConsultPage() {
  const navigate = useNavigate();
  const { user, token, isLoggedIn, refreshMe, setVetOnline } = useAuthStore();

  const [pets, setPets] = useState<PetProfile[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('ready');
  const [error, setError] = useState<string | null>(null);
  const [statusLines, setStatusLines] = useState<string[] | null>(null);
  const [sentCount, setSentCount] = useState(0);
  const [activeConsult, setActiveConsult] = useState<VetConsultation | null>(null);
  const [requestedIds, setRequestedIds] = useState<number[]>([]);
  const [incoming, setIncoming] = useState<VetConsultation[]>([]);
  const [recent, setRecent] = useState<VetConsultation[]>([]);
  const [actingId, setActingId] = useState<number | null>(null);
  const [onlineBusy, setOnlineBusy] = useState(false);
  const autoNavRef = useRef<number | null>(null);

  const coins = user?.coins ?? user?.wallet?.coins ?? 0;
  const botUrl = telegramBotDeepLink();
  const hasVetRole = userHasRole(user, 'vet');
  const isVetDashboard = isPrimaryRole(user, 'vet');
  const vetOnline = Boolean(user?.vetOnline);

  const loadPets = useCallback(async () => {
    if (!user?.id || isVetDashboard) {
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
  }, [user?.id, isVetDashboard]);

  const refreshConsultStatus = useCallback(async () => {
    if (!user?.id || isVetDashboard) return;
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
  }, [user?.id, requestedIds, phase, isVetDashboard]);

  const loadIncoming = useCallback(async () => {
    if (!user?.id || !hasVetRole) {
      setIncoming([]);
      return;
    }
    try {
      const rows = await listVetConsultations({
        vetUserId: user.id,
        status: 'requested',
      });
      setIncoming((prev) => {
        if (
          prev.length === rows.length &&
          prev.every(
            (row, i) =>
              row.id === rows[i]?.id &&
              row.status === rows[i]?.status &&
              row.patientName === rows[i]?.patientName &&
              row.petName === rows[i]?.petName,
          )
        ) {
          return prev;
        }
        return rows;
      });
    } catch {
      setIncoming([]);
    }
  }, [user?.id, hasVetRole]);

  const loadRecent = useCallback(async () => {
    // Any owned vet role must see active/recent patients — not only primary=vet.
    // Dual-role users often keep pet_owner as primary while receiving consults.
    if (!user?.id || !hasVetRole) {
      setRecent([]);
      return;
    }
    try {
      const rows = await listVetConsultations({ vetUserId: user.id });
      const done = rows.filter((c) => c.status === 'active' || c.status === 'completed');
      const next = done.slice(0, 8);
      setRecent((prev) => {
        if (
          prev.length === next.length &&
          prev.every(
            (row, i) =>
              row.id === next[i]?.id &&
              row.status === next[i]?.status &&
              row.patientName === next[i]?.patientName,
          )
        ) {
          return prev;
        }
        return next;
      });
    } catch {
      setRecent([]);
    }
  }, [user?.id, hasVetRole]);

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
    void loadRecent();
  }, [loadRecent]);

  // Soft ajax refresh on doctor panel / patient wait — gentle so the UI does not thrash.
  useLiveAjaxPoll(
    () => {
      void refreshConsultStatus();
      void loadIncoming();
      if (hasVetRole) void loadRecent();
    },
    {
      enabled: hasVetRole || phase === 'waiting' || phase === 'connected',
      intervalMs: 45_000,
    },
  );

  // Instant list update when global live poller discovers a new request.
  useEffect(() => {
    if (!hasVetRole) return;
    return subscribeIncomingRefresh((detail) => {
      if (detail?.kinds && !detail.kinds.includes('vet')) return;
      void loadIncoming();
      void loadRecent();
    });
  }, [hasVetRole, loadIncoming, loadRecent]);

  useEffect(() => {
    if (isVetDashboard) return;
    if (phase === 'connected' && activeConsult?.id && autoNavRef.current !== activeConsult.id) {
      autoNavRef.current = activeConsult.id;
      navigate(`/vet-chats/${activeConsult.id}`);
    }
  }, [phase, activeConsult?.id, navigate, isVetDashboard]);

  const needsLogin = !isLoggedIn || !user?.id;
  const needsPet = !needsLogin && !petsLoading && pets.length === 0;
  const lowCoins = !needsLogin && !needsPet && coins < QUICK_VET_COST;

  const lead = useMemo(() => {
    if (isVetDashboard) {
      return vetOnline
        ? 'آنلاین هستی و آماده پذیرش بیمار — درخواست‌های جدید همین‌جا می‌آیند.'
        : 'برای دریافت درخواست جدید آنلاین شو؛ درخواست‌های در انتظار و بیمارهای فعال همین‌جا می‌مانند.';
    }
    if (needsLogin) return 'برای ارتباط سریع با پزشک وارد حساب شو.';
    if (needsPet) return 'برای درخواست ارتباط با پزشک، اول باید حداقل یک پت ثبت کنی.';
    if (lowCoins) {
      return `برای اتصال سریع حداقل ${formatCoins(QUICK_VET_COST)} سکه لازم داری. موجودی: ${formatCoins(coins)} — از ربات «🪙 سکه» بگیر.`;
    }
    return 'درخواست وب برای پزشک‌های آنلاین ربات و پزشک‌های آنلاین وب ارسال می‌شود.';
  }, [isVetDashboard, vetOnline, needsLogin, needsPet, lowCoins, coins]);

  async function onToggleOnline() {
    if (!token) return;
    setOnlineBusy(true);
    setError(null);
    try {
      await setVetOnline(!vetOnline);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر وضعیت آنلاین ناموفق بود');
    } finally {
      setOnlineBusy(false);
    }
  }

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
        `برای اتصال سریع حداقل ${formatCoins(QUICK_VET_COST)} سکه لازم داری.
موجودی: ${formatCoins(coins)} — از ربات «🪙 سکه» بگیر.`
      );
      return;
    }

    setPhase('sending');
    setError(null);
    setStatusLines(null);
    setActiveConsult(null);
    autoNavRef.current = null;

    try {
      let result;
      try {
        result = await quickVetConnect(user.id, token);
      } catch (err) {
        const needsConfirm =
          err instanceof Error &&
          ((err as Error & { requiresResendConfirm?: boolean }).requiresResendConfirm ||
            /میخوای مجدد/.test(err.message));
        if (needsConfirm) {
          const ok = window.confirm('میخوای مجدد درخواست بدی به اون شخص؟');
          if (!ok) {
            setPhase('ready');
            return;
          }
          result = await quickVetConnect(user.id, token, { confirmResend: true });
        } else {
          throw err;
        }
      }
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

  /* ── Dedicated vet dashboard (primary role = vet) ── */
  if (isVetDashboard) {
    return (
      <div className="pepito-vet-consult pepito-vet-dashboard">
        <header className="pepito-home-section-head pepito-vet-consult-head">
          <p className="pepito-eyebrow">{BRAND.displayNameFa}</p>
          <h1>🩺 پنل دامپزشک</h1>
          <p>{lead}</p>
        </header>

        <section className="pepito-vet-consult-panel" aria-label="وضعیت آنلاین">
          <div className="pepito-vet-consult-cost" role="status">
            <Stethoscope size={20} strokeWidth={2} aria-hidden />
            <div>
              <strong>{vetOnline ? 'آنلاین — آماده پذیرش' : 'آفلاین'}</strong>
              <span>
                {vetOnline
                  ? 'در لیست پزشک‌های آماده هستی'
                  : 'درخواست جدید نمی‌آید؛ موارد در انتظار همچنان اینجاست'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`pepito-btn ${vetOnline ? 'pepito-btn--ghost' : 'button-1'}`}
            disabled={onlineBusy || needsLogin}
            onClick={() => void onToggleOnline()}
            data-testid="vet-online-toggle"
          >
            {onlineBusy
              ? 'در حال تغییر…'
              : vetOnline
                ? '🔴 آفلاین شو'
                : '🟢 آنلاین هستم و آماده پذیرش بیمار'}
          </button>
          <div className="pepito-vet-panel-caps" data-testid="vet-panel-capabilities">
            <p>
              در چت فعال بیمار می‌توانی مثل ربات: <strong>نسخه بنویسی</strong>، پرونده را ببینی، مورد
              بالینی ثبت کنی و چت را ببندی.
            </p>
            <p className="pepito-vet-cred-line">
              {credentialLabel(user?.vetCredentialStatus)}
              {user?.vetCredentialStatus !== 'verified' ? (
                <>
                  {' · '}
                  <Link to="/profile">آپلود مدرک از پروفایل</Link>
                </>
              ) : null}
            </p>
          </div>
          {error ? (
            <p className="auth-error pepito-vet-consult-status" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <VetInboxSection
          incoming={incoming}
          recent={recent}
          actingId={actingId}
          onAccept={(id) => void onAcceptIncoming(id)}
          onReject={(id) => void onRejectIncoming(id)}
        />
      </div>
    );
  }

  /* ── Patient / owner quick-connect surface ── */
  return (
    <div className="pepito-vet-consult">
      <header className="pepito-home-section-head pepito-vet-consult-head">
        <p className="pepito-eyebrow">{BRAND.displayNameFa}</p>
        <h1>⚡ ارتباط سریع با پزشک</h1>
        <p>{lead}</p>
      </header>

      {/* Dual-role: keep vet inbox + online toggle even when primary is pet_owner */}
      {hasVetRole ? (
        <>
          <section className="pepito-vet-consult-panel" aria-label="وضعیت آنلاین پزشک">
            <div className="pepito-vet-consult-cost" role="status">
              <Stethoscope size={20} strokeWidth={2} aria-hidden />
              <div>
                <strong>{vetOnline ? 'آنلاین — آماده پذیرش' : 'آفلاین'}</strong>
                <span>نقش دامپزشک فعال است؛ درخواست‌ها همین‌جا می‌آیند</span>
              </div>
            </div>
            <button
              type="button"
              className={`pepito-btn ${vetOnline ? 'pepito-btn--ghost' : 'button-1'}`}
              disabled={onlineBusy || needsLogin}
              onClick={() => void onToggleOnline()}
              data-testid="vet-online-toggle-dual"
            >
              {onlineBusy
                ? 'در حال تغییر…'
                : vetOnline
                  ? '🔴 آفلاین شو'
                  : '🟢 آنلاین هستم و آماده پذیرش بیمار'}
            </button>
            <div className="pepito-vet-panel-caps">
              <p>
                در چت بیمار: صدور نسخه، پرونده، ثبت مورد بالینی و بستن چت — مثل ربات.
              </p>
            </div>
          </section>
          <VetInboxSection
            incoming={incoming}
            recent={recent}
            actingId={actingId}
            onAccept={(id) => void onAcceptIncoming(id)}
            onReject={(id) => void onRejectIncoming(id)}
          />
        </>
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
