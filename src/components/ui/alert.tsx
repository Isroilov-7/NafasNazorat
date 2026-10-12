import { type VariantProps, cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert, type LucideIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-lg border p-4 text-[0.9375rem]", {
  variants: {
    tone: {
      info: "border-info-border bg-info-bg text-foreground [&_[data-icon]]:text-info",
      success: "border-risk-low-border bg-risk-low-bg text-foreground [&_[data-icon]]:text-risk-low",
      warning: "border-risk-medium-border bg-risk-medium-bg text-foreground [&_[data-icon]]:text-risk-medium",
      danger: "border-risk-high-border bg-risk-high-bg text-foreground [&_[data-icon]]:text-risk-high",
    },
  },
  defaultVariants: { tone: "info" },
});

const ICONS: Record<NonNullable<VariantProps<typeof alertVariants>["tone"]>, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: OctagonAlert,
};

interface AlertProps extends Omit<React.ComponentProps<"div">, "title">, VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  icon?: LucideIcon;
}

export function Alert({ className, tone, title, icon, children, role, ...props }: AlertProps) {
  const Icon = icon ?? ICONS[tone ?? "info"];
  return (
    <div role={role ?? (tone === "danger" ? "alert" : "status")} className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon data-icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        {title ? <p className="font-semibold leading-snug">{title}</p> : null}
        {children ? <div className="text-foreground/90">{children}</div> : null}
      </div>
    </div>
  );
}
