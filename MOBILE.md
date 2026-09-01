# Pet Dat — باز کردن UI روی گوشی

## روش ۱: لینک مستقیم (سریع‌ترین)

این لینک رو توی **مرورگر گوشی** (Safari / Chrome) باز کن:

**https://spotty-buses-clap.loca.lt**

> اگر صفحهٔ «Tunnel Reminder» اومد، دکمه **Click to Continue** رو بزن.
> این لینک موقتیه و وقتی سرور خاموش بشه کار نمی‌کنه.

### نصب به‌صورت اپ (PWA)
1. لینک رو باز کن
2. **iPhone:** Share → Add to Home Screen
3. **Android:** منو (⋮) → Install app / Add to Home screen

---

## روش ۲: فایل ZIP (دائمی‌تر)

فایل `dordoria-pwa-ui.zip` رو دانلود کن و روی یکی از این سرویس‌ها آپلود کن:

| سرویس | آدرس |
|--------|------|
| Netlify Drop | https://app.netlify.com/drop |
| Vercel | https://vercel.com/new |
| GitHub Pages | آپلود `dist` در repo |

بعد از deploy، لینک سایت رو روی گوشی باز کن.

---

## روش ۳: اجرای لوکال (اگه کد رو داری)

```bash
cd /agent
npm install
npm run build
npx vite preview --host 0.0.0.0 --port 4173
```

بعد از کامپیوتر، IP لوکال شبکه رو پیدا کن و روی گوشی بزن:
`http://IP-کامپیوتر:4173`

(گوشی و کامپیوتر باید روی یک WiFi باشن)

---

## صفحات

| صفحه | مسیر |
|------|------|
| خوش‌آمد | `/welcome` |
| خانه | `/` |
| جستجو | `/explore` |
| جزئیات پت | `/pets/1` |
| درخواست‌ها | `/matches` |
| پروفایل | `/profile` |
