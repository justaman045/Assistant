import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export type ModelTier = "free" | "paid";

export function getModelTier(modelId: string): ModelTier {
  return modelId.includes(":free") ? "free" : "paid";
}

/** Log a single model usage event. Fire-and-forget — never throw. */
export async function logModelUsage(model: string, uid?: string): Promise<void> {
  const db = adminDb();
  if (!db) return;

  const tier = getModelTier(model);
  const date = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  try {
    await db.collection("modelUsageLogs").add({
      model,
      tier,
      date,
      uid: uid ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error("[model-usage] Failed to log:", e);
  }
}

export interface DailyStats {
  date: string;
  free: number;
  paid: number;
  total: number;
}

export interface ModelStats {
  model: string;
  tier: ModelTier;
  count: number;
}

export interface UsageSummary {
  daily: DailyStats[];       // last N days, sorted ascending
  byModel: ModelStats[];     // all-time per model, sorted by count desc
  totalFree: number;
  totalPaid: number;
  totalRequests: number;
}

/** Aggregate usage logs for admin dashboard. Fetches last `days` days. */
export async function getUsageSummary(days = 30): Promise<UsageSummary> {
  const db = adminDb();
  if (!db) return { daily: [], byModel: [], totalFree: 0, totalPaid: 0, totalRequests: 0 };

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);

  const snap = await db
    .collection("modelUsageLogs")
    .where("date", ">=", sinceDate)
    .orderBy("date", "asc")
    .get();

  const dailyMap = new Map<string, { free: number; paid: number }>();
  const modelMap = new Map<string, { tier: ModelTier; count: number }>();

  for (const doc of snap.docs) {
    const { model, tier, date } = doc.data() as { model: string; tier: ModelTier; date: string };

    // Daily aggregation
    const day = dailyMap.get(date) ?? { free: 0, paid: 0 };
    if (tier === "free") day.free++; else day.paid++;
    dailyMap.set(date, day);

    // Per-model aggregation
    const m = modelMap.get(model) ?? { tier, count: 0 };
    m.count++;
    modelMap.set(model, m);
  }

  const daily: DailyStats[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { free, paid }]) => ({ date, free, paid, total: free + paid }));

  const byModel: ModelStats[] = Array.from(modelMap.entries())
    .map(([model, { tier, count }]) => ({ model, tier, count }))
    .sort((a, b) => b.count - a.count);

  const totalFree = daily.reduce((s, d) => s + d.free, 0);
  const totalPaid = daily.reduce((s, d) => s + d.paid, 0);

  return { daily, byModel, totalFree, totalPaid, totalRequests: totalFree + totalPaid };
}
