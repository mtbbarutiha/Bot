import { useEffect, useRef, useState } from 'react';

export type ChatSocketEvent =
  | {
      type: 'inbox';
      kind: 'playmate' | 'vet' | 'any';
      reason?: string;
      id?: number;
    }
  | {
      type: 'message';
      channel: 'playmate' | 'vet';
      threadId: number;
      message: unknown;
    }
  | {
      type: 'thread';
      channel: 'playmate' | 'vet';
      threadId: number;
      patch: Record<string, unknown>;
    }
  | {
      type: 'presence';
      userId: number;
      online: boolean;
      lastSeenAt?: string | null;
    }
  | { type: 'hello'; userId: number }
  | { type: 'error'; message: string };

export type ChatSocketStatus = 'idle' | 'connecting' | 'open' | 'closed';

type ThreadSub = { channel: 'playmate' | 'vet'; threadId: number } | null | undefined;

/** Dedicated WS host (bypasses main-site CDN when DNS points to origin). */
const DEFAULT_WS_HOST = 'ws.petdate.ir';

/** After this many hard failures, pause reconnects until the tab is focused again. */
const MAX_FAILURES_BEFORE_PAUSE = 3;
const PAUSE_RETRY_MS = 60_000;
const MAX_BACKOFF_MS = 30_000;

type Listener = (event: ChatSocketEvent) => void;

type SharedSocket = {
  token: string;
  ws: WebSocket | null;
  status: ChatSocketStatus;
  failures: number;
  pausedUntil: number;
  retryTimer: number | undefined;
  pingTimer: number | undefined;
  retryMs: number;
  listeners: Set<Listener>;
  statusListeners: Set<(status: ChatSocketStatus) => void>;
  threadKey: string;
  refCount: number;
};

let shared: SharedSocket | null = null;

function buildWsUrl(token: string): string {
  const explicit =
    (import.meta.env.VITE_WS_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (explicit.startsWith('ws://') || explicit.startsWith('wss://')) {
    const u = new URL(explicit);
    if (!u.pathname || u.pathname === '/') u.pathname = '/api/ws/chat';
    u.search = `token=${encodeURIComponent(token)}`;
    return u.toString();
  }

  const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const u = new URL(apiBase);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = `${u.pathname.replace(/\/$/, '')}/api/ws/chat`;
    u.search = `token=${encodeURIComponent(token)}`;
    return u.toString();
  }

  // Production: dedicated WS host (CDN on petdate.ir blocks Upgrade with 404).
  // If DNS for ws.petdate.ir still points at CDN, the circuit breaker pauses retries.
  const host = window.location.hostname;
  if (host === 'petdate.ir' || host === 'www.petdate.ir' || host === DEFAULT_WS_HOST) {
    return `wss://${DEFAULT_WS_HOST}/api/ws/chat?token=${encodeURIComponent(token)}`;
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/ws/chat?token=${encodeURIComponent(token)}`;
}

function setSharedStatus(next: ChatSocketStatus) {
  if (!shared || shared.status === next) return;
  shared.status = next;
  for (const fn of shared.statusListeners) fn(next);
}

function clearSharedTimers() {
  if (!shared) return;
  window.clearTimeout(shared.retryTimer);
  window.clearInterval(shared.pingTimer);
  shared.retryTimer = undefined;
  shared.pingTimer = undefined;
}

function scheduleReconnect() {
  if (!shared) return;
  clearSharedTimers();

  const now = Date.now();
  if (shared.failures >= MAX_FAILURES_BEFORE_PAUSE) {
    shared.pausedUntil = Math.max(shared.pausedUntil, now + PAUSE_RETRY_MS);
  }
  const wait = Math.max(shared.retryMs, shared.pausedUntil - now);
  shared.retryTimer = window.setTimeout(() => {
    if (!shared) return;
    shared.retryMs = Math.min(MAX_BACKOFF_MS, Math.round(shared.retryMs * 1.7));
    openSharedSocket();
  }, wait);
}

function openSharedSocket() {
  if (!shared) return;
  if (shared.ws &&
    (shared.ws.readyState === WebSocket.OPEN || shared.ws.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  setSharedStatus('connecting');
  const token = shared.token;
  let socket: WebSocket;
  try {
    socket = new WebSocket(buildWsUrl(token));
  } catch {
    shared.failures += 1;
    setSharedStatus('closed');
    scheduleReconnect();
    return;
  }
  shared.ws = socket;

  socket.onopen = () => {
    if (!shared || shared.ws !== socket) return;
    shared.failures = 0;
    shared.pausedUntil = 0;
    shared.retryMs = 800;
    shared.threadKey = '';
    setSharedStatus('open');
    window.dispatchEvent(new Event('petdate:ws-open'));
    clearSharedTimers();
    shared.pingTimer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);
  };

  socket.onmessage = (ev) => {
    if (!shared) return;
    try {
      const data = JSON.parse(String(ev.data)) as ChatSocketEvent;
      if (data && typeof data === 'object' && 'type' in data) {
        for (const fn of shared.listeners) fn(data);
      }
    } catch {
      /* ignore */
    }
  };

  socket.onclose = () => {
    if (!shared || shared.ws !== socket) return;
    shared.ws = null;
    shared.failures += 1;
    setSharedStatus('closed');
    window.clearInterval(shared.pingTimer);
    shared.pingTimer = undefined;
    if (shared.refCount <= 0) return;
    scheduleReconnect();
  };

  socket.onerror = () => {
    try {
      socket.close();
    } catch {
      /* ignore */
    }
  };
}

function retainShared(token: string) {
  if (shared && shared.token !== token) {
    releaseShared(true);
  }
  if (!shared) {
    shared = {
      token,
      ws: null,
      status: 'idle',
      failures: 0,
      pausedUntil: 0,
      retryTimer: undefined,
      pingTimer: undefined,
      retryMs: 800,
      listeners: new Set(),
      statusListeners: new Set(),
      threadKey: '',
      refCount: 0,
    };
  }
  shared.refCount += 1;
  if (!shared.ws || shared.ws.readyState === WebSocket.CLOSED) {
    openSharedSocket();
  }
  return shared;
}

function releaseShared(force = false) {
  if (!shared) return;
  if (!force) shared.refCount = Math.max(0, shared.refCount - 1);
  if (!force && shared.refCount > 0) return;

  clearSharedTimers();
  try {
    shared.ws?.close();
  } catch {
    /* ignore */
  }
  shared = null;
}

function applyThreadSub(thread: ThreadSub) {
  if (!shared?.ws || shared.ws.readyState !== WebSocket.OPEN) return;
  const key =
    thread?.threadId && thread.channel ? `${thread.channel}:${thread.threadId}` : '';
  if (key === shared.threadKey) return;
  if (shared.threadKey) {
    const [channel, id] = shared.threadKey.split(':');
    shared.ws.send(
      JSON.stringify({ type: 'unsubscribe', channel, threadId: Number(id) }),
    );
  }
  shared.threadKey = key;
  if (thread?.threadId && thread.channel) {
    shared.ws.send(
      JSON.stringify({
        type: 'subscribe',
        channel: thread.channel,
        threadId: thread.threadId,
      }),
    );
  }
}

/**
 * Live chat transport (shared singleton).
 * Callers should keep a slow ajax poll only when `connected` is false.
 * Reconnects are circuit-broken after repeated CDN/WS failures so the chats
 * page does not thrash.
 */
export function useChatSocket({
  token,
  enabled,
  thread,
  onEvent,
}: {
  token: string | null | undefined;
  enabled: boolean;
  thread?: ThreadSub;
  onEvent: (event: ChatSocketEvent) => void;
}): { status: ChatSocketStatus; connected: boolean } {
  const [status, setStatus] = useState<ChatSocketStatus>('idle');
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !token) {
      setStatus('idle');
      return;
    }

    const sock = retainShared(token);
    setStatus(sock.status);

    const listener: Listener = (event) => onEventRef.current(event);
    const onStatus = (next: ChatSocketStatus) => setStatus(next);
    sock.listeners.add(listener);
    sock.statusListeners.add(onStatus);

    const onVis = () => {
      if (document.visibilityState !== 'visible' || !shared) return;
      // Allow a fresh attempt after a pause when the user comes back.
      if (shared.status !== 'open' && Date.now() >= shared.pausedUntil) {
        shared.failures = 0;
        shared.retryMs = 800;
        openSharedSocket();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      sock.listeners.delete(listener);
      sock.statusListeners.delete(onStatus);
      releaseShared();
    };
  }, [enabled, token]);

  useEffect(() => {
    const apply = () => applyThreadSub(thread);
    apply();
    window.addEventListener('petdate:ws-open', apply);
    return () => window.removeEventListener('petdate:ws-open', apply);
  }, [thread?.channel, thread?.threadId, status]);

  return { status, connected: status === 'open' };
}
