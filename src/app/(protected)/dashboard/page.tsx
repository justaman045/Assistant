"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Item } from "@/lib/types";
import { UsageRecord, fetchUsageRecords } from "@/lib/usage";
import { FileText, TrendingUp, CalendarDays, PlusCircle, Cpu, Zap, BarChart2, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

function startOfDay(d: Date) { const c = new Date(d); c.setHours(0,0,0,0); return c; }
function endOfDay(d: Date) { const c = new Date(d); c.setHours(23,59,59,999); return c; }
function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d;
  });
}
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n/1_000).toFixed(1)}K`;
  return String(n);
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning"; if (h < 18) return "afternoon"; return "evening";
}

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db,"items"), where("uid","==",user.uid), orderBy("createdAt","desc"))).then((snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item,"id">) })));
      setLoadingData(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchUsageRecords(user.uid).then((r) => { setUsageRecords(r); setLoadingUsage(false); });
  }, [user]);

  const days = last7Days();
  const weekStart = startOfDay(days[0]);

  const itemsThisWeek = items.filter((i) => { const t = i.createdAt?.toDate(); return t && t >= weekStart; }).length;
  const dailyItemCounts = days.map((day) => {
    const s = startOfDay(day), e = endOfDay(day);
    return items.filter((i) => { const t = i.createdAt?.toDate(); return t && t >= s && t <= e; }).length;
  });
  const maxItemCount = Math.max(...dailyItemCounts, 1);

  const totalGenerations = usageRecords.length;
  const generationsThisWeek = usageRecords.filter((r) => { const t = r.createdAt?.toDate(); return t && t >= weekStart; }).length;
  const tokensThisWeek = usageRecords.filter((r) => { const t = r.createdAt?.toDate(); return t && t >= weekStart; }).reduce((s,r) => s + r.totalTokens, 0);
  const totalTokensAllTime = usageRecords.reduce((s,r) => s + r.totalTokens, 0);

  const dailyGenCounts = days.map((day) => {
    const s = startOfDay(day), e = endOfDay(day);
    return usageRecords.filter((r) => { const t = r.createdAt?.toDate(); return t && t >= s && t <= e; }).length;
  });
  const maxGenCount = Math.max(...dailyGenCounts, 1);

  const modelCounts: Record<string,{requests:number;tokens:number}> = {};
  for (const r of usageRecords) {
    if (!modelCounts[r.model]) modelCounts[r.model] = { requests:0, tokens:0 };
    modelCounts[r.model].requests++;
    modelCounts[r.model].tokens += r.totalTokens;
  }
  const topModels = Object.entries(modelCounts).sort((a,b) => b[1].requests - a[1].requests).slice(0,5).map(([model,stats]) => ({
    name: model.split("/")[1] ?? model,
    provider: model.split("/")[0] ?? "",
    ...stats,
  }));
  const maxModelRequests = topModels[0]?.requests ?? 1;

  const recentItems = items.slice(0, 5);
  const memberSince = userProfile?.createdAt
    ? userProfile.createdAt.toDate().toLocaleDateString("en-US", { month:"long", year:"numeric" })
    : "—";

  const displayName = userProfile?.preferredName ?? userProfile?.displayName ?? "there";

  return (
    <div className="space-y-6 page-enter">

      {/* ── Welcome banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-6 text-white shadow-lg shadow-indigo-200/40 dark:shadow-indigo-900/30">
        {/* Background decoration */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 right-24 h-36 w-36 rounded-full bg-white/5" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="" className="h-12 w-12 rounded-full ring-2 ring-white/30" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold backdrop-blur-sm">
                {displayName[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-indigo-200">Good {getGreeting()}</p>
              <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
              {userProfile?.role && (
                <p className="mt-0.5 text-xs text-indigo-300">{userProfile.role}</p>
              )}
            </div>
          </div>

          <Link
            href="/content/create"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-all hover:bg-white/25"
          >
            <PlusCircle className="h-4 w-4" />
            Create
          </Link>
        </div>

        {/* Quick stats inside banner */}
        <div className="relative mt-5 grid grid-cols-3 gap-3">
          {[
            { label: "Saved items", value: loadingData ? null : items.length },
            { label: "This week", value: loadingData ? null : itemsThisWeek },
            { label: "Generations", value: loadingUsage ? null : totalGenerations },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur-sm">
              <p className="text-[10px] font-medium text-indigo-200">{label}</p>
              {value === null ? (
                <div className="mt-1 h-6 w-10 animate-pulse rounded bg-white/20" />
              ) : (
                <p className="mt-0.5 text-lg font-bold">{value.toLocaleString()}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Saved Items"           value={String(items.length)}             loading={loadingData}  icon={FileText}   color="indigo" />
        <StatCard label="Saved This Week"       value={String(itemsThisWeek)}            loading={loadingData}  icon={TrendingUp} color={itemsThisWeek > 0 ? "green" : "indigo"} />
        <StatCard label="Member Since"          value={memberSince}                      small                  icon={CalendarDays} color="slate" />
        <StatCard label="Total Generations"     value={String(totalGenerations)}         loading={loadingUsage} icon={Cpu}        color="violet" />
        <StatCard label="Generations (Week)"    value={String(generationsThisWeek)}      loading={loadingUsage} icon={Zap}        color={generationsThisWeek > 0 ? "green" : "violet"} />
        <StatCard label="Tokens (All Time)"     value={formatTokens(totalTokensAllTime)} loading={loadingUsage} icon={BarChart2}  color="violet" />
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Generations chart */}
        <Card className="lg:col-span-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Generations</h2>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">last 7 days</p>
            </div>
            {!loadingUsage && (
              <div className="text-right">
                <span className="block text-xs font-semibold text-violet-600 dark:text-violet-400">{generationsThisWeek} this week</span>
                <span className="block text-xs text-gray-400 dark:text-gray-500">{formatTokens(tokensThisWeek)} tokens</span>
              </div>
            )}
          </div>
          <BarChart counts={dailyGenCounts} maxCount={maxGenCount} days={days} loading={loadingUsage} color="violet" />
          {!loadingUsage && usageRecords.length === 0 && (
            <p className="mt-3 text-center text-xs text-gray-400">
              No generations yet — <Link href="/content/create" className="text-violet-600 hover:underline dark:text-violet-400">create your first</Link>
            </p>
          )}
        </Card>

        {/* Saved items chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Saved Items</h2>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">last 7 days</p>
            </div>
            {!loadingData && (
              <span className="text-xs text-gray-400">{dailyItemCounts.reduce((a,b)=>a+b,0)} total</span>
            )}
          </div>
          <BarChart counts={dailyItemCounts} maxCount={maxItemCount} days={days} loading={loadingData} color="indigo" />
        </Card>
      </div>

      {/* ── ROI metrics ─────────────────────────────────────────────────── */}
      {!loadingUsage && totalGenerations > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Estimated time saved", value: `~${Math.round(totalGenerations * 12)} min`, sub: "at ~12 min/generation" },
            { label: "Writing automated",    value: `~${(totalGenerations * 0.2).toFixed(1)} hrs`, sub: "of manual work" },
            { label: "ChatGPT Plus equiv.",  value: `$${(totalGenerations * 0.06).toFixed(2)}`, sub: "value generated" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-center dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <p className="text-xs font-medium text-indigo-600/70 dark:text-indigo-400/70">{label}</p>
              <p className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-300">{value}</p>
              <p className="mt-0.5 text-[10px] text-indigo-500/60 dark:text-indigo-500">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Model usage + token breakdown ───────────────────────────────── */}
      {(loadingUsage || topModels.length > 0) && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Models Used</h2>
              <span className="text-xs text-gray-400">by requests</span>
            </div>
            {loadingUsage ? (
              <div className="space-y-3">
                {[...Array(3)].map((_,i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between"><Skeleton className="h-4 w-32"/><Skeleton className="h-4 w-16"/></div>
                    <Skeleton className="h-1.5 w-full"/>
                  </div>
                ))}
              </div>
            ) : topModels.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No model usage yet.</p>
            ) : (
              <ul className="space-y-3">
                {topModels.map((m) => (
                  <li key={m.name}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">{m.name}</span>
                        <span className="ml-1.5 text-xs text-gray-400">{m.provider}</span>
                      </div>
                      <div className="ml-3 shrink-0 text-right">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{m.requests}</span>
                        <span className="ml-1 text-xs text-gray-400">· {formatTokens(m.tokens)} tok</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${(m.requests/maxModelRequests)*100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Token Breakdown</h2>
              <span className="text-xs text-gray-400">all time</span>
            </div>
            {loadingUsage ? (
              <div className="space-y-4">
                {[...Array(2)].map((_,i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between"><Skeleton className="h-4 w-24"/><Skeleton className="h-4 w-16"/></div>
                    <Skeleton className="h-2 w-full"/>
                  </div>
                ))}
              </div>
            ) : usageRecords.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No usage data yet.</p>
            ) : (
              <div className="space-y-4">
                <TokenRow label="Input tokens"  value={usageRecords.reduce((s,r)=>s+r.promptTokens,0)}     color="bg-gradient-to-r from-blue-400 to-blue-500"   total={totalTokensAllTime} />
                <TokenRow label="Output tokens" value={usageRecords.reduce((s,r)=>s+r.completionTokens,0)} color="bg-gradient-to-r from-violet-400 to-violet-500" total={totalTokensAllTime} />
                <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total tokens</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">{totalTokensAllTime.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-400">
                    <span>This week</span>
                    <span>{tokensThisWeek.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Recent generations + saved items ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Generations</h2>
          {loadingUsage ? (
            <ul className="space-y-3">
              {[...Array(5)].map((_,i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Skeleton className="h-7 w-7 shrink-0 rounded-lg"/>
                  <div className="flex-1 space-y-1"><Skeleton className="h-3.5 w-3/4"/><Skeleton className="h-3 w-1/2"/></div>
                </li>
              ))}
            </ul>
          ) : usageRecords.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">None yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {usageRecords.slice(0,6).map((r) => (
                <li key={r.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950">
                    <Cpu className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400"/>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-gray-800 dark:text-gray-200">{r.topic || r.contentType}</p>
                    <p className="text-xs text-gray-400">
                      {formatTokens(r.totalTokens)} tokens{r.tokensExact ? "" : " est."}
                      {r.createdAt && <span> · {r.createdAt.toDate().toLocaleDateString()}</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent saved items */}
        <div className="lg:col-span-2 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-900 dark:ring-gray-700/80">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Recent Saved Items</h2>
            <Link href="/content/history" className="flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              View all <ArrowUpRight className="h-3 w-3"/>
            </Link>
          </div>
          {loadingData ? (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {[...Array(4)].map((_,i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl"/>
                  <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-48"/><Skeleton className="h-3 w-64"/></div>
                  <Skeleton className="h-3 w-14 shrink-0"/>
                </li>
              ))}
            </ul>
          ) : recentItems.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-gray-200 dark:text-gray-700"/>
              <p className="text-sm text-gray-500">Nothing saved yet.</p>
              <Link href="/content/create" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                Create your first item →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recentItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-white/3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-sm font-bold text-indigo-600 dark:from-indigo-950 dark:to-indigo-900 dark:text-indigo-400">
                    {item.title[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.title}</p>
                      {item.contentType && (
                        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          {item.contentType}
                        </span>
                      )}
                    </div>
                    {item.content && (
                      <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">{item.content}</p>
                    )}
                  </div>
                  {item.createdAt && (
                    <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                      {item.createdAt.toDate().toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-900 dark:ring-gray-700/80 ${className}`}>
      {children}
    </div>
  );
}

const COLOR_MAP = {
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/60",  text: "text-indigo-600 dark:text-indigo-400",  border: "border-indigo-100 dark:border-indigo-900" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/60",  text: "text-violet-600 dark:text-violet-400",  border: "border-violet-100 dark:border-violet-900" },
  green:  { bg: "bg-emerald-50 dark:bg-emerald-950/60",text: "text-emerald-600 dark:text-emerald-400",border: "border-emerald-100 dark:border-emerald-900" },
  slate:  { bg: "bg-slate-50 dark:bg-slate-900/60",    text: "text-slate-500 dark:text-slate-400",    border: "border-slate-100 dark:border-slate-800" },
};

function StatCard({ label, value, small, icon: Icon, color = "indigo", loading }: {
  label: string; value: string; small?: boolean;
  icon?: React.ElementType; color?: keyof typeof COLOR_MAP; loading?: boolean;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-900 dark:ring-gray-700/80">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
        {Icon && (
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.bg}`}>
            <Icon className={`h-3.5 w-3.5 ${c.text}`} />
          </div>
        )}
      </div>
      {loading ? (
        <Skeleton className={`mt-2 ${small ? "h-6 w-20" : "h-8 w-14"}`} />
      ) : (
        <p className={`mt-1.5 font-bold text-gray-900 dark:text-gray-100 ${small ? "text-base leading-tight" : "text-2xl"}`}>
          {value}
        </p>
      )}
    </div>
  );
}

function BarChart({ counts, maxCount, days, loading, color }: {
  counts: number[]; maxCount: number; days: Date[]; loading: boolean; color: "indigo"|"violet";
}) {
  const active = color === "indigo"
    ? "bg-gradient-to-t from-indigo-600 to-indigo-400 dark:from-indigo-500 dark:to-indigo-400"
    : "bg-gradient-to-t from-violet-600 to-violet-400 dark:from-violet-500 dark:to-violet-400";
  const dim = color === "indigo"
    ? "bg-indigo-200/60 dark:bg-indigo-800/40"
    : "bg-violet-200/60 dark:bg-violet-800/40";
  const empty = "bg-gray-100 dark:bg-gray-800/60";

  if (loading) {
    return (
      <div className="mt-5 flex h-28 items-end gap-2">
        {[40,70,30,90,55,75,50].map((h,i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <Skeleton className="w-full" style={{ height:`${h}%` }}/>
            <Skeleton className="h-3 w-5"/>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-5 flex h-28 items-end gap-2">
      {counts.map((count, i) => {
        const isToday = i === 6;
        const heightPct = count > 0 ? Math.max((count/maxCount)*100, 10) : 3;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            {count > 0 && <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{count}</span>}
            {count === 0 && <span className="text-[10px]"> </span>}
            <div
              className={`w-full rounded-t-lg transition-all duration-500 ${isToday ? active : count > 0 ? dim : empty}`}
              style={{ height:`${heightPct}%` }}
            />
            <span className={`text-[10px] font-medium ${isToday ? (color==="indigo"?"text-indigo-600 dark:text-indigo-400":"text-violet-600 dark:text-violet-400") : "text-gray-400 dark:text-gray-500"}`}>
              {DAY_LABELS[days[i].getDay()]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TokenRow({ label, value, total, color }: { label:string; value:number; total:number; color:string }) {
  const pct = total > 0 ? (value/total)*100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width:`${pct}%` }}/>
      </div>
    </div>
  );
}
