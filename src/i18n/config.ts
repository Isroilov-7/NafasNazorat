/**
 * i18n configuration. Uzbek (Latin) is the only shipped locale for the MVP;
 * ru/en are planned. Adding one = add messages/<locale>.json (same keys; the
 * TypeScript type below makes missing keys a compile error) + list it here +
 * switch `resolveLocale` in request.ts to read a cookie / user setting.
 */
export const locales = ["uz"] as const;
export const plannedLocales = ["ru", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "uz";

/** Clinic time zone — dates (review reminders) are interpreted in Tashkent time. */
export const timeZone = "Asia/Tashkent";

export const formats = {
  dateTime: {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    withTime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
  },
  number: {
    litres: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    ratio: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    percent0: { maximumFractionDigits: 0 },
    one: { maximumFractionDigits: 1 },
  },
} as const;
