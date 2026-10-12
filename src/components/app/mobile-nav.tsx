"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useState } from "react";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";

/** Slide-in navigation drawer for phones/tablets (< lg). Focus-trapped, Esc closes. */
export function MobileNav({ isAdmin, footer }: { isAdmin: boolean; footer?: React.ReactNode }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger className="flex size-11 items-center justify-center rounded-md text-foreground hover:bg-surface-muted lg:hidden">
        <Menu className="size-6" aria-hidden="true" />
        <span className="sr-only">{t("nav.openMenu")}</span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-6 bg-surface p-4 shadow-lg data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left">
          <div className="flex items-center justify-between">
            <Logo />
            <DialogPrimitive.Close className="flex size-11 items-center justify-center rounded-md hover:bg-surface-muted">
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">{t("common.close")}</span>
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Title className="sr-only">{t("nav.main")}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{t("app.tagline")}</DialogPrimitive.Description>
          <nav aria-label={t("nav.main")} className="flex-1">
            <NavLinks isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
          </nav>
          {footer}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
