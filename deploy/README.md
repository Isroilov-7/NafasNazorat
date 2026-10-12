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

## Hay'atga ko'rsatish uchun (domen olinmasdan oldin)

Vaqtinchalik manzil sifatida plagiatx.uz'ning subdomenidan foydalaning, masalan `nafas.plagiatx.uz`.

**1. Cloudflare DNS** (plagiatx.uz zonasi): `A` yozuv qo'shing — Name: `nafas`, IPv4: serverning IP manzili
(plagiatx.uz bilan bir xil).

**2. Kodni serverga olish** (bir marta):
```bash
git clone https://github.com/Isroilov-7/NafasNazorat.git /opt/nafasnazorat
```
Repo Private bo'lsa, git login so'raydi: username — `Isroilov-7`, parol o'rniga GitHub token
(github.com → Settings → Developer settings → Fine-grained tokens, faqat shu repo, "Contents: Read").

**3. O'rnatish — bitta buyruq:**
```bash
cd /opt/nafasnazorat && sudo bash deploy/install.sh nafas.plagiatx.uz <sizning-email>
```
Skript: `.env` ni tasodifiy sirlar bilan yaratadi (chmod 600) → Docker image'ni build qiladi va ishga
tushiradi → nginx'ga alohida sayt qo'shadi (`nginx -t` xato bersa avtomatik orqaga qaytaradi) →
HTTPS sertifikat oladi → kunlik backup'ni yoqadi.
Kutilgan oxirgi qator: `✔ Tayyor: https://nafas.plagiatx.uz`

**4. Hay'atga havola:** `https://nafas.plagiatx.uz` — bosh sahifadagi **"Demoni ko'rish"** tugmasi
parolsiz kiritadi (faqat to'qima bemorlar; tepada "Demo rejim" yozuvi turadi).

## Domen olingandan keyin (yagona qolgan qadam)

DNS'da yangi domenning `A` yozuvini server IP'siga yo'naltiring, keyin:
```bash
cd /opt/nafasnazorat && sudo bash deploy/install.sh nafasnazorat.uz <sizning-email>
```
Ma'lumotlar va `.env` saqlanadi, nginx va sertifikat yangi domenga o'tadi.

## Yangilash (yangi versiya chiqqanda)

```bash
cd /opt/nafasnazorat && git pull && docker compose up -d --build
```

## Haqiqiy pilotga o'tishda (real bemorlar)

`.env` da `NAFAS_DEMO_LOGIN=0` va `NAFAS_DEMO_DATA=0` qiling, keyin:
```bash
cd /opt/nafasnazorat && docker compose up -d --force-recreate app
```
Demo tugmasi va banner yo'qoladi. Toza baza uchun avval backup oling, so'ng volume'ni almashtirish
bo'yicha alohida ko'rsatma so'rang (volume'ni o'zingiz o'chirmang).

## Foydali buyruqlar

| Nima | Buyruq |
|---|---|
| Holat | `cd /opt/nafasnazorat && docker compose ps` |
| Loglar | `docker compose logs --tail=100 app` |
| Qo'lda backup | `docker compose exec -T app node scripts/backup.mjs` |
| Admin login | `grep ADMIN /opt/nafasnazorat/.env` |

## Xavfli joylar

- `docker compose down -v` va `docker system prune --volumes` — bazani o'chiradi. Ishlatmang.
- `.env` o'zgarsa: `docker compose up -d --force-recreate app` (oddiy restart yangi env'ni o'qimaydi).
- Konteyner `mem_limit: 384m` bilan cheklangan — PlagiatX'ning xotirasiga ta'sir qila olmaydi.
