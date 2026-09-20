import type { Request } from 'express';

/**
 * Reverse proxies between the public internet and this process (nginx, CDN).
 * Only the right-most `TRUSTED_PROXY_HOPS` entries of `X-Forwarded-For` are
 * written by infrastructure we control; everything to the left of them is
 * whatever the caller sent and must never be treated as an identity.
 */
export const TRUSTED_PROXY_HOPS = parseTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS);

export function parseTrustedProxyHops(raw: string | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 1;
  return Math.floor(n);
}

function normalizeIp(value: string): string {
  const ip = value.trim().replace(/^\[|\]$/g, '');
  // Node reports IPv4 sockets as IPv6-mapped; keep one canonical form per client.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  return (mapped ? mapped[1] : ip).toLowerCase();
}

/**
 * Client IP according to the trusted proxy chain.
 *
 * Counting from the right, hop 1 is the address our own edge proxy observed,
 * so with `hops` trusted proxies the client sits at `entries.length - hops`.
 * Anything further left is attacker-controlled and is ignored — otherwise a
 * caller could reset a rate-limit bucket just by rotating the header.
 */
export function resolveClientIp(
  forwardedFor: string | string[] | undefined,
  socketAddress: string | undefined,
  hops: number = TRUSTED_PROXY_HOPS
): string {
  const fallback = socketAddress ? normalizeIp(socketAddress) : 'unknown';
  if (hops <= 0) return fallback;

  const header = Array.isArray(forwardedFor) ? forwardedFor.join(',') : forwardedFor;
  if (typeof header !== 'string') return fallback;

  const entries = header
    .split(',')
    .map((part) => normalizeIp(part))
    .filter(Boolean);
  if (entries.length === 0) return fallback;

  // Short chain means a proxy did not append; the left-most entry is then the
  // closest thing to a trusted value we have.
  const index = Math.max(0, entries.length - hops);
  return entries[index] ?? fallback;
}

export function getClientIp(req: Request): string {
  return resolveClientIp(req.headers['x-forwarded-for'], req.socket?.remoteAddress);
}
