"use client";

import { BookOpen, ClipboardList, LayoutDashboard, Palette, Settings, Wind } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard, admin: false },
  { href: "/assessments/new", key: "newAssessment", icon: ClipboardList, admin: false },
  { href: "/spirometry/new", key: "spirometry", icon: Wind, admin: false },
  { href: "/metodika", key: "method", icon: BookOpen, admin: false },
  { href: "/admin", key: "admin", icon: Settings, admin: true },
  { href: "/design-system", key: "designSystem", icon: Palette, admin: true },
] as const;

export function NavLinks({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {ITEMS.filter((i) => !i.admin || isAdmin).map(({ href, key, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) || (href === "/dashboard" && pathname.startsWith("/patients"));
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-medium transition-colors",
                active ? "bg-primary-soft text-primary-soft-foreground" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {t(key)}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
