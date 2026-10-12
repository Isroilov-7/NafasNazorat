import { FlaskConical } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { SafetyNotice } from "@/components/clinical/safety-notice";
import { Logo } from "@/components/app/logo";
import { MobileNav } from "@/components/app/mobile-nav";
import { NavLinks } from "@/components/app/nav-links";
import { UserMenu } from "@/components/app/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { requireClinician } from "@/lib/server/auth/dal";
import { isDemoMode } from "@/lib/server/demo";

/**
 * Authenticated app shell. The chrome (logo, layout) is static; everything that
 * depends on the session (role-based nav, user menu, demo banner) streams in
 * behind Suspense, so the shell paints instantly.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[var(--sidebar-width)_1fr]">
      <div className="hidden border-r border-border bg-surface lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col gap-6 p-4">
        <Link href="/dashboard" className="rounded-md px-2 py-1">
          <Logo />
        </Link>
        <Suspense fallback={<NavSkeleton />}>
          <SidebarSession />
        </Suspense>
      </aside>
      </div>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex h-(--header-height) items-center gap-2 border-b border-border bg-surface/95 px-4 backdrop-blur lg:hidden">
          <Suspense fallback={<Skeleton className="size-11" />}>
            <MobileSession />
          </Suspense>
          <Link href="/dashboard" className="rounded-md px-1">
            <Logo />
          </Link>
        </header>
        <Suspense fallback={null}>
          <DemoBanner />
        </Suspense>
        <main id="main" className="mx-auto w-full max-w-(--content-max) flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
        <footer className="border-t border-border px-4 py-4 sm:px-6 lg:px-8">
          <SafetyNotice variant="compact" />
        </footer>
      </div>
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-11" />
      ))}
    </div>
  );
}

async function SidebarSession() {
  const user = await requireClinician();
  const t = await getTranslations("nav");
  return (
    <>
      <nav aria-label={t("main")} className="flex-1">
        <NavLinks isAdmin={user.role === "admin"} />
      </nav>
      <div className="border-t border-border pt-4">
        <UserMenu user={user} />
      </div>
    </>
  );
}

async function MobileSession() {
  const user = await requireClinician();
  return <MobileNav isAdmin={user.role === "admin"} footer={<UserMenu user={user} />} />;
}

async function DemoBanner() {
  await requireClinician();
  if (!isDemoMode()) return null;
  const t = await getTranslations("app");
  return (
    <p className="flex items-center justify-center gap-2 border-b border-risk-medium-border bg-risk-medium-bg px-4 py-2 text-center text-sm font-medium text-foreground">
      <FlaskConical className="size-4 shrink-0 text-risk-medium" aria-hidden="true" />
      {t("demoBanner")}
    </p>
  );
}
