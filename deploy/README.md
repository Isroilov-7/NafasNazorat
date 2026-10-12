# NafasNazorat — serverga joylash (plagiatx.uz bilan bir serverda, alohida sayt)

Ikki sayt bitta serverda, lekin bir-biridan to'liq ajratilgan:

| | PlagiatX | NafasNazorat |
|---|---|---|
| Papka | `/opt/plagiatx` | `/opt/nafasnazorat` |
| Compose loyiha | `plagiatx` | `nafasnazorat` (alohida) |
| Port (faqat 127.0.0.1) | 8000 | **3100** |
| Baza | Postgres | SQLite, `nafas_data` volume |
| nginx | mavjud blok | yangi `server` bloki, o'z domeni |
| RAM | ~3 GB | **~40–200 MB**, chegara `mem_limit: 384m` |

PlagiatX servislariga hech narsa tegmaydi — downtime yo'q.

## 0. Oldindan kerak

- Domen (masalan `nafasnazorat.uz`) A-yozuvi serverning IP manziliga yo'naltirilgan bo'lishi kerak.
- Kod serverga yetkazilgan bo'lishi kerak (1-qadam).

## 1. Kodni olish

Tavsiya etiladi: loyihani alohida repo'ga ko'chiring (`Isroilov-7/NafasNazorat`) va o'shandan clone qiling.
Hozircha PlagiatX repo'sidagi papkadan faqat shu papkani olish ham mumkin:

```bash
git clone --filter=blob:none --sparse -b claude/gracious-rubin-bpay26 https://github.com/Isroilov-7/PlagiatX.git /opt/nafasnazorat-src
```
```bash
cd /opt/nafasnazorat-src && git sparse-checkout set nafasnazorat && ln -sfn /opt/nafasnazorat-src/nafasnazorat /opt/nafasnazorat
```

## 2. Sirlar (.env)

```bash
cd /opt/nafasnazorat && cp .env.example .env && chmod 600 .env
```
Kalit yaratish (chiqqan qatorni `.env` ichidagi `SESSION_SECRET=` ga qo'ying):
```bash
openssl rand -base64 48
```
`.env` ni tahrirlang (`nano .env`): `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (≥ 10 belgi),
ko'rib chiqish uchun `DEMO_DOCTOR_EMAIL`, `DEMO_DOCTOR_PASSWORD` va `NAFAS_DEMO_DATA=1`.
Parollarni chat yoki git'ga yozmang.

## 3. Build va ishga tushirish

```bash
cd /opt/nafasnazorat && docker compose build
```
Kutilgan natija: `nafasnazorat:latest  Built` (2–4 daqiqa, build vaqtida ~1 GB RAM).
```bash
docker compose up -d
```
```bash
curl -s http://127.0.0.1:3100/api/health
```
Kutilgan natija: `{"ok":true}`.

## 4. nginx (yangi blok, eskisiga tegilmaydi)

```bash
cp /opt/nafasnazorat/deploy/nafas-proxy.conf /etc/nginx/snippets/nafas-proxy.conf
```
```bash
cp /opt/nafasnazorat/deploy/nginx-nafasnazorat.conf /etc/nginx/sites-available/nafasnazorat
```
Fayl ichidagi `nafasnazorat.uz` ni haqiqiy domenga almashtiring, keyin:
```bash
ln -s /etc/nginx/sites-available/nafasnazorat /etc/nginx/sites-enabled/nafasnazorat && nginx -t
```
Kutilgan natija: `syntax is ok` / `test is successful`. Shundan keyingina:
```bash
systemctl reload nginx
```
HTTPS sertifikati:
```bash
certbot --nginx -d nafasnazorat.uz -d www.nafasnazorat.uz
```

## 5. Backup (har kecha, 14 ta nusxa saqlanadi)

```bash
(crontab -l; echo '30 2 * * * cd /opt/nafasnazorat && docker compose exec -T app node scripts/backup.mjs >> /var/log/nafas-backup.log 2>&1') | crontab -
```
Qo'lda tekshirish:
```bash
cd /opt/nafasnazorat && docker compose exec -T app node scripts/backup.mjs
```
Kutilgan natija: `backup ok: /data/backups/nafas-YYYYMMDD-HHMM.db`.

## Yangilash

```bash
cd /opt/nafasnazorat-src && git pull
```
```bash
cd /opt/nafasnazorat && docker compose up -d --build
```

## Xavfli joylar

- `docker compose down -v` va `docker system prune --volumes` — bazani o'chiradi. Ishlatmang.
- `.env` o'zgarsa: `docker compose up -d --force-recreate app`.
- Konteyner `mem_limit: 384m` bilan cheklangan — PlagiatX'ning xotirasiga ta'sir qila olmaydi.
