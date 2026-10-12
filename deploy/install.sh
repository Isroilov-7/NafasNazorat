#!/usr/bin/env bash
# NafasNazorat — one-command install / update / domain change on the shared server.
#
#   sudo bash deploy/install.sh <domain> <email-for-https>
#   e.g. sudo bash deploy/install.sh nafas.plagiatx.uz admin@plagiatx.uz
#
# Safe to re-run: keeps the existing .env and database volume; re-running with a
# new domain switches the nginx site + HTTPS certificate to that domain.
# Never touches PlagiatX (/opt/plagiatx), its containers or its nginx config.
set -euo pipefail

DOMAIN="${1:?Foydalanish: sudo bash deploy/install.sh <domen> <email>}"
EMAIL="${2:?Foydalanish: sudo bash deploy/install.sh <domen> <email>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE=/etc/nginx/sites-available/nafasnazorat
say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] || { echo "Domen noto'g'ri: $DOMAIN"; exit 1; }
cd "$ROOT"

say "1/5 .env (sirlar) tekshirilmoqda"
if [[ ! -f .env ]]; then
  umask 077
  rnd() { openssl rand -base64 36 | tr -d '/+=' | cut -c1-"$1"; }
  cat > .env <<ENV
SESSION_SECRET=$(openssl rand -base64 48)
BOOTSTRAP_ADMIN_EMAIL=admin@${DOMAIN}
BOOTSTRAP_ADMIN_PASSWORD=$(rnd 20)
DEMO_DOCTOR_EMAIL=demo@${DOMAIN}
DEMO_DOCTOR_PASSWORD=$(rnd 20)
NAFAS_DEMO_DATA=1
NAFAS_DEMO_LOGIN=1
ENV
  echo "  .env yaratildi (chmod 600). Admin paroli: grep ADMIN $ROOT/.env"
else
  echo "  mavjud .env saqlandi"
fi

say "2/5 Docker image build va ishga tushirish (2–4 daqiqa)"
docker compose up -d --build
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3100/api/health >/dev/null 2>&1; then echo "  health: ok"; break; fi
  [[ $i -eq 30 ]] && { echo "  Ilova javob bermadi: docker compose logs --tail=50 app"; exit 1; }
  sleep 2
done

say "3/5 nginx sayti: $DOMAIN"
install -m 644 deploy/nafas-proxy.conf /etc/nginx/snippets/nafas-proxy.conf
sed "s/__DOMAIN__/${DOMAIN}/g" deploy/nginx-nafasnazorat.conf > "$SITE.new"
[[ -f "$SITE" ]] && cp "$SITE" "$SITE.bak"
mv "$SITE.new" "$SITE"
ln -sfn "$SITE" /etc/nginx/sites-enabled/nafasnazorat
if ! nginx -t; then
  echo "  nginx -t xato — eski konfiguratsiya tiklanmoqda"
  if [[ -f "$SITE.bak" ]]; then mv "$SITE.bak" "$SITE"; else rm -f /etc/nginx/sites-enabled/nafasnazorat "$SITE"; fi
  exit 1
fi
systemctl reload nginx

say "4/5 HTTPS sertifikati (certbot)"
CERT_OK=0
if command -v certbot >/dev/null; then
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect; then
    CERT_OK=1
  else
    echo "  certbot muvaffaqiyatsiz: domen DNS'i shu serverga yo'nalganini tekshirib, skriptni qayta ishga tushiring"
  fi
else
  echo "  certbot topilmadi: apt install -y certbot python3-certbot-nginx"
fi

say "5/5 Kunlik backup (02:30)"
CRON="30 2 * * * cd $ROOT && docker compose exec -T app node scripts/backup.mjs >> /var/log/nafas-backup.log 2>&1"
( crontab -l 2>/dev/null | grep -v 'scripts/backup.mjs' ; echo "$CRON" ) | crontab -

if [[ $CERT_OK -eq 1 ]]; then
  printf '\n\033[1;32m✔ Tayyor: https://%s\033[0m\n' "$DOMAIN"
else
  printf '\n\033[1;33m⚠ Ilova ishlayapti, lekin HTTPS sertifikati YO‘Q — login ishlamaydi.\033[0m\n'
  echo "  DNS: getent hosts $DOMAIN  → server IP chiqishi kerak; keyin shu skriptni qayta ishga tushiring."
fi
echo "  Demo: bosh sahifadagi \"Demoni ko'rish\" tugmasi (parolsiz, faqat to'qima bemorlar)."
echo "  Admin login: grep ADMIN $ROOT/.env"
