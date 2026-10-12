import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AssessmentWizard } from "@/features/assessment/assessment-wizard";
import type { PatientSummary } from "@/features/assessment/wizard-state";
import { requireClinician } from "@/lib/server/auth/dal";
import { listAssessments } from "@/lib/server/repositories/assessments";
import { getPatient } from "@/lib/server/repositories/patients";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("assessment");
  return { title: t("title") };
}

export default async function NewAssessmentPage({ searchParams }: PageProps<"/assessments/new">) {
  await requireClinician();
  const t = await getTranslations("assessment");
  const { patientId } = await searchParams;
  let existing: PatientSummary | null = null;
  if (typeof patientId === "string") {
    const p = getPatient(patientId);
    if (p) {
      const last = listAssessments(p.id).at(-1);
      existing = { id: p.id, pseudoId: p.pseudoId, fullName: p.fullName, birthDate: p.birthDate, sex: p.sex, lastHeightCm: last?.answers.heightCm ?? null };
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
      </header>
      <AssessmentWizard existingPatient={existing} />
    </div>
  );
}
