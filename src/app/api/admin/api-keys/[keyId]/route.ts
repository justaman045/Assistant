import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminDb } from "@/lib/firebase-admin";
import { invalidateKeyCache, getOpenRouterConfig } from "@/lib/openrouter-keys";

export const runtime = "nodejs";

const COL = "adminConfig";
const DOC = "openrouter";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const { keyId } = await params;
  const db = adminDb()!;
  const config = await getOpenRouterConfig();

  const keyRecord = config.keys.find((k) => k.id === keyId);
  if (!keyRecord) return new Response("Key not found", { status: 404 });

  if (config.keys.length === 1) {
    return new Response("Cannot delete the last API key", { status: 400 });
  }

  // Remove the key from the array
  const updatedKeys = config.keys.filter((k) => k.id !== keyId);

  // If we deleted the active key, auto-promote the first remaining one
  const newActiveId =
    config.activeKeyId === keyId ? updatedKeys[0].id : config.activeKeyId;

  await db.collection(COL).doc(DOC).update({
    keys: updatedKeys,
    activeKeyId: newActiveId,
  });

  invalidateKeyCache();
  return Response.json({ ok: true, newActiveId });
}
