import nodemailer from 'nodemailer';

function smtpHost(): string {
  return String(process.env.SMTP_HOST ?? '').trim();
}

export function isSmtpConfigured(): boolean {
  return Boolean(smtpHost());
}

/** Send a plain-text (+ simple HTML) email via SMTP. Never logs message body. */
export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const host = smtpHost();
  if (!host) {
    return { ok: false, error: 'SMTP پیکربندی نشده' };
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const user = String(process.env.SMTP_USER ?? '').trim();
  const pass = String(process.env.SMTP_PASS ?? process.env.SMTP_PASSWORD ?? '').trim();
  const fromAddr = String(process.env.SMTP_FROM ?? '').trim() || user || 'noreply@petdate.ir';
  const fromName = String(process.env.SMTP_FROM_NAME ?? '').trim() || 'PetDate';
  const secure =
    process.env.SMTP_SECURE === '1' ||
    process.env.SMTP_SECURE === 'true' ||
    port === 465;

  const rejectUnauthorized =
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED === '1'
      ? true
      : process.env.SMTP_TLS_REJECT_UNAUTHORIZED === '0'
        ? false
        : // Local/unauthenticated relays (often :25) commonly use self-signed certs
          Boolean(user && pass);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 20_000,
      tls: { rejectUnauthorized },
    });

    await transporter.sendMail({
      from: `"${fromName.replace(/"/g, '')}" <${fromAddr}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: `<pre style="font-family:tahoma,arial,sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(
        opts.text
      )}</pre>`,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('smtp send failed:', message);
    return { ok: false, error: 'ارسال ایمیل ناموفق بود' };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
