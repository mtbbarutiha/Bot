import { Bot } from 'grammy';
import { applyBotBranding } from './branding';
import { assertBotToken, config } from './config';
import { requiredChannels } from './force-join';
import { registerHandlers } from './handlers';
import { connectRedis, disconnectRedis } from './session';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

async function warnForceJoinAdminRights(bot: Bot): Promise<void> {
  const me = await bot.api.getMe();
  for (const ch of requiredChannels()) {
    const chatId = `@${ch.username}`;
    try {
      const member = await bot.api.getChatMember(chatId, me.id);
      if (member.status !== 'administrator' && member.status !== 'creator') {
        console.warn(
          `   Force-join: bot is "${member.status}" in ${chatId} — must be admin to verify membership`
        );
      } else {
        console.log(`   Force-join: OK admin in ${chatId}`);
      }
    } catch (err) {
      console.warn(
        `   Force-join: cannot access ${chatId} — add @${me.username} as channel admin. (${(err as Error).message})`
      );
    }
  }
}

async function main(): Promise<void> {
  const token = assertBotToken();
  await connectRedis();

  const bot = new Bot(token);
  registerHandlers(bot);
  await applyBotBranding(bot.api);
  await warnForceJoinAdminRights(bot);

  bot.catch((err) => {
    console.error('Bot error:', err.error);
  });

  if (config.webhookUrl) {
    const secret = config.webhookSecret ?? `petdate-${Date.now()}`;
    await bot.api.setWebhook(config.webhookUrl, { secret_token: secret });
    console.log(`🤖 petdate bot webhook → ${config.webhookUrl}`);
    console.log('   (برای dev از polling استفاده کن — BOT_WEBHOOK_URL را خالی بگذار)');
  } else {
    console.log('🤖 petdate bot (polling) — Ctrl+C برای توقف');
    const webUrl = effectiveWebUrl();
    if (!isTelegramInlineUrl(webUrl)) {
      console.warn(`   Web links disabled in chat (set PUBLIC_WEB_URL for HTTPS tunnel): ${webUrl}`);
    }
    await bot.start({
      onStart: () => console.log(`   API: ${config.apiUrl} | Web: ${config.webUrl}`),
    });
  }
}

async function shutdown(): Promise<void> {
  await disconnectRedis();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
