import { useEffect, useState } from 'react';
import { PLAYDATE_REQUEST_TTL_MS, requestRemainingMs } from '@petdate/shared';

function formatRemain(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Live countdown while a pending chat/playmate request is open (2 min TTL). */
export function RequestCountdown({
  createdAt,
  ttlMs = PLAYDATE_REQUEST_TTL_MS,
  className = '',
  onExpire,
}: {
  createdAt: string;
  ttlMs?: number;
  className?: string;
  onExpire?: () => void;
}) {
  const [remain, setRemain] = useState(() => requestRemainingMs(createdAt, ttlMs));

  useEffect(() => {
    setRemain(requestRemainingMs(createdAt, ttlMs));
    const id = window.setInterval(() => {
      const next = requestRemainingMs(createdAt, ttlMs);
      setRemain(next);
      if (next <= 0) {
        window.clearInterval(id);
        onExpire?.();
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [createdAt, ttlMs, onExpire]);

  if (remain <= 0) {
    return <span className={className}>منقضی شد</span>;
  }

  return (
    <span className={className} title="مهلت پاسخ">
      ⏱ {formatRemain(remain)}
    </span>
  );
}
