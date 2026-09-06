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

  // Production pages on petdate.ir → dedicated websocket subdomain.
  const host = window.location.hostname;
  if (host === 'petdate.ir' || host === 'www.petdate.ir' || host === DEFAULT_WS_HOST) {
    return `wss://${DEFAULT_WS_HOST}/api/ws/chat?token=${encodeURIComponent(token)}`;
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/ws/chat?token=${encodeURIComponent(token)}`;
}

/**
 * Live chat transport. Callers should keep a slow ajax poll only when `connected` is false.
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
  const wsRef = useRef<WebSocket | null>(null);
  const subscribedKeyRef = useRef('');

  useEffect(() => {
    if (!enabled || !token) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    let retryMs = 800;
    let retryTimer: number | undefined;
    let pingTimer: number | undefined;

    const connect = () => {
      if (cancelled) return;
      setStatus('connecting');
      const socket = new WebSocket(buildWsUrl(token));
      wsRef.current = socket;

      socket.onopen = () => {
        if (cancelled) {
          socket.close();
          return;
        }
        retryMs = 800;
        setStatus('open');
        subscribedKeyRef.current = '';
        // Force subscribe effect below to re-apply.
        window.dispatchEvent(new Event('petdate:ws-open'));
        window.clearInterval(pingTimer);
        pingTimer = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25_000);
      };

      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data)) as ChatSocketEvent;
          if (data && typeof data === 'object' && 'type' in data) {
            onEventRef.current(data);
          }
        } catch {
          /* ignore */
        }
      };

      socket.onclose = () => {
        if (wsRef.current === socket) wsRef.current = null;
        setStatus('closed');
        window.clearInterval(pingTimer);
        if (cancelled) return;
        retryTimer = window.setTimeout(() => {
          retryMs = Math.min(12_000, Math.round(retryMs * 1.6));
          connect();
        }, retryMs);
      };

      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
      setStatus('idle');
    };
  }, [enabled, token]);

  useEffect(() => {
    const apply = () => {
      const socket = wsRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const key =
        thread?.threadId && thread.channel ? `${thread.channel}:${thread.threadId}` : '';
      if (key === subscribedKeyRef.current) return;
      if (subscribedKeyRef.current) {
        const [channel, id] = subscribedKeyRef.current.split(':');
        socket.send(
          JSON.stringify({ type: 'unsubscribe', channel, threadId: Number(id) }),
        );
      }
      subscribedKeyRef.current = key;
      if (thread?.threadId && thread.channel) {
        socket.send(
          JSON.stringify({
            type: 'subscribe',
            channel: thread.channel,
            threadId: thread.threadId,
          }),
        );
      }
    };

    apply();
    window.addEventListener('petdate:ws-open', apply);
    return () => window.removeEventListener('petdate:ws-open', apply);
  }, [thread?.channel, thread?.threadId, status]);

  return { status, connected: status === 'open' };
}
