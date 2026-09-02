import { Bot } from 'grammy';
import { assertBotToken, config } from './config';
import { registerHandlers } from './handlers';
import { connectRedis, disconnectRedis } from './session';
import { effectiveWebUrl, isTelegramInlineUrl } from './urls';

async function main(): Promise<void> {
  const token = assertBotToken();
  await connectRedis();

  const bot = new Bot(token);
  registerHandlers(bot);

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
