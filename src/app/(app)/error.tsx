"use client";

import { RotateCcw, ServerCrash } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/** Friendly error state for any app screen — no raw error dumps. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <Card>
      <EmptyState
        icon={ServerCrash}
        title={t("errors.generic.title")}
        description={t("errors.generic.body")}
        action={
          <Button onClick={reset}>
            <RotateCcw /> {t("common.retry")}
          </Button>
        }
      />
    </Card>
  );
}
