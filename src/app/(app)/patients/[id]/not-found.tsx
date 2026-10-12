import { UserX } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function PatientNotFound() {
  const t = await getTranslations("patient.notFound");
  return (
    <Card>
      <EmptyState
        icon={UserX}
        title={t("title")}
        description={t("body")}
        action={
          <Button asChild>
            <Link href="/dashboard">{t("action")}</Link>
          </Button>
        }
      />
    </Card>
  );
}
