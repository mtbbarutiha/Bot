import { config } from './config';

/** Public HTTPS URL for Telegram inline buttons (falls back to WEB_URL). */
export function effectiveWebUrl(): string {
  return config.publicWebUrl ?? config.webUrl;
}

/** Telegram rejects localhost and private URLs in inline keyboard link buttons. */
export function isTelegramInlineUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) {
      return false;
    }
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function webLinkHint(): string {
  const url = effectiveWebUrl();
  if (isTelegramInlineUrl(url)) return '';
  return `\n\n🌐 برای ادامه در مرورگر:\n${url}`;
}
