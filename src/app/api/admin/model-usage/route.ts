import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getUsageSummary } from "@/lib/model-usage";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days") ?? 30)));

  const summary = await getUsageSummary(days);
  return Response.json(summary);
}
