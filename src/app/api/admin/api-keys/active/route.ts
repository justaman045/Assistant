import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminDb } from "@/lib/firebase-admin";
import { invalidateKeyCache, getOpenRouterConfig } from "@/lib/openrouter-keys";

export const runtime = "nodejs";

const COL = "adminConfig";
const DOC = "openrouter";
const ENV_KEY_ID = "env";

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const { keyId } = (await req.json()) as { keyId: string };
  if (!keyId?.trim()) return new Response("keyId is required", { status: 400 });

  // "env" is always valid — it means use the environment variable
  if (keyId !== ENV_KEY_ID) {
    const config = await getOpenRouterConfig();
    const exists = config.keys.some((k) => k.id === keyId);
    if (!exists) return new Response("Key not found", { status: 404 });
  }

  const db = adminDb()!;
  const ref = db.collection(COL).doc(DOC);
  const snap = await ref.get();

  if (snap.exists) {
    await ref.update({ activeKeyId: keyId });
  } else {
    await ref.set({ activeKeyId: keyId, keys: [] });
  }

  invalidateKeyCache();
  return Response.json({ ok: true });
}
