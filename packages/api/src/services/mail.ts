import nodemailer from 'nodemailer';
import { dbService } from '../db';

function smtpHost(): string {
  return String(process.env.SMTP_HOST ?? '').trim();
}

function isLocalSmtpHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === '127.0.0.1' || h === 'localhost' || h === '::1';
}

function smtpAuth(): { user: string; pass: string } {
  const user = String(process.env.SMTP_USER ?? '').trim();
  const pass = String(process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? '').trim();
  return { user, pass };
}

function smtpFrom(): { addr: string; name: string } {
  const { user } = smtpAuth();
  const addr = String(process.env.SMTP_FROM ?? '').trim() || user || 'no-reply@petdate.ir';
  const name = String(process.env.SMTP_FROM_NAME ?? '').trim() || 'PetDate';
  return { addr, name };
}

function smtpTlsFlags(host: string, port: number, hasAuth: boolean): {
  secure: boolean;
  ignoreTls: boolean;
  rejectUnauthorized: boolean;
} {
  const secure =
    process.env.SMTP_SECURE === '1' ||
    process.env.SMTP_SECURE === 'true' ||
    port === 465;
  const local = isLocalSmtpHost(host);
  const ignoreTls =
    process.env.SMTP_IGNORE_TLS === '1' ||
    process.env.SMTP_IGNORE_TLS === 'true' ||
    (local && process.env.SMTP_IGNORE_TLS !== '0' && process.env.SMTP_IGNORE_TLS !== 'false');
  const rejectUnauthorized =
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED === '1'
      ? true
      : process.env.SMTP_TLS_REJECT_UNAUTHORIZED === '0'
        ? false
        : local
          ? false
          : Boolean(hasAuth);
  return { secure, ignoreTls, rejectUnauthorized };
}

export function isSmtpConfigured(): boolean {
  return Boolean(smtpHost());
}

/** Safe SMTP snapshot for admin UI — never includes password. */
export function getSmtpPublicConfig(): {
  configured: boolean;
  host: string | null;
  port: number;
  from: string;
  fromName: string;
  user: string | null;
  authConfigured: boolean;
  secure: boolean;
  ignoreTls: boolean;
  tlsRejectUnauthorized: boolean;
  localHost: boolean;
} {
  const host = smtpHost();
  const port = Number(process.env.SMTP_PORT) || 587;
  const { user, pass } = smtpAuth();
  const { addr, name } = smtpFrom();
  const hasAuth = Boolean(user && pass);
  const flags = smtpTlsFlags(host || '127.0.0.1', port, hasAuth);
  return {
    configured: Boolean(host),
    host: host || null,
    port,
    from: addr,
    fromName: name,
    user: user || null,
    authConfigured: hasAuth,
    secure: flags.ignoreTls ? false : flags.secure,
    ignoreTls: flags.ignoreTls,
    tlsRejectUnauthorized: flags.rejectUnauthorized,
    localHost: host ? isLocalSmtpHost(host) : false,
  };
}

export type SendMailResult =
  | { ok: true }
  | { ok: false; error: string; detail?: string };

/** Send a plain-text (+ HTML) email via SMTP. Never logs message body. */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  /** Full HTML body; when omitted, a simple RTL wrapper of `text` is used. */
  html?: string;
  purpose?: string;
}): Promise<SendMailResult> {
  const host = smtpHost();
  const purpose = (opts.purpose || 'mail').slice(0, 64);
  if (!host) {
    dbService.createEmailSendLog({
      to: opts.to,
      subject: opts.subject,
      purpose,
      ok: false,
      error: 'SMTP پیکربندی نشده',
    });
    return { ok: false, error: 'SMTP پیکربندی نشده' };
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const { user, pass } = smtpAuth();
  const { addr: fromAddr, name: fromName } = smtpFrom();
  const hasAuth = Boolean(user && pass);
  const local = isLocalSmtpHost(host);
  const { secure, ignoreTls, rejectUnauthorized } = smtpTlsFlags(host, port, hasAuth);
  const html =
    opts.html?.trim() ||
    `<div dir="rtl" style="font-family:tahoma,arial,sans-serif;font-size:15px;line-height:1.7;white-space:pre-wrap">${escapeHtml(
      opts.text
    )}</div>`;

  const fromDomain = fromAddr.includes('@') ? fromAddr.split('@').pop()! : 'petdate.ir';
  const mailHost = String(process.env.SMTP_HELO_NAME ?? '').trim() || 'mail.petdate.ir';
  const replyTo =
    String(process.env.SMTP_REPLY_TO ?? '').trim() ||
    (fromAddr.toLowerCase().startsWith('no-reply@') || fromAddr.toLowerCase().startsWith('noreply@')
      ? `info@${fromDomain}`
      : undefined);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      // EHLO/HELO identity — must match mail hostname (not OS hostname)
      name: mailHost,
      secure: ignoreTls ? false : secure,
      auth: hasAuth ? { user, pass } : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
      ignoreTLS: ignoreTls || undefined,
      tls: { rejectUnauthorized },
    });

    const messageId = `<${Date.now().toString(36)}.${Math.random().toString(36).slice(2, 12)}@${fromDomain}>`;
    const isTransactional =
      purpose === 'login_otp' || purpose.endsWith('_otp') || purpose === 'admin_test';

    await transporter.sendMail({
      from: `"${fromName.replace(/"/g, '')}" <${fromAddr}>`,
      // Envelope-from (Return-Path) must align with From for SPF/DMARC
      envelope: { from: fromAddr, to: opts.to },
      to: opts.to,
      replyTo: replyTo || undefined,
      subject: opts.subject,
      text: opts.text,
      html,
      messageId,
      headers: {
        'MIME-Version': '1.0',
        ...(isTransactional
          ? {
              'Auto-Submitted': 'auto-generated',
              'X-Auto-Response-Suppress': 'All',
            }
          : {}),
      },
    });
    dbService.createEmailSendLog({
      to: opts.to,
      subject: opts.subject,
      purpose,
      ok: true,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('smtp send failed:', message, {
      host,
      port,
      local,
      ignoreTls,
      rejectUnauthorized,
      secure: ignoreTls ? false : secure,
      auth: hasAuth,
    });
    dbService.createEmailSendLog({
      to: opts.to,
      subject: opts.subject,
      purpose,
      ok: false,
      error: message.slice(0, 500),
    });
    return {
      ok: false,
      error: 'ارسال ایمیل ناموفق بود',
      detail: message.slice(0, 500),
    };
  }
}

/** Basic admin/public email shape check (not full RFC). */
export function isPlausibleEmail(raw: string): boolean {
  const email = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, '');
  if (!email || email.length > 200 || email.includes('..')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
