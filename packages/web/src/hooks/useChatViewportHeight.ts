import { useEffect } from 'react';

/**
 * Mobile chat keyboard — composer-fixed-v7.
 *
 * v6 peak-inset lock could freeze a BAD huge inset (transient tiny
 * visualViewport.height), which parks `bottom: inset` near the TOP.
 *
 * v7:
 * - Reject garbage VV readings (height too small)
 * - Cap keyboard inset to ~55% of layout height
 * - Peak lock only within that cap
 * - Foot stays fixed to visual viewport bottom
 */
export function useChatViewportHeight(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    const body = document.body;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    let peakInset = 0;
    let lastGoodInset = 0;
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
    root.dataset.tgShell = 'composer-fixed-v7';
    root.style.removeProperty('--tg-vv-top');
    root.style.removeProperty('--tg-vv-height');

    const composerFocused = () => {
      const el = document.activeElement;
      return (
        el instanceof HTMLElement &&
        Boolean(el.closest('.tg-chat .tg-composer, .tg-chat textarea'))
      );
    };

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
        const maxKb = Math.round(layoutH * 0.55);
        const vvH = vv?.height ?? layoutH;
        const offsetTop = vv?.offsetTop ?? 0;

        let inset = 0;
        // Ignore one-frame collapse / URL-bar noise / absurd VV heights.
        if (vvH >= Math.min(180, layoutH * 0.35)) {
          inset = Math.max(0, Math.round(layoutH - vvH - offsetTop));
          if (inset > 0 && inset < 70) inset = 0;
          inset = Math.min(inset, maxKb);
          if (inset >= 70) lastGoodInset = inset;
        } else if (composerFocused() && lastGoodInset >= 70) {
          inset = lastGoodInset;
        }

        const focused = composerFocused();
        if (focused) {
          if (inset >= 70 && inset > peakInset) peakInset = inset;
          if (peakInset >= 70) {
            inset = Math.max(inset, Math.min(peakInset, maxKb) - 12);
          }
        } else {
          peakInset = inset >= 70 ? inset : 0;
          if (!inset) lastGoodInset = 0;
        }

        inset = Math.min(Math.max(0, inset), maxKb);
        const visible = Math.max(160, Math.round((vvH > 120 ? vvH : layoutH - inset) - 72));
        root.style.setProperty('--tg-kb-inset', `${inset}px`);
        root.style.setProperty('--tg-foot-max', `${visible}px`);
        root.style.removeProperty('--tg-vv-top');
        root.style.removeProperty('--tg-vv-height');
        root.classList.toggle('tg-kb-open', inset > 70);
        measureFoot();
      });
    };

    const onFocusIn = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      apply();
      for (const ms of [16, 50, 100, 160, 240, 360, 500, 700]) {
        timers.push(window.setTimeout(apply, ms));
      }
    };

    const onFocusOut = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      peakInset = 0;
      timers.push(window.setTimeout(apply, 120));
      timers.push(window.setTimeout(apply, 360));
    };

    const onInput = (ev: Event) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat .tg-composer')) return;
      apply();
    };

    apply();
    measureFoot();

    const foot = document.querySelector('.tg-chat .tg-thread-foot');
    if (foot && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        measureFoot();
        apply();
      });
      ro.observe(foot);
    }

    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('input', onInput, true);

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
      document.removeEventListener('input', onInput, true);
      root.style.removeProperty('--tg-kb-inset');
      root.style.removeProperty('--tg-foot-h');
      root.style.removeProperty('--tg-foot-max');
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
