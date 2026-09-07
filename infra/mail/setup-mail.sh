#!/usr/bin/env bash
# PetDate — Postfix + Dovecot (IMAP) + OpenDKIM on a single VPS
# Domain: petdate.ir | Mail host: mail.petdate.ir | Mailbox: info@petdate.ir
# Safe for co-existence with nginx on :80/:443. Does not modify nginx.
set -euo pipefail

DOMAIN="petdate.ir"
MAIL_HOST="mail.petdate.ir"
ORIGIN_IP="185.110.189.218"
MAILBOX_USER="info"
ALIAS_HELLO="hello"
VMAIL_UID=5000
VMAIL_GID=5000
VMAIL_HOME="/var/mail/vhosts"
CRED_DIR="/root/.petdate-mail"
DKIM_DIR="/etc/opendkim/keys/${DOMAIN}"
DKIM_SELECTOR="mail"

export DEBIAN_FRONTEND=noninteractive

log() { echo "[petdate-mail] $*" >&2; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run as root" >&2
    exit 1
  fi
}

install_packages() {
  log "Installing packages..."
  apt-get update -qq
  debconf-set-selections <<EOF
postfix postfix/mailname string ${DOMAIN}
postfix postfix/main_mailer_type select Internet Site
EOF
  apt-get install -y -qq \
    postfix postfix-pcre \
    dovecot-core dovecot-imapd dovecot-lmtpd dovecot-sieve \
    opendkim opendkim-tools \
    mailutils ca-certificates openssl
}

ensure_vmail_user() {
  if ! getent group vmail >/dev/null; then
    groupadd -g "${VMAIL_GID}" vmail
  fi
  if ! getent passwd vmail >/dev/null; then
    useradd -u "${VMAIL_UID}" -g vmail -d "${VMAIL_HOME}" -s /usr/sbin/nologin -r vmail
  fi
  mkdir -p "${VMAIL_HOME}/${DOMAIN}/${MAILBOX_USER}"
  chown -R vmail:vmail "${VMAIL_HOME}"
  chmod -R 770 "${VMAIL_HOME}"
}

ensure_tls_cert() {
  local live="/etc/letsencrypt/live/${MAIL_HOST}"
  local ssl_dir="/etc/ssl/petdate-mail"
  mkdir -p "${ssl_dir}"

  if [[ -f "${live}/fullchain.pem" && -f "${live}/privkey.pem" ]]; then
    log "Using Let's Encrypt cert for ${MAIL_HOST}"
    echo "${live}/fullchain.pem"
    echo "${live}/privkey.pem"
    return
  fi

  # Fallback: self-signed until DNS A for mail.petdate.ir points to origin (no CDN)
  if [[ ! -f "${ssl_dir}/fullchain.pem" || ! -f "${ssl_dir}/privkey.pem" ]]; then
    log "Generating self-signed TLS cert for ${MAIL_HOST} (replace with LE after DNS)"
    openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
      -keyout "${ssl_dir}/privkey.pem" \
      -out "${ssl_dir}/fullchain.pem" \
      -subj "/CN=${MAIL_HOST}/O=PetDate/C=IR" \
      -addext "subjectAltName=DNS:${MAIL_HOST},DNS:${DOMAIN}"
    chmod 600 "${ssl_dir}/privkey.pem"
  fi
  echo "${ssl_dir}/fullchain.pem"
  echo "${ssl_dir}/privkey.pem"
}

configure_opendkim() {
  log "Configuring OpenDKIM..."
  mkdir -p /etc/opendkim
  mkdir -p "${DKIM_DIR}"
  chown -R opendkim:opendkim /etc/opendkim

  if [[ ! -f "${DKIM_DIR}/${DKIM_SELECTOR}.private" ]]; then
    opendkim-genkey -b 2048 -d "${DOMAIN}" -D "${DKIM_DIR}" -s "${DKIM_SELECTOR}" -v
    chown opendkim:opendkim "${DKIM_DIR}/${DKIM_SELECTOR}".*
    chmod 600 "${DKIM_DIR}/${DKIM_SELECTOR}.private"
  fi

  cat >/etc/opendkim.conf <<EOF
Syslog                  yes
SyslogSuccess           yes
LogWhy                  yes
Canonicalization        relaxed/simple
Mode                    sv
SubDomains              no
AutoRestart             yes
AutoRestartRate         10/1M
Background              yes
DNSTimeout              5
SignatureAlgorithm      rsa-sha256
Socket                  inet:8891@localhost
PidFile                 /run/opendkim/opendkim.pid
OversignHeaders         From
SignHeaders             From,Sender,Reply-To,Subject,Date,To,Cc,MIME-Version,Content-Type,Message-ID
TrustAnchorFile         /usr/share/dns/root.key
UserID                  opendkim
KeyTable                /etc/opendkim/key.table
SigningTable            refile:/etc/opendkim/signing.table
ExternalIgnoreList      /etc/opendkim/trusted.hosts
InternalHosts           /etc/opendkim/trusted.hosts
EOF

  echo "${DKIM_SELECTOR}._domainkey.${DOMAIN} ${DOMAIN}:${DKIM_SELECTOR}:${DKIM_DIR}/${DKIM_SELECTOR}.private" \
    >/etc/opendkim/key.table
  echo "*@${DOMAIN} ${DKIM_SELECTOR}._domainkey.${DOMAIN}" >/etc/opendkim/signing.table
  cat >/etc/opendkim/trusted.hosts <<EOF
127.0.0.1
localhost
${ORIGIN_IP}
*.${DOMAIN}
${DOMAIN}
${MAIL_HOST}
EOF
  chown -R opendkim:opendkim /etc/opendkim
  mkdir -p /run/opendkim
  chown opendkim:opendkim /run/opendkim
}

configure_postfix() {
  local cert="$1"
  local key="$2"
  log "Configuring Postfix..."

  postconf -e "myhostname = ${MAIL_HOST}"
  postconf -e "mydomain = ${DOMAIN}"
  postconf -e "myorigin = \$mydomain"
  # Outbound EHLO/HELO must be the mail hostname (not OS hostname srv…)
  postconf -e "smtp_helo_name = ${MAIL_HOST}"
  postconf -e "smtp_address_preference = ipv4"
  postconf -e "disable_vrfy_command = yes"
  postconf -e "inet_interfaces = all"
  postconf -e "inet_protocols = ipv4"
  postconf -e "mydestination = localhost"
  postconf -e "home_mailbox = Maildir/"
  postconf -e "smtpd_banner = \$myhostname ESMTP"
  postconf -e "biff = no"
  postconf -e "append_dot_mydomain = no"
  postconf -e "readme_directory = no"
  postconf -e "compatibility_level = 3.6"

  postconf -e "smtpd_tls_cert_file = ${cert}"
  postconf -e "smtpd_tls_key_file = ${key}"
  postconf -e "smtpd_tls_security_level = may"
  postconf -e "smtp_tls_security_level = may"
  postconf -e "smtpd_tls_auth_only = yes"
  postconf -e "smtpd_tls_loglevel = 1"
  postconf -e "smtpd_tls_received_header = yes"
  postconf -e "smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache"
  postconf -e "smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache"

  postconf -e "smtpd_sasl_type = dovecot"
  postconf -e "smtpd_sasl_path = private/auth"
  postconf -e "smtpd_sasl_auth_enable = yes"
  postconf -e "smtpd_sasl_security_options = noanonymous"
  postconf -e "smtpd_sasl_local_domain = \$myhostname"
  postconf -e "broken_sasl_auth_clients = yes"

  postconf -e "smtpd_relay_restrictions = permit_mynetworks, permit_sasl_authenticated, defer_unauth_destination"
  postconf -e "smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination"
  postconf -e "smtpd_sender_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unknown_sender_domain"
  postconf -e "smtpd_helo_required = yes"

  postconf -e "virtual_mailbox_domains = ${DOMAIN}"
  postconf -e "virtual_mailbox_maps = hash:/etc/postfix/vmailbox"
  postconf -e "virtual_alias_maps = hash:/etc/postfix/virtual"
  postconf -e "virtual_uid_maps = static:${VMAIL_UID}"
  postconf -e "virtual_gid_maps = static:${VMAIL_GID}"
  postconf -e "virtual_mailbox_base = ${VMAIL_HOME}"
  postconf -e "virtual_transport = lmtp:unix:private/dovecot-lmtp"
  postconf -e "mailbox_size_limit = 0"
  postconf -e "message_size_limit = 26214400"

  postconf -e "milter_default_action = accept"
  postconf -e "milter_protocol = 6"
  postconf -e "smtpd_milters = inet:localhost:8891"
  postconf -e "non_smtpd_milters = inet:localhost:8891"

  # submission (587) + smtps (465)
  if ! grep -qE '^submission ' /etc/postfix/master.cf; then
    cat >>/etc/postfix/master.cf <<'EOF'

submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_tls_auth_only=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
smtps     inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
EOF
  fi

  echo "${DOMAIN}" >/etc/mailname
}

configure_dovecot() {
  local cert="$1"
  local key="$2"
  log "Configuring Dovecot..."

  cat >/etc/dovecot/dovecot.conf <<EOF
!include_try /usr/share/dovecot/protocols.d/*.protocol
protocols = imap lmtp
listen = *, ::
base_dir = /var/run/dovecot/
instance_name = dovecot
login_greeting = PetDate ready.
mail_location = maildir:${VMAIL_HOME}/%d/%n/Maildir
mail_uid = vmail
mail_gid = vmail
first_valid_uid = ${VMAIL_UID}
mail_privileged_group = vmail
disable_plaintext_auth = yes
auth_mechanisms = plain login

passdb {
  driver = passwd-file
  args = scheme=SHA512-CRYPT username_format=%u /etc/dovecot/users
}
userdb {
  driver = static
  args = uid=vmail gid=vmail home=${VMAIL_HOME}/%d/%n
}

service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
  unix_listener auth-userdb {
    mode = 0660
    user = vmail
    group = vmail
  }
}

service lmtp {
  unix_listener /var/spool/postfix/private/dovecot-lmtp {
    mode = 0600
    user = postfix
    group = postfix
  }
}

ssl = required
ssl_cert = <${cert}
ssl_key = <${key}
ssl_min_protocol = TLSv1.2

service imap-login {
  inet_listener imap {
    port = 0
  }
  inet_listener imaps {
    port = 993
    ssl = yes
  }
}

namespace inbox {
  inbox = yes
}

protocol lmtp {
  mail_plugins = \$mail_plugins sieve
}
EOF

  mkdir -p /etc/dovecot
  touch /etc/dovecot/users
  chmod 640 /etc/dovecot/users
  chown root:dovecot /etc/dovecot/users
}

ensure_mailbox() {
  local email="${MAILBOX_USER}@${DOMAIN}"
  local maildir="${VMAIL_HOME}/${DOMAIN}/${MAILBOX_USER}/Maildir"
  mkdir -p "${maildir}"/{cur,new,tmp}
  chown -R vmail:vmail "${VMAIL_HOME}/${DOMAIN}"
  chmod -R 770 "${VMAIL_HOME}/${DOMAIN}"

  echo "${email} ${DOMAIN}/${MAILBOX_USER}/Maildir/" >/etc/postfix/vmailbox
  postmap /etc/postfix/vmailbox

  # Brand / ops aliases → info@; no-reply is send-only identity (inbound still lands in info)
  echo "${ALIAS_HELLO}@${DOMAIN} ${email}" >/etc/postfix/virtual
  echo "postmaster@${DOMAIN} ${email}" >>/etc/postfix/virtual
  echo "abuse@${DOMAIN} ${email}" >>/etc/postfix/virtual
  echo "no-reply@${DOMAIN} ${email}" >>/etc/postfix/virtual
  echo "noreply@${DOMAIN} ${email}" >>/etc/postfix/virtual
  postmap /etc/postfix/virtual

  mkdir -p "${CRED_DIR}"
  chmod 700 "${CRED_DIR}"

  local pass_file="${CRED_DIR}/${MAILBOX_USER}.password"
  local pass
  if [[ -f "${pass_file}" ]]; then
    pass="$(cat "${pass_file}")"
    log "Reusing existing mailbox password from ${pass_file}"
  else
    pass="$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)"
    umask 077
    printf '%s\n' "${pass}" >"${pass_file}"
    chmod 600 "${pass_file}"
    log "Generated new mailbox password → ${pass_file}"
  fi

  local hash
  hash="$(doveadm pw -s SHA512-CRYPT -p "${pass}")"
  # Rewrite users file entry for info@
  if grep -q "^${email}:" /etc/dovecot/users 2>/dev/null; then
    sed -i "s|^${email}:.*|${email}:${hash}|" /etc/dovecot/users
  else
    echo "${email}:${hash}" >>/etc/dovecot/users
  fi
  chmod 640 /etc/dovecot/users
  chown root:dovecot /etc/dovecot/users

  cat >"${CRED_DIR}/ACCESS.txt" <<EOF
PetDate mailbox access (server-side; do not commit)
====================================================
Address:   ${email}
Alias:     ${ALIAS_HELLO}@${DOMAIN} → ${email}
IMAP host: ${MAIL_HOST}  (or ${ORIGIN_IP} until DNS propagates)
IMAP port: 993 (SSL/TLS)
SMTP host: ${MAIL_HOST}
SMTP ports: 587 (STARTTLS) or 465 (SSL)
Username:  ${email}
Password:  see ${pass_file}

Retrieve password:
  sudo cat ${pass_file}

Reset password:
  sudo /opt/petdate/infra/mail/reset-mailbox-password.sh ${MAILBOX_USER}
EOF
  chmod 600 "${CRED_DIR}/ACCESS.txt"
}

open_firewall() {
  log "Opening mail ports in UFW (keeping 80/443/22)..."
  ufw allow 25/tcp comment 'SMTP' >/dev/null || true
  ufw allow 465/tcp comment 'SMTPS' >/dev/null || true
  ufw allow 587/tcp comment 'Submission' >/dev/null || true
  ufw allow 993/tcp comment 'IMAPS' >/dev/null || true
  # Do not enable UFW if it was disabled; only add rules when active
  ufw status | head -5 || true
}

write_dkim_public() {
  local txt_file="${CRED_DIR}/dkim-dns.txt"
  local oneline_file="${CRED_DIR}/dkim-txt-oneline.txt"
  mkdir -p "${CRED_DIR}"
  if [[ -f "${DKIM_DIR}/${DKIM_SELECTOR}.txt" ]]; then
    cp "${DKIM_DIR}/${DKIM_SELECTOR}.txt" "${txt_file}"
    chmod 644 "${txt_file}"
    # Single-line TXT for DNS panels (ParsPack / Arvan) — strip quotes/whitespace
    python3 - "${DKIM_DIR}/${DKIM_SELECTOR}.txt" "${oneline_file}" <<'PY'
import re, sys
raw = open(sys.argv[1], encoding="utf-8").read()
parts = re.findall(r'"([^"]+)"', raw)
val = "".join(parts).replace(" ", "")
# Keep spaces only after semicolons for readability in panels
val = re.sub(r";(?=\S)", "; ", val)
open(sys.argv[2], "w", encoding="utf-8").write(val + "\n")
print(val)
PY
    chmod 644 "${oneline_file}"
    log "DKIM public record → ${txt_file} and ${oneline_file}"
  fi
}

restart_services() {
  systemctl enable opendkim postfix dovecot
  systemctl restart opendkim
  systemctl restart postfix
  systemctl restart dovecot
  systemctl is-active opendkim postfix dovecot
}

smoke_test() {
  log "Smoke tests..."
  ss -tlnp | grep -E ':25|:465|:587|:993' || true
  echo "Subject: PetDate mail stack OK
From: ${MAILBOX_USER}@${DOMAIN}
To: ${MAILBOX_USER}@${DOMAIN}

Local delivery smoke test $(date -u +%Y-%m-%dT%H:%M:%SZ)
" | sendmail -t -f "${MAILBOX_USER}@${DOMAIN}" || true
  sleep 1
  doveadm search -u "${MAILBOX_USER}@${DOMAIN}" ALL 2>/dev/null | head -5 || true
  log "Recent mail log:"
  journalctl -u postfix -u dovecot -u opendkim -n 30 --no-pager 2>/dev/null || tail -30 /var/log/mail.log 2>/dev/null || true
}

print_dns_hints() {
  local dkim_oneline="${CRED_DIR}/dkim-txt-oneline.txt"
  log "===== DNS records required (DNS-only / grey cloud — NO CDN proxy for mail) ====="
  echo "1) A     name=mail          value=${ORIGIN_IP}     # MUST NOT be 185.239.1.100 / proxy OFF"
  echo "2) MX    name=@             value=mail.${DOMAIN}. priority=10"
  echo "3) TXT   name=@             value=v=spf1 ip4:${ORIGIN_IP} -all"
  echo "   (after mail A is correct you may use: v=spf1 ip4:${ORIGIN_IP} a:mail.${DOMAIN} mx -all)"
  echo "4) TXT   name=_dmarc        value=v=DMARC1; p=none; rua=mailto:${MAILBOX_USER}@${DOMAIN}; fo=1; adkim=r; aspf=r"
  echo "5) TXT   name=${DKIM_SELECTOR}._domainkey   (ONE record — paste one-liner below)"
  if [[ -f "${dkim_oneline}" ]]; then
    echo "----- DKIM one-liner (copy ALL of it) -----"
    cat "${dkim_oneline}"
  elif [[ -f "${DKIM_DIR}/${DKIM_SELECTOR}.txt" ]]; then
    cat "${DKIM_DIR}/${DKIM_SELECTOR}.txt"
  fi
  echo "6) PTR (ticket to BitCommand/ParsPack): ${ORIGIN_IP} → ${MAIL_HOST}"
  echo "DELETE wrong TXT values currently set as literally: RSA / ${ORIGIN_IP} / SPF"
  echo "After mail A → origin: certbot certonly --nginx -d ${MAIL_HOST} && re-run this script"
}

main() {
  require_root
  install_packages
  ensure_vmail_user
  mapfile -t certs < <(ensure_tls_cert)
  configure_opendkim
  configure_postfix "${certs[0]}" "${certs[1]}"
  configure_dovecot "${certs[0]}" "${certs[1]}"
  ensure_mailbox
  write_dkim_public
  open_firewall
  restart_services
  smoke_test
  print_dns_hints
  log "Done. Password is only on-server: ${CRED_DIR}/${MAILBOX_USER}.password"
}

main "$@"
