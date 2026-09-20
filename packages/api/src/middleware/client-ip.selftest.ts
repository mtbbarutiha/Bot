/**
 * Prove a caller cannot pick their own rate-limit bucket by prepending
 * X-Forwarded-For entries.
 * Run: npx tsx src/middleware/client-ip.selftest.ts
 */
import { parseTrustedProxyHops, resolveClientIp } from './client-ip';

function eq(actual: string, expected: string, what: string) {
  if (actual !== expected) throw new Error(`${what}: expected ${expected}, got ${actual}`);
}

const EDGE = '203.0.113.10';
const CLIENT = '198.51.100.7';

// One proxy (nginx) appends the real client, so that entry is the only trusted one.
eq(resolveClientIp(CLIENT, EDGE, 1), CLIENT, 'single trusted hop');

// Spoofed prefix must be ignored — all four of these are the same caller.
for (const spoof of ['1.1.1.1', '9.9.9.9', 'not-an-ip', '::1']) {
  eq(resolveClientIp(`${spoof}, ${CLIENT}`, EDGE, 1), CLIENT, `spoofed prefix ${spoof}`);
}
eq(resolveClientIp(`1.1.1.1, 2.2.2.2, ${CLIENT}`, EDGE, 1), CLIENT, 'long spoofed chain');

// Two trusted proxies (CDN in front of nginx): client is two from the right.
eq(resolveClientIp(`1.1.1.1, ${CLIENT}, ${EDGE}`, EDGE, 2), CLIENT, 'two trusted hops');

// No header, or no trusted proxy at all: the socket peer is the only truth.
eq(resolveClientIp(undefined, EDGE, 1), EDGE, 'missing header');
eq(resolveClientIp(`1.1.1.1, ${CLIENT}`, EDGE, 0), EDGE, 'no trusted proxy');
eq(resolveClientIp('', EDGE, 1), EDGE, 'empty header');
eq(resolveClientIp(undefined, undefined, 1), 'unknown', 'no socket address');

// IPv6-mapped IPv4 collapses to one bucket per client.
eq(resolveClientIp(`::ffff:${CLIENT}`, EDGE, 1), CLIENT, 'ipv6-mapped ipv4');
eq(resolveClientIp('[2001:db8::1]', EDGE, 1), '2001:db8::1', 'bracketed ipv6');

// Repeated header (Node gives an array) is still read from the right.
eq(resolveClientIp(['1.1.1.1', CLIENT], EDGE, 1), CLIENT, 'array header');

eq(String(parseTrustedProxyHops(undefined)), '1', 'default hops');
eq(String(parseTrustedProxyHops('2')), '2', 'configured hops');
eq(String(parseTrustedProxyHops('0')), '0', 'zero hops');
eq(String(parseTrustedProxyHops('-3')), '1', 'negative hops fall back to default');
eq(String(parseTrustedProxyHops('nope')), '1', 'garbage hops fall back to default');

console.log('client-ip.selftest: OK (X-Forwarded-For prefix cannot move the bucket)');
