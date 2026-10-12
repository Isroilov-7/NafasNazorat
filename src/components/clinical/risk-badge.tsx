import { AlertTriangle, CircleCheck, CircleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RiskLevel } from "@/lib/clinical";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const ICON = { low: CircleCheck, medium: CircleAlert, high: AlertTriangle } as const;

interface RiskBadgeProps {
  level: RiskLevel;
  size?: BadgeProps["size"];
  /** "short" = "Yuqori", "long" = "Yuqori ehtimollik". */
  variant?: "short" | "long";
  className?: string;
}

/**
 * Traffic-light risk indicator. Always colour + icon + text (WCAG 1.4.1 —
 * never colour alone), so it reads correctly for colour-blind users and in
 * greyscale print.
 */
export function RiskBadge({ level, size = "md", variant = "short", className }: RiskBadgeProps) {
  const t = useTranslations("risk");
  const Icon = ICON[level];
  return (
    <Badge tone={level} size={size} className={className}>
      <Icon aria-hidden="true" strokeWidth={2.25} />
      {variant === "long" ? t(`levelLong.${level}`) : t(`levels.${level}`)}
    </Badge>
  );
}
