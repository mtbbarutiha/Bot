import { useEffect, useRef } from 'react';

/**
 * Ajax-style polling for live inbox / doctor requests.
 * Runs on an interval and when the tab becomes visible / focused.
 * Skips the immediate kick when re-enabled so WS connect/disconnect flicker
 * does not look like a page refresh.
 */
export function useLiveAjaxPoll(
  tick: () => void | Promise<void>,
  {
    enabled,
    intervalMs = 1500,
    runOnEnable = false,
  }: {
    enabled: boolean;
    intervalMs?: number;
    /** When true, fire once as soon as polling becomes enabled. Default false. */
    runOnEnable?: boolean;
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
      if (document.visibilityState === 'hidden') return;
      inFlight = true;
      void Promise.resolve(tickRef.current()).finally(() => {
        inFlight = false;
      });
    };

    if (runOnEnable) run();
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
  }, [enabled, intervalMs, runOnEnable]);
}
