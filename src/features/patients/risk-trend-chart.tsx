"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { RiskLevel } from "@/lib/clinical";
import { formatDate } from "@/lib/format";

export interface TrendPoint {
  date: string; // ISO
  score: number;
  level: RiskLevel;
}

interface Props {
  points: TrendPoint[];
  maxScore: number;
  thresholds: { medium: number; high: number };
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 92, bottom: 30, left: 32 };

/**
 * Risk score over time — single series (no legend; the card title names it).
 * Background zones mark the medium/high thresholds (labelled in text, not by
 * colour alone). Every point is a focusable hit target with a tooltip; the
 * same data is available as a table ("Shkalalar tarixi") below.
 */
export function RiskTrendChart({ points, maxScore, thresholds }: Props) {
  const t = useTranslations();
  const [active, setActive] = useState<number | null>(null);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const times = points.map((p) => Date.parse(p.date));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const x = (time: number) => PAD.left + (t1 === t0 ? plotW / 2 : ((time - t0) / (t1 - t0)) * plotW);
  const y = (score: number) => PAD.top + plotH - (score / maxScore) * plotH;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(times[i]!)},${y(p.score)}`).join(" ");
  const ticks = [0, thresholds.medium, thresholds.high, maxScore];
  const last = points.length - 1;

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("patient.chart.label")}>
        {/* zones */}
        <rect x={PAD.left} y={y(maxScore)} width={plotW} height={y(thresholds.high) - y(maxScore)} className="fill-risk-high-bg" />
        <rect x={PAD.left} y={y(thresholds.high)} width={plotW} height={y(thresholds.medium) - y(thresholds.high)} className="fill-risk-medium-bg" />
        {/* recessive grid + y ticks */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {v}
            </text>
          </g>
        ))}
        <text x={PAD.left + plotW + 8} y={(y(maxScore) + y(thresholds.high)) / 2} dy="0.32em" className="fill-muted-foreground text-[11px]">
          {t("risk.levels.high")}
        </text>
        <text x={PAD.left + plotW + 8} y={(y(thresholds.high) + y(thresholds.medium)) / 2} dy="0.32em" className="fill-muted-foreground text-[11px]">
          {t("risk.levels.medium")}
        </text>
        <text x={PAD.left + plotW + 8} y={(y(thresholds.medium) + y(0)) / 2} dy="0.32em" className="fill-muted-foreground text-[11px]">
          {t("risk.levels.low")}
        </text>
        {/* x labels: first and last only */}
        {[0, last].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} x={x(times[i]!)} y={H - 8} textAnchor={i === 0 && last > 0 ? "start" : "end"} className="fill-muted-foreground text-[11px] tabular-nums">
            {formatDate(points[i]!.date)}
          </text>
        ))}
        <path d={path} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g
            key={p.date}
            tabIndex={0}
            role="button"
            aria-label={`${formatDate(p.date)}: ${t("risk.score", { score: p.score, max: maxScore })}, ${t(`risk.levelLong.${p.level}`)}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="cursor-default outline-none"
          >
            <circle cx={x(times[i]!)} cy={y(p.score)} r={14} fill="transparent" />
            <circle cx={x(times[i]!)} cy={y(p.score)} r={active === i ? 7 : 5} className="fill-primary stroke-surface" strokeWidth={2} />
            {active === i ? <circle cx={x(times[i]!)} cy={y(p.score)} r={11} fill="none" className="stroke-ring" strokeWidth={2} /> : null}
          </g>
        ))}
        {/* direct label on the latest value only */}
        <text x={x(times[last]!)} y={y(points[last]!.score) - 12} textAnchor="middle" className="fill-foreground text-[12px] font-semibold tabular-nums">
          {points[last]!.score}
        </text>
      </svg>
      {active !== null ? (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md"
          style={{ left: `${(x(times[active]!) / W) * 100}%`, top: `${(y(points[active]!.score) / H) * 100}%`, marginTop: -14 }}
        >
          <p className="font-medium tabular-nums">{formatDate(points[active]!.date)}</p>
          <p className="text-muted-foreground">
            {t("risk.score", { score: points[active]!.score, max: maxScore })} · {t(`risk.levels.${points[active]!.level}`)}
          </p>
        </div>
      ) : null}
    </figure>
  );
}
