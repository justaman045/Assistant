import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { maskKey, generateKeyId, invalidateKeyCache, getOpenRouterConfig } from "@/lib/openrouter-keys";

export const runtime = "nodejs";

const COL = "adminConfig";
const DOC = "openrouter";

const ENV_KEY_ID = "env";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const config = await getOpenRouterConfig();
  const envKeyValue = process.env.OPENROUTER_API_KEY ?? "";

  // Stored keys (masked, never expose actual value)
  const storedKeys = config.keys.map(({ id, label, maskedKey, addedAt }) => ({
    id,
    label,
    maskedKey,
    addedAt: typeof addedAt === "string" ? addedAt : null,
    isEnv: false,
  }));

  // Virtual env key — always shown, cannot be deleted
  const envKey = {
    id: ENV_KEY_ID,
    label: "Environment Variable (OPENROUTER_API_KEY)",
    maskedKey: envKeyValue ? maskKey(envKeyValue) : "(not set)",
    addedAt: null as null,
    isEnv: true,
  };

  // Determine effective activeKeyId — default to env if nothing set
  const activeKeyId = config.activeKeyId ?? ENV_KEY_ID;

  return Response.json({
    activeKeyId,
    keys: [envKey, ...storedKeys],
  });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const { key, label } = (await req.json()) as { key: string; label?: string };
  if (!key?.trim()) return new Response("API key is required", { status: 400 });

  const db = adminDb()!;
  const id = generateKeyId();
  const maskedKey = maskKey(key.trim());
  const keyLabel = label?.trim() || `Key added ${new Date().toLocaleDateString()}`;

  // Use ISO string instead of FieldValue.serverTimestamp() — banned inside arrays
  const newEntry = {
    id,
    label: keyLabel,
    key: key.trim(),
    maskedKey,
    addedAt: new Date().toISOString(),
  };

  const ref = db.collection(COL).doc(DOC);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({ activeKeyId: id, keys: [newEntry] });
  } else {
    // arrayUnion works fine with plain objects (no FieldValues inside)
    await ref.update({ keys: FieldValue.arrayUnion(newEntry) });
  }

  invalidateKeyCache();
  return Response.json({ id, label: keyLabel, maskedKey }, { status: 201 });
}
