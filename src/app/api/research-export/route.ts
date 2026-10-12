import { NextResponse } from "next/server";
import { buildResearchExport, toCsv } from "@/lib/domain/researchExport";
import { getSessionUser } from "@/lib/server/auth/dal";
import { listAllAssessments } from "@/lib/server/repositories/assessments";
import { writeAudit } from "@/lib/server/repositories/audit";
import { listAllPatients } from "@/lib/server/repositories/patients";
import { listAllSpirometry } from "@/lib/server/repositories/spirometry";

/** Admin-only anonymised export (consented patients only). ?format=csv|json */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const rows = buildResearchExport(listAllPatients(), listAllAssessments(), listAllSpirometry());
  writeAudit({ actorId: user.id, action: "export", entity: "researchExport", fields: [`rows:${rows.length}`] });
  const format = new URL(request.url).searchParams.get("format");
  const stamp = new Date().toISOString().slice(0, 10);
  const headers = { "Cache-Control": "no-store" };
  if (format === "csv") {
    return new NextResponse(toCsv(rows), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="nafasnazorat-research-${stamp}.csv"` },
    });
  }
  return NextResponse.json(
    { generatedAt: new Date().toISOString(), consentedOnly: true, rows },
    { headers: { ...headers, "Content-Disposition": `attachment; filename="nafasnazorat-research-${stamp}.json"` } },
  );
}
