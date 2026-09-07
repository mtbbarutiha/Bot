import { useEffect } from 'react';

/**
 * Pin the mobile chat shell to the *visual* viewport.
 *
 * Structure contract (see chat.css):
 *   .tg-chat        → fixed; top/height = visualViewport
 *   .tg-thread      → CSS grid: top | scroll | foot
 *   .tg-thread-foot → composer stays in the bottom row
 *
 * Why not padding-bottom / inset:0:
 *   Shrinking height without moving `top` parks a short shell under the status
 *   bar with a white void above the keyboard (live regression). Tracking both
 *   offsetTop and height keeps header + messages + composer inside the visible
 *   area above the soft keyboard.
 *
 * interactive-widget should be overlays-content so the layout viewport stays
 * stable and only visualViewport moves — avoids double-resize fights.
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
    root.dataset.tgShell = 'vv-pin';

    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vv = window.visualViewport;
        const layoutH = Math.max(window.innerHeight || 0, root.clientHeight || 0, 1);
        const rawH = vv?.height ?? layoutH;
        // Floor avoids a one-frame height:0 collapse some iOS builds report mid-resize.
        const height = Math.max(160, Math.round(rawH));
        const offsetTop = Math.max(0, Math.round(vv?.offsetTop ?? 0));
        const kbOpen = layoutH - rawH > 40 || offsetTop > 24;

        root.style.setProperty('--tg-vv-height', `${height}px`);
        root.style.setProperty('--tg-vv-top', `${offsetTop}px`);
        // Keep kb-inset as 0 for any leftover consumers (sheets); shell no longer pads.
        root.style.setProperty('--tg-kb-inset', '0px');
        root.classList.toggle('tg-kb-open', kbOpen);
      });
    };

    const onFocusIn = (ev: FocusEvent) => {
      const t = ev.target;
      if (!(t instanceof HTMLElement) || !t.closest('.tg-chat')) return;
      // Re-measure through keyboard animation — never window.scrollTo.
      apply();
      for (const ms of [50, 100, 200, 350]) {
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
      root.style.removeProperty('--tg-vv-height');
      root.style.removeProperty('--tg-vv-top');
      root.style.removeProperty('--tg-kb-inset');
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
