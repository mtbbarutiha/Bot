# یک‌بار فقط این را بزن (بعدش من بقیه را انجام می‌دهم)

مخزن GitHub الان خالی است و دسترسی من قطع است. فقط دو صفحه را باز کن و کپی/پیست کن.

## ۱) کلید نوشتن (Deploy Key)

باز کن: https://github.com/mtbbarutiha/petdate/settings/keys

- **Add deploy key**
- Title: `petdate-agent`
- تیک **Allow write access** را بزن
- Key را این بگذار:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPpNosqGwcvNbiB4ksQMFCQXL4PTEP2sA0A1rpsIuLbl petdate-agent-push
```

- **Add key**

## ۲) چهار Secret برای دیپلوی

باز کن: https://github.com/mtbbarutiha/petdate/settings/secrets/actions

چهار بار **New repository secret**:

| Name | Value |
|------|--------|
| `VPS_HOST` | `185.110.189.218` |
| `VPS_USER` | `root` |
| `VPS_PATH` | `/opt/petdate` |
| `VPS_SSH_KEY` | خروجی این دستور روی سرور (کلید خصوصی کامل، از `-----BEGIN` تا `END`) |

روی سرور VPS:

```bash
cat /root/.ssh/github_actions_vps
```

---

تمام. در چت بگو: **انجام شد** — من کد و CI/CD را پوش می‌کنم.
