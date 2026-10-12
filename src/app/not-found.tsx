import { Compass } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4">
      <EmptyState
        icon={Compass}
        title={t("errors.notFound.title")}
        description={t("errors.notFound.body")}
        action={
          <Button asChild>
            <Link href="/">{t("nav.home")}</Link>
          </Button>
        }
      />
    </main>
  );
}
