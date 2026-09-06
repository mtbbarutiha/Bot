/** Cross-page ajax signal when pending playmate / vet requests change. */
export const INCOMING_REFRESH_EVENT = 'petdate:incoming-refresh';

export type IncomingRefreshDetail = {
  kinds?: Array<'playmate' | 'vet'>;
  ids?: number[];
};

export function emitIncomingRefresh(detail?: IncomingRefreshDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(INCOMING_REFRESH_EVENT, { detail }));
}

export function subscribeIncomingRefresh(
  handler: (detail?: IncomingRefreshDetail) => void,
) {
  const listener = (e: Event) => {
    handler((e as CustomEvent<IncomingRefreshDetail>).detail);
  };
  window.addEventListener(INCOMING_REFRESH_EVENT, listener);
  return () => window.removeEventListener(INCOMING_REFRESH_EVENT, listener);
}
