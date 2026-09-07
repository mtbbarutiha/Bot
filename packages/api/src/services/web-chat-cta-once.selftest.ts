/**
 * web-cta-once-v2 — Prove second claim for the same chat+user is denied.
 * Run: npx tsx src/services/web-chat-cta-once.selftest.ts
 */
import { claimWebChatCtaOnce, WEB_CTA_ONCE_MARKER } from './web-chat-cta-once';

async function main() {
  // Force memory path: hasRedisConfig may be false in this env.
  const kind = 'vet' as const;
  const chatId = 9_000_001 + Math.floor(Math.random() * 1000);
  const tg = `selftest_${Date.now()}`;

  const first = await claimWebChatCtaOnce(kind, chatId, tg);
  const second = await claimWebChatCtaOnce(kind, chatId, tg);
  const otherUser = await claimWebChatCtaOnce(kind, chatId, `${tg}_b`);
  const otherChat = await claimWebChatCtaOnce(kind, chatId + 1, tg);

  if (!first) throw new Error('first claim must succeed');
  if (second) throw new Error('second claim must fail (no duplicate CTA)');
  if (!otherUser) throw new Error('other user on same chat must get own CTA once');
  if (!otherChat) throw new Error('same user on other chat must get CTA once');
  if (WEB_CTA_ONCE_MARKER !== 'web-cta-once-v2') {
    throw new Error(`expected marker web-cta-once-v2, got ${WEB_CTA_ONCE_MARKER}`);
  }

  console.log(
    `${WEB_CTA_ONCE_MARKER}.selftest: OK (second message would not append CTA)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
