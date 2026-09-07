/**
 * Self-test: publicWebOrigin must prefer petdate.ir and never emit raw VPS IP.
 * Run: npx tsx src/services/prescription-html.selftest.ts
 */
import {
  publicWebOrigin,
  prescriptionPublicUrl,
  prescriptionWebPath,
} from './prescription-html';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const prev = {
  PUBLIC_API_URL: process.env.PUBLIC_API_URL,
  PUBLIC_WEB_URL: process.env.PUBLIC_WEB_URL,
  WEB_URL: process.env.WEB_URL,
  PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN,
  APP_PUBLIC_URL: process.env.APP_PUBLIC_URL,
  WEB_PUBLIC_URL: process.env.WEB_PUBLIC_URL,
  API_PUBLIC_URL: process.env.API_PUBLIC_URL,
};

function clear() {
  for (const k of Object.keys(prev) as (keyof typeof prev)[]) {
    delete process.env[k];
  }
}

function restore() {
  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

try {
  clear();
  process.env.PUBLIC_API_URL = 'http://185.110.189.218';
  process.env.PUBLIC_WEB_URL = 'https://petdate.ir';
  assert(publicWebOrigin() === 'https://petdate.ir', 'prefer PUBLIC_WEB_URL over IP API');
  assert(
    prescriptionPublicUrl(3) === 'https://petdate.ir/rx/3',
    `expected domain rx link, got ${prescriptionPublicUrl(3)}`
  );

  clear();
  process.env.PUBLIC_API_URL = 'http://185.110.189.218';
  assert(publicWebOrigin() === 'https://petdate.ir', 'skip raw IP → SITE.origin');
  assert(!publicWebOrigin().includes('185.110'), 'must not include VPS IP');

  clear();
  process.env.WEB_URL = 'https://www.petdate.ir/';
  assert(publicWebOrigin() === 'https://www.petdate.ir', 'strip trailing slash');

  clear();
  assert(publicWebOrigin('185.110.189.218') === 'https://petdate.ir', 'reqHost IP ignored');
  assert(prescriptionWebPath(12) === '/rx/12', 'path');

  console.log('prescription-html.selftest: ok');
} finally {
  restore();
}
