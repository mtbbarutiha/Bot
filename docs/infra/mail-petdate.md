# ایمیل petdate.ir — Postfix + Dovecot + OpenDKIM

Mailbox هدف: **`info@petdate.ir`** (آلیاس برند: `hello@petdate.ir` → همان inbox).

VPS مبدأ: `185.110.189.218` — هاست میل: `mail.petdate.ir`

## وضعیت فعلی DNS (بررسی ۲۰۲۶-۰۹-۰۶)

| رکورد | مقدار فعلی | مشکل |
|--------|------------|------|
| `MX petdate.ir` | `10 185.110.189.218.` | بهتر است `10 mail.petdate.ir.` باشد (نه IP خام) |
| `A mail.petdate.ir` | `185.239.1.100` (WCDN) | **غلط** — میل نباید از CDN رد شود |
| `A petdate.ir` | `185.110.189.218` | برای origin OK |
| `TXT @` (SPF) | `v=spf1 ip4:185.110.189.218 a:mail.petdate.ir mx -all` | تا وقتی `A mail` غلط است، `a:mail.petdate.ir` را حذف کنید یا بعد از اصلاح نگه دارید |
| `TXT mail._domainkey` | `"RSA"` و `"185.110.189.218"` | **غلط کامل** — باید کلید DKIM یک‌خطی باشد (پایین) |
| `TXT _dmarc` | `"SPF"` | **غلط** — باید رکورد DMARC باشد |

> احتمالاً مقادیر DKIM/DMARC/IP جابه‌جا در پنل DNS ثبت شده‌اند. رکوردهای TXT اشتباه را **حذف** و با مقادیر درست جایگزین کنید.

## رکوردهای DNS که باید اضافه/اصلاح کنید

در پنل DNS پارزپک (یا رجیسترار). برای ساب‌دامین میل: **فقط DNS / grey cloud — بدون پروکسی WCDN**.

| نوع | نام | مقدار | یادداشت |
|------|-----|--------|---------|
| **A** | `mail` | `185.110.189.218` | **اجباری** — نباید `185.239.1.100` باشد |
| **MX** | `@` / `petdate.ir` | `10 mail.petdate.ir.` | به‌جای IP خام |
| **TXT** | `@` | `v=spf1 ip4:185.110.189.218 mx -all` | SPF (ساده و امن تا mail A درست شود) |
| **TXT** | `mail._domainkey` | ببینید بلوک DKIM پایین | OpenDKIM selector=`mail` — **یک رکورد TXT** |
| **TXT** | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@petdate.ir; fo=1` | شروع با `p=none` |

### مقدار TXT برای `mail._domainkey` (یک خط — کپی کامل)

```
v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtFt173AGZkIYu6UPE2qbmAjlYtd7DzfelmmBAH/n7XBrlvZFh2beekfxMNw8OYCcAWobiZcPdcXNtzSK4sFbkSVoSFqJ6a/krm1R+aOAjnKsYgfn6Hhmu/mDQOXxFNVqEhCdByONCfWihrs12uwwTTlCCro4W41qHlf4sCm8xnT9yEq4j1glLyxk5WMLuz4jygs2uAbv1oj7WmhGCzPu1TQOFkxwpgJ97VZZRnwRgOeD9P465BdfgxkQyVfFX6ukijuqg/hpGZWlOIqTVj+jlbKsCfxD2ZkLNCotnSjRre0o8EuvYRtYX6SYHqUvFtwdlQ53kr/M+CuFPjujt7MivQIDAQAB
```

کپی دوباره از سرور:

```bash
ssh root@185.110.189.218 'cat /root/.petdate-mail/dkim-txt-oneline.txt'
```

اختیاری ولی مهم برای deliverability: از پشتیبانی هاست بخواهید **PTR** آی‌پی `185.110.189.218` را به `mail.petdate.ir` تنظیم کند (الان `srv5498305369` است).

پس از اینکه `A mail.petdate.ir` به origin اشاره کرد:

```bash
certbot certonly --nginx -d mail.petdate.ir
# سپس دوباره:
bash /opt/petdate/infra/mail/setup-mail.sh
```

## دسترسی به mailbox

| | |
|--|--|
| آدرس | `info@petdate.ir` |
| آلیاس | `hello@petdate.ir` |
| IMAP | `mail.petdate.ir` پورت **993** (SSL) |
| SMTP | `mail.petdate.ir` پورت **587** (STARTTLS) یا **465** (SSL) |
| Username | `info@petdate.ir` (آدرس کامل) |

رمز روی سرور است (در چت چاپ نمی‌شود):

```bash
ssh root@185.110.189.218 'sudo cat /root/.petdate-mail/info.password'
```

ریست رمز:

```bash
ssh root@185.110.189.218 'bash /opt/petdate/infra/mail/reset-mailbox-password.sh info'
```

تا وقتی DNS میل به origin نرسیده، کلاینت می‌تواند موقتاً به IP مستقیم وصل شود (با هشدار گواهی self-signed): هاست `185.110.189.218`.

## نصب روی VPS

```bash
cd /opt/petdate
bash infra/mail/setup-mail.sh
```

اسکریپت: Postfix + Dovecot + OpenDKIM، فایروال پورت‌های 25/465/587/993، mailbox مجازی، آلیاس hello/postmaster/abuse. nginx روی 80/443 دست نخورده می‌ماند.

## SMTP اپ (OTP ایمیل)

روی VPS در `/opt/petdate/.env`:

```
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_FROM=info@petdate.ir
SMTP_FROM_NAME=petdate
SMTP_TLS_REJECT_UNAUTHORIZED=0
```

API کد OTP تب ایمیل را از طریق Postfix محلی می‌فرستد (از آدرس `info@`).

`SMTP_TLS_REJECT_UNAUTHORIZED=0` لازم است چون گواهی فعلی `mail.petdate.ir` هنوز self-signed است (تا بعد از certbot روی DNS درست).

### پنل مشاهده ارسال (ادمین وب)

- URL: `https://petdate.ir/admin/mail`
- ورود: `https://petdate.ir/admin/login` با رمز `ADMIN_PASSWORD` (همان پنل ادمین؛ پیش‌فرض توسعه `petdate`)
- نشان می‌دهد: host/port/from (بدون رمز)، وضعیت پورت، لاگ ارسال‌ها، OTPهای ایمیل فعال، و دکمهٔ تست ارسال
- API: `GET /api/admin/mail` و `POST /api/admin/mail/test` (هدر `x-admin-password`)

## تست

```bash
ss -tlnp | grep -E ':25|:465|:587|:993'
echo 'test' | mail -s 'hello' info@petdate.ir
curl -sS -X POST http://127.0.0.1:3001/api/auth/otp/request \
  -H 'Content-Type: application/json' \
  -d '{"channel":"email","target":"YOUR@gmail.com"}'
tail -50 /var/log/mail.log
```

**دریافت از اینترنت (IMAP/کلاینت میل)** تا وقتی `A mail.petdate.ir` از CDN به `185.110.189.218` عوض نشود قابل اعتماد نیست.
**ارسال OTP از اپ** از طریق `127.0.0.1:25` کار می‌کند؛ برای inbox/spam کمتر، DKIM + mail A + PTR را درست کنید.
