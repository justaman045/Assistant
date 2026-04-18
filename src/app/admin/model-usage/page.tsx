"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { BarChart2, Zap, TrendingUp, RefreshCw, Loader2 } from "lucide-react";

interface DailyStats {
  date: string;
  free: number;
  paid: number;
  total: number;
}

interface ModelStats {
  model: string;
  tier: "free" | "paid";
  count: number;
}

interface UsageSummary {
  daily: DailyStats[];
  byModel: ModelStats[];
  totalFree: number;
  totalPaid: number;
  totalRequests: number;
}

const DAY_OPTIONS = [7, 14, 30, 90];

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="flex h-full w-full items-end">
      <div
        className={`w-full rounded-t transition-all ${color}`}
        style={{ height: `${pct}%` }}
        title={String(value)}
      />
    </div>
  );
}

export default function ModelUsagePage() {
  const { user } = useAuth();
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  async function load(d = days) {
    setLoading(true);
    setError("");
    try {
      const token = await user!.getIdToken();
      const res = await fetch(`/api/admin/model-usage?days=${d}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) load(); }, [user]);

  function handleDaysChange(d: number) {
    setDays(d);
    load(d);
  }

  const maxDailyTotal = data ? Math.max(...data.daily.map((d) => d.total), 1) : 1;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Model Usage</h1>
          <p className="mt-1 text-sm text-gray-400">
            AI request analytics — free vs paid models, per-model breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => handleDaysChange(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                days === d
                  ? "bg-violet-600 text-white"
                  : "border border-gray-700 text-gray-400 hover:border-violet-600 hover:text-violet-300"
              }`}
            >
              {d}d
            </button>
          ))}
          <button onClick={() => load()} className="ml-1 text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-gray-400">Total Requests</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950">
                  <BarChart2 className="h-4 w-4 text-violet-400" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{(data?.totalRequests ?? 0).toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">last {days} days</p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-gray-400">Free Model Requests</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-950">
                  <Zap className="h-4 w-4 text-green-400" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{(data?.totalFree ?? 0).toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">
                {data && data.totalRequests > 0
                  ? `${Math.round((data.totalFree / data.totalRequests) * 100)}% of total`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-gray-400">Paid Model Requests</p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-950">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{(data?.totalPaid ?? 0).toLocaleString()}</p>
              <p className="mt-1 text-xs text-gray-500">
                {data && data.totalRequests > 0
                  ? `${Math.round((data.totalPaid / data.totalRequests) * 100)}% of total`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Daily bar chart */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-6 text-sm font-semibold text-white">Daily Requests</h2>
            {data?.daily.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No data yet for this period.</p>
            ) : (
              <>
                <div className="flex h-40 items-end gap-1">
                  {data?.daily.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <div className="relative w-full flex-1 flex items-end gap-0.5">
                        {/* Paid bar */}
                        <div className="flex-1 h-full flex items-end">
                          <div
                            className="w-full rounded-t bg-amber-500/70 transition-all"
                            style={{ height: maxDailyTotal > 0 ? `${Math.max(2, (d.paid / maxDailyTotal) * 100)}%` : "2%" }}
                            title={`Paid: ${d.paid}`}
                          />
                        </div>
                        {/* Free bar */}
                        <div className="flex-1 h-full flex items-end">
                          <div
                            className="w-full rounded-t bg-green-500/70 transition-all"
                            style={{ height: maxDailyTotal > 0 ? `${Math.max(2, (d.free / maxDailyTotal) * 100)}%` : "2%" }}
                            title={`Free: ${d.free}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* X-axis labels — show every N days to avoid crowding */}
                <div className="mt-2 flex gap-1">
                  {data?.daily.map((d, i) => {
                    const step = data.daily.length > 14 ? Math.ceil(data.daily.length / 7) : 1;
                    return (
                      <div key={d.date} className="flex-1 text-center">
                        {i % step === 0 && (
                          <span className="text-[10px] text-gray-600">{formatDate(d.date)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/70" />
                    <span className="text-xs text-gray-500">Paid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-green-500/70" />
                    <span className="text-xs text-gray-500">Free</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Per-model table */}
          <div className="rounded-xl border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-6 py-4">
              <h2 className="text-sm font-semibold text-white">Requests by Model</h2>
            </div>
            {data?.byModel.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No model usage data yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-6 py-3 text-xs font-medium text-gray-500">Model</th>
                    <th className="px-6 py-3 text-xs font-medium text-gray-500">Tier</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Requests</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data?.byModel.map((m) => {
                    const share = data.totalRequests > 0
                      ? Math.round((m.count / data.totalRequests) * 100)
                      : 0;
                    return (
                      <tr key={m.model} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs text-gray-300">{m.model}</td>
                        <td className="px-6 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.tier === "free"
                              ? "bg-green-900/50 text-green-400"
                              : "bg-amber-900/50 text-amber-400"
                          }`}>
                            {m.tier}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-sm text-white">{m.count.toLocaleString()}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-gray-800">
                              <div
                                className="h-full rounded-full bg-violet-500"
                                style={{ width: `${share}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
