import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export type ModelTier = "free" | "paid";
export type UsageFeature =
  | "content"
  | "roleplay"
  | "roleplay-generate"
  | "planner"
  | "finance"
  | "subscriptions"
  | "assistant"
  | "assistant-generate"
  | "memory"
  | "prompts"
  | "unknown";

export function getModelTier(modelId: string): ModelTier {
  return modelId.includes(":free") ? "free" : "paid";
}

/** Log a single model usage event. Fire-and-forget — never throw. */
export async function logModelUsage(
  model: string,
  feature: UsageFeature = "unknown",
  uid?: string
): Promise<void> {
  const db = adminDb();
  if (!db) return;

  const tier = getModelTier(model);
  const date = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  try {
    await db.collection("modelUsageLogs").add({
      model,
      tier,
      feature,
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

export interface FeatureStats {
  feature: UsageFeature;
  count: number;
}

export interface UsageSummary {
  daily: DailyStats[];
  byModel: ModelStats[];
  byFeature: FeatureStats[];
  totalFree: number;
  totalPaid: number;
  totalRequests: number;
}

/** Aggregate usage logs for admin dashboard. Fetches last `days` days. */
export async function getUsageSummary(days = 30): Promise<UsageSummary> {
  const db = adminDb();
  if (!db) return { daily: [], byModel: [], byFeature: [], totalFree: 0, totalPaid: 0, totalRequests: 0 };

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
  const featureMap = new Map<string, number>();

  for (const doc of snap.docs) {
    const { model, tier, date, feature } = doc.data() as {
      model: string;
      tier: ModelTier;
      date: string;
      feature?: UsageFeature;
    };

    const day = dailyMap.get(date) ?? { free: 0, paid: 0 };
    if (tier === "free") day.free++; else day.paid++;
    dailyMap.set(date, day);

    const m = modelMap.get(model) ?? { tier, count: 0 };
    m.count++;
    modelMap.set(model, m);

    const f = feature ?? "unknown";
    featureMap.set(f, (featureMap.get(f) ?? 0) + 1);
  }

  const daily: DailyStats[] = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { free, paid }]) => ({ date, free, paid, total: free + paid }));

  const byModel: ModelStats[] = Array.from(modelMap.entries())
    .map(([model, { tier, count }]) => ({ model, tier, count }))
    .sort((a, b) => b.count - a.count);

  const byFeature: FeatureStats[] = Array.from(featureMap.entries())
    .map(([feature, count]) => ({ feature: feature as UsageFeature, count }))
    .sort((a, b) => b.count - a.count);

  const totalFree = daily.reduce((s, d) => s + d.free, 0);
  const totalPaid = daily.reduce((s, d) => s + d.paid, 0);

  return { daily, byModel, byFeature, totalFree, totalPaid, totalRequests: totalFree + totalPaid };
}
