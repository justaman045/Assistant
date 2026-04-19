"use client";

import { useState, useEffect, useRef } from "react";
import { Memory, fetchMemories, saveMemories } from "@/lib/memory";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  fetchSubscriptions, addSubscription, updateSubscription, deleteSubscription,
  buildSubscriptionContext, monthlyEquivalent, SUB_CATEGORIES,
} from "@/lib/subscriptions-manager";
import { ManagedSubscription, BillingCycle, SubscriptionStatus } from "@/lib/types";
import { DEFAULT_MODEL, OpenRouterModel } from "@/lib/openrouter";
import { Plus, Trash2, Sparkles, X, Loader2, Pencil, Check, AlertTriangle } from "lucide-react";

const BILLING_CYCLES: BillingCycle[] = ["weekly", "monthly", "annual", "one-time"];
const CYCLE_LABELS: Record<BillingCycle, string> = { weekly: "Weekly", monthly: "Monthly", annual: "Annual", "one-time": "One-time" };
const STATUS_OPTIONS: SubscriptionStatus[] = ["active", "paused", "cancelled"];
const COMMON_EMOJIS = ["📺", "🎵", "☁️", "📰", "🎮", "💪", "📚", "💰", "🛒", "🔧", "📧", "🤖"];

const inputCls = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

type Tab = "subscriptions" | "analysis";

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [subs, setSubs] = useState<ManagedSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [category, setCategory] = useState("");
  const [nextRenewal, setNextRenewal] = useState("");
  const [notes, setNotes] = useState("");
  const [emoji, setEmoji] = useState("📺");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [saving, setSaving] = useState(false);

  // AI Analysis
  const [question, setQuestion] = useState("Which subscriptions should I drop? Consider my notes.");
  const [aiResponse, setAiResponse] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiModel, setAiModel] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("subscriptions_model") ?? DEFAULT_MODEL;
    return DEFAULT_MODEL;
  });
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchSubscriptions(user.uid).then(setSubs).finally(() => setLoading(false));
    fetchMemories(user.uid).then(setMemories).catch(() => {});
    fetch("/api/models").then((r) => r.json()).then(setModels).catch(() => {});
  }, [user]);

  async function extractAndSaveMemory(uid: string, token: string, q: string, response: string) {
    try {
      const res = await fetch("/api/extract-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic: q, content: response }),
      });
      if (!res.ok) return;
      const { memories: extracted } = await res.json();
      if (extracted?.length) {
        await saveMemories(uid, extracted);
        fetchMemories(uid).then(setMemories).catch(() => {});
      }
    } catch { /* silent */ }
  }

  function resetForm() {
    setName(""); setAmount(""); setBillingCycle("monthly"); setCategory("");
    setNextRenewal(""); setNotes(""); setEmoji("📺"); setStatus("active");
    setEditingId(null);
  }

  function openEdit(sub: ManagedSubscription) {
    setName(sub.name); setAmount(String(sub.amount)); setBillingCycle(sub.billingCycle);
    setCategory(sub.category); setNextRenewal(sub.nextRenewal ?? ""); setNotes(sub.notes ?? "");
    setEmoji(sub.emoji ?? "📺"); setStatus(sub.status);
    setEditingId(sub.id); setShowForm(true);
  }

  async function handleSave() {
    if (!user || !name.trim() || !amount || !category) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(), amount: parseFloat(amount), billingCycle, category,
        currency: "INR", nextRenewal: nextRenewal || undefined,
        notes: notes.trim() || undefined, emoji, status,
      };
      if (editingId) {
        await updateSubscription(editingId, data);
        setSubs((prev) => prev.map((s) => s.id === editingId ? { ...s, ...data } : s));
        toast("Updated", "success");
      } else {
        const sub = await addSubscription(user.uid, data);
        setSubs((prev) => [sub, ...prev]);
        toast(`${sub.name} added`, "success");
      }
      resetForm(); setShowForm(false);
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteSubscription(id);
    setSubs((prev) => prev.filter((s) => s.id !== id));
    toast("Removed", "info");
  }

  async function handleAnalyze() {
    if (!user || !question.trim() || subs.length === 0) return;
    const context = buildSubscriptionContext(subs);
    setAiResponse(""); setAnalyzing(true);
    abortRef.current = new AbortController();
    let full = "";
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/subscriptions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          subscriptions: context, question: question.trim(), model: aiModel,
          memories: memories.map((m) => m.content),
        }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) { toast("Analysis failed", "error"); return; }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6).trim();
          if (d === "[DONE]") break;
          try { const delta = JSON.parse(d).choices?.[0]?.delta?.content; if (delta) { full += delta; setAiResponse(full); } } catch { /* skip */ }
        }
      }

      if (full) extractAndSaveMemory(user.uid, await user.getIdToken(), question.trim(), full);
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast("Error: " + (e as Error).message, "error");
    } finally {
      setAnalyzing(false);
    }
  }

  const activeSubs = subs.filter((s) => s.status === "active");
  const totalMonthly = activeSubs.reduce((sum, s) => sum + monthlyEquivalent(s), 0);
  const totalAnnual = totalMonthly * 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Subscription Manager</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track your subscriptions and let AI help you decide what to keep.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <p className="text-xs text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{activeSubs.length}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <p className="text-xs text-gray-500">Monthly cost</p>
          <p className="mt-1 text-2xl font-bold text-indigo-600 dark:text-indigo-400">₹{totalMonthly.toFixed(0)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <p className="text-xs text-gray-500">Annual cost</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">₹{totalAnnual.toFixed(0)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {(["subscriptions", "analysis"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
            {t === "analysis" ? "AI Analysis" : "My Subscriptions"}
          </button>
        ))}
      </div>

      {tab === "subscriptions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> Add Subscription
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-2 ring-indigo-200 dark:bg-gray-900 dark:ring-indigo-900">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{editingId ? "Edit Subscription" : "Add Subscription"}</p>
                <button onClick={() => { resetForm(); setShowForm(false); }} className="rounded p-1 text-gray-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3">
                {/* Emoji */}
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500">Icon</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_EMOJIS.map((e) => (
                      <button key={e} onClick={() => setEmoji(e)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-all ${emoji === e ? "bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-950" : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (e.g. Netflix) *" className={inputCls} />
                  <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₹) *" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Billing Cycle</label>
                    <div className="flex flex-wrap gap-1">
                      {BILLING_CYCLES.map((c) => (
                        <button key={c} onClick={() => setBillingCycle(c)}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${billingCycle === c ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {CYCLE_LABELS[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Status</label>
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map((s) => (
                        <button key={s} onClick={() => setStatus(s)}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-medium capitalize transition-colors ${status === s ? s === "active" ? "bg-green-500 text-white" : s === "paused" ? "bg-amber-500 text-white" : "bg-gray-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                    <option value="">Category *</option>
                    {SUB_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="date" value={nextRenewal} onChange={(e) => setNextRenewal(e.target.value)} className={inputCls} title="Next renewal date" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Notes <span className="text-gray-400">(AI will consider these)</span></label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Family plan, used daily, shared with wife…" className={inputCls} />
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <button onClick={() => { resetForm(); setShowForm(false); }} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                  <button onClick={handleSave} disabled={!name.trim() || !amount || !category || saving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40">
                    {saving ? "Saving…" : editingId ? "Update" : "Add"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subscription list */}
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
          ) : subs.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
              <p className="text-2xl">📦</p>
              <p className="mt-2 text-sm text-gray-400">No subscriptions logged yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subs.map((sub) => {
                const monthly = monthlyEquivalent(sub);
                const isExpiringSoon = sub.nextRenewal && new Date(sub.nextRenewal) <= new Date(Date.now() + 7 * 86400000);
                return (
                  <div key={sub.id} className="group rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 text-2xl">{sub.emoji ?? "📦"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{sub.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sub.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : sub.status === "paused" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" : "bg-gray-100 text-gray-500"}`}>
                            {sub.status}
                          </span>
                          {isExpiringSoon && <span className="flex items-center gap-0.5 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" /> Renewing soon</span>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-gray-400">
                          <span>₹{sub.amount}/{CYCLE_LABELS[sub.billingCycle].toLowerCase()}</span>
                          {sub.billingCycle !== "monthly" && sub.billingCycle !== "one-time" && (
                            <span className="text-gray-300">·</span>
                          )}
                          {sub.billingCycle !== "monthly" && sub.billingCycle !== "one-time" && (
                            <span>~₹{monthly.toFixed(0)}/mo</span>
                          )}
                          <span className="text-gray-300">·</span>
                          <span>{sub.category}</span>
                          {sub.nextRenewal && <><span className="text-gray-300">·</span><span>Renews {sub.nextRenewal}</span></>}
                        </div>
                        {sub.notes && (
                          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">📝 {sub.notes}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => openEdit(sub)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(sub.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "analysis" && (
        <div className="space-y-4">
          {subs.length === 0 ? (
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Add some subscriptions first, then come back to analyze them.
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                <p className="font-medium">All {subs.length} subscriptions will be analyzed.</p>
                <p className="mt-0.5 text-xs opacity-80">The AI will respect your notes — e.g. "family plan" or "can&apos;t drop".</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="shrink-0 text-xs text-gray-500">Model:</label>
                <select value={aiModel} onChange={(e) => { setAiModel(e.target.value); localStorage.setItem("subscriptions_model", e.target.value); }}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {models.length === 0
                    ? <option value={DEFAULT_MODEL}>{DEFAULT_MODEL}</option>
                    : models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask the AI anything about your subscriptions…"
                  className={`flex-1 ${inputCls}`}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }} />
                <button onClick={analyzing ? () => abortRef.current?.abort() : handleAnalyze}
                  disabled={!question.trim()}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${analyzing ? "bg-red-500 text-white hover:bg-red-600" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"}`}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? "Stop" : "Analyze"}
                </button>
              </div>
              {aiResponse && (
                <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300">{aiResponse}</pre>
                  {analyzing && <span className="inline-block h-4 w-0.5 animate-pulse bg-indigo-500 align-text-bottom" />}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
