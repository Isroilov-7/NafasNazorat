import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { type SpiroPatient, SpirometryInterpreter } from "@/features/spirometry/spirometry-interpreter";
import { ageOn, todayInClinic } from "@/lib/domain/dates";
import { requireClinician } from "@/lib/server/auth/dal";
import { listAssessments } from "@/lib/server/repositories/assessments";
import { getPatient } from "@/lib/server/repositories/patients";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("spirometry");
  return { title: t("title") };
}

export default async function SpirometryPage({ searchParams }: PageProps<"/spirometry/new">) {
  await requireClinician();
  const t = await getTranslations("spirometry");
  const { patientId } = await searchParams;
  let patient: SpiroPatient | null = null;
  if (typeof patientId === "string") {
    const p = getPatient(patientId);
    if (p) {
      patient = {
        id: p.id,
        fullName: p.fullName,
        pseudoId: p.pseudoId,
        sex: p.sex,
        ageYears: ageOn(p.birthDate, todayInClinic()),
        heightCm: listAssessments(p.id).at(-1)?.answers.heightCm ?? null,
      };
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">{t("subtitle")}</p>
      </header>
      <SpirometryInterpreter patient={patient} />
    </div>
  );
}
