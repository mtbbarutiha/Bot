import { useEffect } from 'react';

/**
 * Mobile chat keyboard — composer-fixed-v5.
 *
 * Resting layout (keyboard closed) is OK with the 3-zone thread. The failure
 * mode is on *focus*: shrinking the whole shell via `bottom: kb-inset` can
 * collapse to a short strip under the status bar when visualViewport reports
 * a transient tiny height (composer jumps to TOP + white void).
 *
 * v5:
 * - `.tg-chat` stays `position:fixed; inset:0` — never resized by the keyboard
 * - `.tg-thread-foot` is `position:fixed; bottom: var(--tg-kb-inset)` so only
 *   the composer lifts above the soft keyboard
 * - scroll pane gets padding for foot height + inset
 * - never set --tg-vv-top / --tg-vv-height
 */
export function useChatViewportHeight(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    const body = document.body;
    let raf = 0;
    let ro: ResizeObserver | null = null;
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
    root.dataset.tgShell = 'composer-fixed-v5';
    root.style.removeProperty('--tg-vv-top');
    root.style.removeProperty('--tg-vv-height');

    const measureFoot = () => {
      const foot = document.querySelector('.tg-chat .tg-thread-foot') as HTMLElement | null;
      if (!foot) {
        root.style.setProperty('--tg-foot-h', '64px');
        return;
      }
      const h = Math.max(48, Math.round(foot.getBoundingClientRect().height));
      root.style.setProperty('--tg-foot-h', `${h}px`);
    };

    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        const layoutH = Math.max(window.innerHeight || 0, root.clientHeight || 0, 1);
        const vvH = vv?.height ?? layoutH;
        const offsetTop = vv?.offsetTop ?? 0;
        let inset = Math.max(0, Math.round(layoutH - vvH - offsetTop));
        // Ignore one-frame collapse / URL-bar jitter; real keyboards are taller.
        if (inset > 0 && inset < 60) inset = 0;
        inset = Math.min(inset, Math.round(layoutH * 0.7));

        root.style.setProperty('--tg-kb-inset', `${inset}px`);
        root.style.removeProperty('--tg-vv-top');
        root.style.removeProperty('--tg-vv-height');
        root.classList.toggle('tg-kb-open', inset > 60);
        measureFoot();
      });
    };

    const onFocusIn = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      // Dense samples through iOS keyboard animation — never window.scrollTo.
      apply();
      for (const ms of [16, 50, 100, 160, 240, 360, 500, 700]) {
        timers.push(window.setTimeout(apply, ms));
      }
    };

    const onFocusOut = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      timers.push(window.setTimeout(apply, 120));
      timers.push(window.setTimeout(apply, 360));
    };

    apply();
    measureFoot();

    const foot = document.querySelector('.tg-chat .tg-thread-foot');
    if (foot && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measureFoot());
      ro.observe(foot);
    }

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
      ro?.disconnect();
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      root.style.removeProperty('--tg-kb-inset');
      root.style.removeProperty('--tg-foot-h');
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
