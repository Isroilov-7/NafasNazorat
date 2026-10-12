import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

/** Liveness/readiness for Docker healthcheck & monitoring. No data exposed. */
export async function GET() {
  try {
    getDb().prepare("SELECT 1").get();
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
