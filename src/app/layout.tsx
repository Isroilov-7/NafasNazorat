import "@fontsource-variable/inter";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Toaster } from "@/components/ui/toaster";
import { defaultLocale } from "@/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: { default: t("fullTitle"), template: `%s · ${t("name")}` },
    description: t("tagline"),
    robots: { index: false, follow: false }, // pilot: keep out of search engines
  };
}

export const viewport: Viewport = {
  themeColor: "#0b6e7f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("nav");
  return (
    <html lang={defaultLocale} data-theme="light">
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[100] rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
