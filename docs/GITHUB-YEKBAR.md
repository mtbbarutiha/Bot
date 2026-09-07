# یک‌بار فقط این را بزن

من پوش کد / CI/CD / Secretها را انجام می‌دهم. تو فقط یکی از این دو راه:

## راه سریع (کد یک‌بارمصرف)

1. باز کن: https://github.com/login/device
2. کدی که **الان در چت** برایت نوشتم را وارد کن
3. Authorize بزن → در چت بگو **انجام شد**

## اگر کد نبود / منقضی شد

باز کن: https://github.com/mtbbarutiha/petdate/settings/keys

1. Add deploy key
2. Title: `petdate-agent`
3. تیک **Allow write access**
4. بچسبان:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPpNosqGwcvNbiB4ksQMFCQXL4PTEP2sA0A1rpsIuLbl petdate-agent-push
```

بعد: https://github.com/mtbbarutiha/petdate/settings/secrets/actions — چهار Secret:

- `VPS_HOST` = `185.110.189.218`
- `VPS_USER` = `root`
- `VPS_PATH` = `/opt/petdate`
- `VPS_SSH_KEY` = خروجی کامل `cat /root/.ssh/github_actions_vps` روی سرور

بگو **انجام شد**.
