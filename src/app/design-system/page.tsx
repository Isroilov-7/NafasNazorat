import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Showcase } from "./showcase";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("designSystem");
  return { title: t("title") };
}

export default async function DesignSystemPage() {
  const t = await getTranslations("designSystem");
  return (
    <main id="main" className="mx-auto flex max-w-(--content-max) flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </header>
      <Showcase />
    </main>
  );
}
