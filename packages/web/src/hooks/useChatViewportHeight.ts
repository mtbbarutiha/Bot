import { useEffect } from 'react';

/**
 * Keep the chat shell full-screen and lift content by the soft-keyboard inset.
 *
 * Do NOT resize/move `.tg-chat` with visualViewport height + offsetTop — that
 * fights Safari scroll-into-view and parks the composer under the URL bar.
 *
 * Instead:
 * - lock document scroll (body position:fixed) while chat is open
 * - keep `.tg-chat` fixed at inset:0
 * - set `--tg-kb-inset` = keyboard overlap for padding-bottom only
 * - never call window.scrollTo while the keyboard is animating
 */
export function useChatViewportHeight(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    const body = document.body;
    let raf = 0;
    const timers: number[] = [];
    const prevBody = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    const scrollY = window.scrollY || window.pageYOffset || 0;

    // Lock once. Capturing scrollY in top avoids a visual jump without scrollTo.
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    root.classList.add('tg-chat-open');

    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        // With body fixed, innerHeight tracks the layout viewport (stable on iOS
        // when the soft keyboard opens; shrinks on Android with resizes-content).
        const layoutH = window.innerHeight || root.clientHeight;
        const vvH = vv?.height ?? layoutH;
        const offsetTop = vv?.offsetTop ?? 0;
        const inset = Math.max(0, Math.round(layoutH - vvH - offsetTop));
        root.style.setProperty('--tg-kb-inset', `${inset}px`);
        root.classList.toggle('tg-kb-open', inset > 40);
      });
    };

    const onFocusIn = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      // Re-measure through keyboard animation; never scroll the window.
      apply();
      for (const ms of [50, 150, 300]) {
        timers.push(window.setTimeout(apply, ms));
      }
    };

    const onFocusOut = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      timers.push(window.setTimeout(apply, 120));
    };

    apply();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);

    return () => {
      cancelAnimationFrame(raf);
      for (const id of timers) window.clearTimeout(id);
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      root.style.removeProperty('--tg-kb-inset');
      root.classList.remove('tg-kb-open');
      root.classList.remove('tg-chat-open');
      body.style.position = prevBody.position;
      body.style.top = prevBody.top;
      body.style.left = prevBody.left;
      body.style.right = prevBody.right;
      body.style.width = prevBody.width;
      body.style.overflow = prevBody.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
