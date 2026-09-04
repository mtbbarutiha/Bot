/**
 * Minimal offline checks for phone normalize + Candoo request shape.
 * Run: npx tsx packages/api/src/services/candoo.selftest.ts
 */
import { formatIranMobileDisplay, normalizeIranMobile } from '@petdate/shared';
import { buildSendPayload } from './candoo';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const cases: Array<[string, string | null]> = [
  ['09121234567', '989121234567'],
  ['+989121234567', '989121234567'],
  ['989121234567', '989121234567'],
  ['9121234567', '989121234567'],
  ['۰۹۱۲۱۲۳۴۵۶۷', '989121234567'],
  ['02188776655', null],
  ['123', null],
];

for (const [raw, expected] of cases) {
  const got = normalizeIranMobile(raw);
  assert(got === expected, `normalize(${raw}) => ${got}, expected ${expected}`);
}

assert(formatIranMobileDisplay('989121234567') === '09121234567', 'display format');

const payload = buildSendPayload([
  {
    srcNum: '989999176033',
    recipient: '989121234567',
    body: 'کد تایید همبازی: 12345',
    type: 1,
    retryCount: 2,
    validityPeriod: 300,
    customerId: 42,
  },
]);

assert(Array.isArray(payload) && payload.length === 1, 'payload is array');
assert(payload[0]!.srcNum === '989999176033', 'srcNum');
assert(payload[0]!.recipient === '989121234567', 'recipient');
assert(payload[0]!.type === 1, 'OTP type=1');
assert(payload[0]!.body.includes('12345'), 'body has code');

console.log('candoo.selftest: OK');
