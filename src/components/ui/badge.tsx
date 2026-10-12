import { type VariantProps, cva } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-muted text-foreground",
        primary: "border-primary/25 bg-primary-soft text-primary-soft-foreground",
        low: "border-risk-low-border bg-risk-low-bg text-risk-low",
        medium: "border-risk-medium-border bg-risk-medium-bg text-risk-medium",
        high: "border-risk-high-border bg-risk-high-bg text-risk-high",
        info: "border-info-border bg-info-bg text-info",
      },
      size: {
        sm: "px-2 py-0.5 text-xs [&_svg]:size-3.5",
        md: "px-2.5 py-1 text-sm [&_svg]:size-4",
        lg: "px-3.5 py-1.5 text-base font-semibold [&_svg]:size-5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}
