# NafasNazorat

OSOK (COPD) erta aniqlash, yoʻllanma va spirometriya talqinini qoʻllab-quvvatlash sayti —
Oʻzbekiston birlamchi tibbiyot boʻgʻini uchun. **Tashxis qoʻymaydi**: har bir natija
"spirometriya / pulmonolog koʻrigi zarurligi ehtimoli" sifatida beriladi, tashxisni shifokor tasdiqlaydi.

Bu PlagiatX'dan **mustaqil loyiha** (oʻz repo'si, Docker, nginx bloki, bazasi); plagiatx.uz bilan
bitta serverda alohida sayt sifatida ishlaydi — `deploy/README.md`.

## Imkoniyatlar (MVP)

| Ekran | Yoʻl |
|---|---|
| Ochiq taqdimot sahifasi | `/` |
| Kirish (shifokor / admin) | `/login` |
| Xavfni baholash — 5 qadamli stepper (bemor → xavf omillari → simptomlar → mMRC/CAT → natija) | `/assessments/new[?patientId=]` |
| Spirometriya talqini (FEV1/FVC, GLI-2012 % kutilgan, LLN, GOLD 1–4, BD javobi, PRISm) | `/spirometry/new[?patientId=]` |
| Bemorlar paneli — xavf / yoʻllanma filtri, muddati oʻtgan koʻriklar | `/dashboard` |
| Bemor kartasi — dinamika grafigi, shkalalar tarixi, spirometriya, yoʻllanma, audit | `/patients/[id]` |
| Boshqaruv — foydalanuvchilar, tadqiqot eksporti (CSV/JSON), audit | `/admin` |
| Dizayn tizimi (tokenlar, komponentlar) | `/design-system` |

## Arxitektura qarorlari

- **Klinik mantiq alohida, toza modul** — `src/lib/clinical/` (React/Next'siz, faqat sof funksiyalar):
  `mmrc.ts`, `cat.ts`, `packYears.ts`, `gli.ts` + `reference/gli2012.ts` (almashtiriladigan
  `ReferenceEquation` strategiyasi), `gold.ts`, `spirometry.ts`, `riskScore.ts` + `riskConfig.ts`.
  UI va server faqat `@/lib/clinical` dan import qiladi. Funksiyalar matn emas, **kod** qaytaradi
  (`"postBronchodilatorMissing"`), UI ularni i18n orqali tarjima qiladi.
- **Xavf modeli = maʼlumot, kod emas.** Ogʻirliklar, chegaralar va eskalatsiya qoidalari
  `DEFAULT_RISK_CONFIG` da (versiyalangan). Har bir saqlangan baholash `configVersion` ni saqlaydi —
  model mahalliy maʼlumotlarda sozlanganda eski natijalar qayta tiklanadigan boʻlib qoladi.
  Hozirgi qiymatlar **vaqtinchalik** (GOLD 2025 koʻrsatkichlari + CDQ/COPD-PS tuzilishi asosida).
- **Server natijani qayta hisoblaydi.** Brauzer koʻrinishi faqat oldindan koʻrish; saqlashda
  server xom javoblardan xavfni qaytadan hisoblaydi (`lib/server/services/clinical.ts`).
- **Maxfiylik.** PII (ism, tugʻilgan sana, telefon) faqat `patients` jadvalida. Har bemorga tasodifiy
  `pseudoId` (NN-XXXX-XXXX). Tadqiqot eksporti faqat rozilik bergan bemorlar, ism/telefon/sana/ichki
  ID'larsiz, sanalar oy aniqligida (`lib/domain/researchExport.ts`, testlar bilan). Audit jurnali faqat
  **maydon nomlarini** saqlaydi, qiymatlarni emas. Loglarga PII yozilmaydi. Shakl holati brauzer
  xotirasiga saqlanmaydi.
- **Saqlash: SQLite (`node:sqlite`)** — bitta fayl, native build yoʻq, boʻsh holatda ~0 MB.
  Pilot uchun yetarli; repository qatlami (`lib/server/repositories/`) PostgreSQL'ga oʻtishni
  shu qatlam bilan cheklaydi.
- **Auth.** scrypt parol xeshi, HMAC imzolangan httpOnly cookie (12 soat), `proxy.ts` — optimistik
  yoʻnaltirish, `lib/server/auth/dal.ts` — haqiqiy tekshiruv (har sahifa va server action'da).
  Login urinishlari cheklangan (ilovada + nginx'da). Rollar: `doctor`, `admin` (ishlaydi),
  `patient`, `researcher` (tipda bor, interfeysi keyin).
- **i18n.** next-intl, `messages/uz.json` (oʻzbek lotin: oʻ, gʻ, ʼ — U+02BB/U+02BC). Kalitlar
  TypeScript bilan tekshiriladi (`src/i18n/global.d.ts`) — ru/en qoʻshilganda yetishmagan kalit
  build xatosi beradi.
- **Dizayn tizimi.** Tokenlar faqat `src/app/globals.css` da (rang, radius, soya, tipografiya),
  WCAG AA kontrast tekshirilgan, dark mode tuzilmasi tayyor. Xavf darajasi hech qachon faqat rang
  bilan koʻrsatilmaydi: rang + ikon + matn. Teginish maydonlari ≥ 44 px, fokus koʻrinadi.
- **Next.js 16 Cache Components.** Statik qobiq darhol chiziladi; sessiyaga bogʻliq qismlar
  `Suspense`/`loading.tsx` ortida oqim bilan keladi (skeletonlar).

## ⚠ Klinik koʻrib chiqish talab etiladi (real foydalanishdan oldin)

1. **GLI-2012 etnik guruhi** Oʻzbekiston aholisi uchun (`DEFAULT_ETHNICITY = "other"`,
   `src/lib/clinical/gli.ts`) va GLI-2012 yoki GLI Global 2022 tanlovi.
2. **Xavf modeli ogʻirliklari va chegaralari** (`riskConfig.ts`) — mahalliy, spirometriya bilan
   tasdiqlangan maʼlumotlarda validatsiya.
3. **CAT** — litsenziyalangan instrument (© GSK); rasmiy tasdiqlangan oʻzbekcha tarjimasi bilan almashtirish.
4. **mMRC** matnlarining tibbiy tarjimasi.

## GLI-2012 maʼlumotlari manbasi

Koeffitsientlar va yosh-spline jadvallari: Quanjer PH et al. *Eur Respir J* 2012;40:1324–1343.
Jadval `rspiro` R paketidagi (`lookup`, T. Lytras) nusxadan `scripts/gen_gli2012.py` bilan eksport
qilingan; natijalar rspiro algoritmi bilan solishtirib testlangan (`__tests__/gli.test.ts`).

## Ishga tushirish (lokal)

```bash
npm ci
npm test            # 77 ta unit test (klinik modul, sana, eksport)
npm run typecheck && npm run lint
npm run dev         # http://localhost:3000 — dev'da admin/doctor parollari konsolga chiqadi
```

Muhit oʻzgaruvchilari: `.env.example`. Serverga joylash: [`deploy/README.md`](deploy/README.md).
