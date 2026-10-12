import { getRequestConfig } from "next-intl/server";
import { defaultLocale, formats, timeZone } from "./config";

/**
 * Single-locale setup: the locale is fixed (no cookie/header read), so
 * translated server components stay static and prerenderable under
 * Cache Components. When ru/en ship, resolve the locale from a cookie here.
 */
export default getRequestConfig(async () => {
  const locale = defaultLocale;
  return {
    locale,
    timeZone,
    formats,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
