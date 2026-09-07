import { useEffect } from 'react';

/**
 * Mobile chat keyboard — bottom-inset model (kb-bottom-v4).
 *
 * Failed approaches (do not revive):
 * - `top: vv.offsetTop` + `height: vv.height` (vv-pin) — parks a short shell
 *   under the status bar with a white void above the keyboard when CSS/JS
 *   get out of sync or another deploy ships height without top.
 * - `padding-bottom: kb-inset` on a full inset:0 shell while children do not
 *   stretch — composer hugs the top of the shell.
 *
 * This model:
 * - Keep `.tg-chat` fixed with `top:0; left:0; right:0`
 * - Set only `bottom: var(--tg-kb-inset)` so the shell shrinks from the bottom
 * - Thread stays a 3-row grid (top | scroll | foot); composer stays in foot
 * - Never set --tg-vv-top / --tg-vv-height
 * - Prefer interactive-widget=overlays-content so layout viewport stays stable
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

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    root.classList.add('tg-chat-open');
    root.dataset.tgShell = 'kb-bottom-v4';

    // Kill leftover pin vars from older deploys / competing agents.
    root.style.removeProperty('--tg-vv-top');
    root.style.removeProperty('--tg-vv-height');

    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        const layoutH = Math.max(window.innerHeight || 0, root.clientHeight || 0, 1);
        const vvH = vv?.height ?? layoutH;
        const offsetTop = vv?.offsetTop ?? 0;
        // Overlap of the soft keyboard (and any chrome) below the visual viewport.
        let inset = Math.max(0, Math.round(layoutH - vvH - offsetTop));
        // Guard against one-frame glitches mid keyboard animation.
        inset = Math.min(inset, Math.round(layoutH * 0.75));

        root.style.setProperty('--tg-kb-inset', `${inset}px`);
        root.style.removeProperty('--tg-vv-top');
        root.style.removeProperty('--tg-vv-height');
        root.classList.toggle('tg-kb-open', inset > 40);
      });
    };

    const onFocusIn = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      apply();
      for (const ms of [50, 100, 200, 350, 500]) {
        timers.push(window.setTimeout(apply, ms));
      }
    };

    const onFocusOut = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      timers.push(window.setTimeout(apply, 120));
      timers.push(window.setTimeout(apply, 320));
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
      root.style.removeProperty('--tg-vv-top');
      root.style.removeProperty('--tg-vv-height');
      root.classList.remove('tg-kb-open');
      root.classList.remove('tg-chat-open');
      delete root.dataset.tgShell;
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
