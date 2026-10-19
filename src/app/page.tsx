import { ArrowRight, BarChart3, BookOpen, ClipboardList, Database, ShieldCheck, Stethoscope, Wind } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { connection } from "next/server";
import { DemoLoginButton } from "@/components/app/demo-login-button";
import { Logo } from "@/components/app/logo";
import { demoDoctorEmail } from "@/lib/server/demo";
import { describeRiskScale } from "@/lib/clinical";
import { RiskBadge } from "@/components/clinical/risk-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Public landing page — static (prerendered), no session read. */
export default async function LandingPage() {
  const t = await getTranslations();
  const features = [
    { key: "risk", icon: ClipboardList },
    { key: "spiro", icon: Wind },
    { key: "dashboard", icon: BarChart3 },
    { key: "research", icon: Database },
  ] as const;
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <Button asChild>
            <Link href="/login">{t("landing.ctaLogin")}</Link>
          </Button>
        </div>
      </header>

      <main id="main">
        <section className="border-b border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
            <div className="flex flex-col gap-6">
              <Badge tone="primary" className="self-start">
                <Stethoscope aria-hidden="true" /> {t("landing.badge")}
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{t("landing.heroTitle")}</h1>
              <p className="max-w-xl text-lg text-muted-foreground">{t("landing.heroBody")}</p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/login">
                    {t("landing.ctaLogin")} <ArrowRight />
                  </Link>
                </Button>
                <Suspense fallback={null}>
                  <DemoLoginButton label="landing.ctaDemo" />
                </Suspense>
                <Button size="lg" variant="outline" asChild>
                  <a href="#how">{t("landing.ctaHow")}</a>
                </Button>
              </div>
              <Suspense fallback={null}>
                <DemoNote />
              </Suspense>
            </div>
            {/* Illustrative result card (static example, not patient data) */}
            <Card className="shadow-lg" aria-label={t("landing.exampleLabel")}>
              <CardContent className="flex flex-col gap-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("landing.exampleLabel")}</p>
                <p className="text-sm font-medium text-muted-foreground">{t("risk.question")}</p>
                <RiskBadge level="high" size="lg" variant="long" className="self-start" />
                <p className="text-lg font-semibold">{t("landing.exampleExplanation")}</p>
                <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">FEV1/FVC</p>
                    <p className="text-2xl font-semibold">0,51</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">GOLD</p>
                    <p className="text-2xl font-semibold">2</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CAT</p>
                    <p className="text-2xl font-semibold">23</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">{t("landing.problemTitle")}</h2>
          <p className="mt-3 max-w-3xl text-lg text-muted-foreground">{t("landing.problemBody")}</p>
        </section>

        <section id="how" className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">{t("landing.howTitle")}</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {(["1", "2", "3"] as const).map((n) => (
                <li key={n} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{n}</span>
                  <div>
                    <h3 className="font-semibold">{t(`landing.how.${n}.title`)}</h3>
                    <p className="mt-1 text-muted-foreground">{t(`landing.how.${n}.body`)}</p>
                  </div>
                </li>
              ))}
            </ol>
            <Button variant="outline" className="mt-8" asChild>
              <Link href="/metodika">
                <BookOpen /> {t("landing.methodCta", { max: describeRiskScale().maxScore })} <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">{t("landing.featuresTitle")}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ key, icon: Icon }) => (
              <Card key={key}>
                <CardContent className="flex flex-col gap-3">
                  <span className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="font-semibold">{t(`landing.features.${key}.title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`landing.features.${key}.body`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6 md:grid-cols-2">
          <Card className="border-info-border bg-info-bg">
            <CardContent className="flex gap-4">
              <ShieldCheck className="size-6 shrink-0 text-info" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold">{t("landing.safetyTitle")}</h2>
                <p className="mt-1 text-foreground/90">{t("landing.safetyBody")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex gap-4">
              <Database className="size-6 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold">{t("landing.statusTitle")}</h2>
                <p className="mt-1 text-muted-foreground">{t("landing.statusBody")}</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">{t("landing.footer", { year: 2026 })}</div>
      </footer>
    </div>
  );
}

async function DemoNote() {
  await connection();
  if (!demoDoctorEmail()) return null;
  const t = await getTranslations("landing");
  return <p className="text-sm text-muted-foreground">{t("demoNote")}</p>;
}
