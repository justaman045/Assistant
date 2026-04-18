import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getActiveApiKey, maskKey } from "@/lib/openrouter-keys";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const key = await getActiveApiKey();
  if (!key) {
    return Response.json({ ok: false, error: "No API key configured", maskedKey: null });
  }

  const maskedKey = maskKey(key);

  // Validate key by fetching model list — lightweight, no token cost
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return Response.json({ ok: false, maskedKey, status: res.status, error: body.slice(0, 200) });
    }

    const data = await res.json() as { data?: { id: string }[] };
    const modelCount = data.data?.length ?? 0;

    return Response.json({ ok: true, maskedKey, modelCount });
  } catch (e) {
    return Response.json({ ok: false, maskedKey, error: (e as Error).message });
  }
}
