# یک‌بار فقط این را بزن

من پوش کد و CI/CD را انجام می‌دهم؛ تو فقط دسترسی را باز کن.

## راه ۱ (سریع‌تر) — اگر الان آنلاین هستی

1. باز کن: https://github.com/login/device
2. کدی که در چت برایت فرستادم را وارد کن
3. **Authorize** بزن
4. در چت بگو: **انجام شد**

## راه ۲ (اگر کد منقضی شد) — Deploy Key

باز کن: https://github.com/mtbbarutiha/petdate/settings/keys

- **Add deploy key**
- Title: `petdate-agent`
- تیک **Allow write access**
- این کلید:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPpNosqGwcvNbiB4ksQMFCQXL4PTEP2sA0A1rpsIuLbl petdate-agent-push
```

بعد Secrets: https://github.com/mtbbarutiha/petdate/settings/secrets/actions

| Name | Value |
|------|--------|
| `VPS_HOST` | `185.110.189.218` |
| `VPS_USER` | `root` |
| `VPS_PATH` | `/opt/petdate` |
| `VPS_SSH_KEY` | خروجی `cat /root/.ssh/github_actions_vps` روی سرور |

بعد بگو: **انجام شد**
