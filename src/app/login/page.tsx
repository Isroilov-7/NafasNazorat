import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DemoLoginButton } from "@/components/app/demo-login-button";
import { Logo } from "@/components/app/logo";
import { SafetyNotice } from "@/components/clinical/safety-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

export default async function LoginPage() {
  const t = await getTranslations();
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Link href="/" className="rounded-md">
        <Logo />
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{t("auth.title")}</CardTitle>
          <CardDescription>{t("auth.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <LoginForm />
          </Suspense>
          <Suspense fallback={null}>
            <DemoLoginButton label="auth.demoButton" variant="outline" className="mt-5 border-t border-border pt-5" />
          </Suspense>
        </CardContent>
      </Card>
      <SafetyNotice className="w-full max-w-md" />
    </main>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-16" />
      <Skeleton className="h-16" />
      <Skeleton className="h-12" />
    </div>
  );
}
