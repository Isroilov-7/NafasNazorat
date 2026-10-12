# NafasNazorat — Claude uchun xarita

PlagiatX'dan **mustaqil loyiha** (OSOK erta aniqlash sayti). Javoblar o'zbek tilida. Batafsil: `README.md`.
@AGENTS.md

- Klinik hisob-kitob FAQAT `src/lib/clinical/` da (sof, testlangan). Komponentlarda klinik matematika yo'q.
- Xavf vaznlari `riskConfig.ts` da; o'zgartirsangiz `version` ni oshiring.
- Har bir natija ekranida `SafetyNotice`; xavf darajasi doim rang + ikon + matn (`RiskBadge`).
- Matnlar faqat `messages/uz.json` orqali (oʻ gʻ ʼ = U+02BB/U+02BC). Komponentda qattiq matn yo'q.
- PII loglarga, audit qiymatlariga, brauzer xotirasiga va tadqiqot eksportiga tushmaydi.
- Server sahifa/action: avval `requireClinician()`/`requireAdmin()`.
- Tekshiruv: `npm test && npm run typecheck && npm run lint && npm run build`.
- Next.js 16 (Cache Components): sessiya o'qiydigan sahifaga `loading.tsx` kerak, aks holda build yiqiladi.
