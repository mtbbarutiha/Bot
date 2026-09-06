#!/usr/bin/env bash
# Reset password for a virtual mailbox (default: info)
set -euo pipefail

USER_LOCAL="${1:-info}"
DOMAIN="petdate.ir"
EMAIL="${USER_LOCAL}@${DOMAIN}"
CRED_DIR="/root/.petdate-mail"
PASS_FILE="${CRED_DIR}/${USER_LOCAL}.password"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root" >&2
  exit 1
fi

if [[ ! -f /etc/dovecot/users ]]; then
  echo "Dovecot users file missing — run setup-mail.sh first" >&2
  exit 1
fi

pass="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
mkdir -p "${CRED_DIR}"
chmod 700 "${CRED_DIR}"
umask 077
printf '%s\n' "${pass}" >"${PASS_FILE}"
chmod 600 "${PASS_FILE}"

hash="$(doveadm pw -s SHA512-CRYPT -p "${pass}")"
if grep -q "^${EMAIL}:" /etc/dovecot/users; then
  sed -i "s|^${EMAIL}:.*|${EMAIL}:${hash}|" /etc/dovecot/users
else
  echo "${EMAIL}:${hash}" >>/etc/dovecot/users
fi
chmod 640 /etc/dovecot/users
chown root:dovecot /etc/dovecot/users
systemctl reload dovecot 2>/dev/null || systemctl restart dovecot

echo "Password for ${EMAIL} updated."
echo "Retrieve once with: sudo cat ${PASS_FILE}"
echo "(Password not printed here.)"
