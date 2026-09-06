import { useEffect, useRef } from 'react';

/**
 * Fast ajax-style polling for live inbox / doctor requests.
 * Runs immediately, on interval, and when the tab becomes visible / focused.
 */
export function useLiveAjaxPoll(
  tick: () => void | Promise<void>,
  {
    enabled,
    intervalMs = 1500,
  }: {
    enabled: boolean;
    intervalMs?: number;
  },
) {
  const tickRef = useRef(tick);
  tickRef.current = tick;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let inFlight = false;

    const run = () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      void Promise.resolve(tickRef.current()).finally(() => {
        inFlight = false;
      });
    };

    run();
    const id = window.setInterval(run, intervalMs);

    const onFocus = () => run();
    const onVis = () => {
      if (document.visibilityState === 'visible') run();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, intervalMs]);
}
