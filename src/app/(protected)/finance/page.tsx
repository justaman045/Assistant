"use client";

import { useState, useEffect, useRef } from "react";
import { Memory, fetchMemories, saveMemories } from "@/lib/memory";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  fetchTransactions, addTransaction, deleteTransaction,
  summarize, buildAnalysisContext, EXPENSE_CATEGORIES, INCOME_CATEGORIES,
} from "@/lib/finance";
import { FinanceTransaction, TransactionType } from "@/lib/types";
import { DEFAULT_MODEL } from "@/lib/openrouter";
import { Plus, Trash2, Sparkles, TrendingUp, TrendingDown, X, Loader2, Check } from "lucide-react";

type Tab = "transactions" | "analysis";

const inputCls = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

export default function FinancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("transactions");
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [adding, setAdding] = useState(false);

  // Filter
  const [filterType, setFilterType] = useState<TransactionType | "all">("all");

  // AI Analysis
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchTransactions(user.uid).then(setTransactions).finally(() => setLoading(false));
    fetchMemories(user.uid).then(setMemories).catch(() => {});
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

  async function handleAdd() {
    if (!user || !amount || !category || !description) return;
    setAdding(true);
    try {
      const txn = await addTransaction(user.uid, {
        amount: parseFloat(amount), type, category, description: description.trim(), date,
      });
      setTransactions((prev) => [txn, ...prev]);
      setAmount(""); setCategory(""); setDescription("");
      setShowForm(false);
    } catch {
      toast("Failed to add transaction", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function selectAll() {
    const visible = filtered.map((t) => t.id);
    setSelectedIds((prev) => prev.size === visible.length ? new Set() : new Set(visible));
  }

  async function handleAnalyze() {
    if (!user || !question.trim() || selectedIds.size === 0) return;
    const selected = transactions.filter((t) => selectedIds.has(t.id));
    const context = buildAnalysisContext(selected);

    setAiResponse(""); setAnalyzing(true);
    abortRef.current = new AbortController();
    let full = "";
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/finance/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          transactions: context, question: question.trim(), model: DEFAULT_MODEL,
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

  const filtered = transactions.filter((t) => filterType === "all" || t.type === filterType);
  const summary = summarize(transactions);
  const categories = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Finance Tracker</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Log transactions and use AI to analyze your spending.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <p className="text-xs text-gray-500">Income</p>
          </div>
          <p className="mt-1 text-xl font-bold text-green-600 dark:text-green-400">₹{summary.income.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <p className="text-xs text-gray-500">Expenses</p>
          </div>
          <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">₹{summary.expense.toLocaleString()}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <p className="text-xs text-gray-500">Net</p>
          <p className={`mt-1 text-xl font-bold ${summary.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {summary.net >= 0 ? "+" : ""}₹{summary.net.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        {(["transactions", "analysis"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${tab === t ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100" : "text-gray-500 hover:text-gray-700 dark:text-gray-400"}`}>
            {t === "analysis" ? "AI Analysis" : "Transactions"}
          </button>
        ))}
      </div>

      {tab === "transactions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(["all", "income", "expense"] as const).map((f) => (
                <button key={f} onClick={() => setFilterType(f as TransactionType | "all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${filterType === f ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>

          {/* Add form */}
          {showForm && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-2 ring-indigo-200 dark:bg-gray-900 dark:ring-indigo-900">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold text-gray-900 dark:text-gray-100">New Transaction</p>
                <button onClick={() => setShowForm(false)} className="rounded p-1 text-gray-400"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(["expense", "income"] as const).map((t) => (
                    <button key={t} onClick={() => { setType(t); setCategory(""); }}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors ${type === t ? t === "expense" ? "bg-red-500 text-white" : "bg-green-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (₹)" className={inputCls} />
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
                </div>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className={inputCls} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                  <button onClick={handleAdd} disabled={!amount || !category || !description || adding}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40">
                    {adding ? "Adding…" : "Add"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transaction list */}
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
              <p className="text-sm text-gray-400">No transactions yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
              {filtered.map((txn, i) => (
                <div key={txn.id} className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? "border-t border-gray-100 dark:border-gray-800" : ""}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${txn.type === "income" ? "bg-green-100 dark:bg-green-950" : "bg-red-100 dark:bg-red-950"}`}>
                    {txn.type === "income" ? <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" /> : <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{txn.description}</p>
                    <p className="text-xs text-gray-400">{txn.category} · {txn.date}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-bold ${txn.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {txn.type === "income" ? "+" : "-"}₹{txn.amount.toLocaleString()}
                  </p>
                  <button onClick={() => handleDelete(txn.id)} className="shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "analysis" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
            Select transactions below, write your question, then hit Analyze.
          </div>

          {/* Select */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{selectedIds.size} selected</p>
            <button onClick={selectAll} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
              {selectedIds.size === filtered.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
            {transactions.map((txn) => (
              <label key={txn.id} className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedIds.has(txn.id) ? "bg-indigo-50 dark:bg-indigo-950/30" : ""}`}>
                <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${selectedIds.has(txn.id) ? "border-indigo-600 bg-indigo-600" : "border-gray-300 dark:border-gray-600"}`}>
                  {selectedIds.has(txn.id) && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <input type="checkbox" checked={selectedIds.has(txn.id)} onChange={() => toggleSelect(txn.id)} className="sr-only" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900 dark:text-gray-100">{txn.description}</p>
                  <p className="text-xs text-gray-400">{txn.category} · {txn.date}</p>
                </div>
                <p className={`text-sm font-medium ${txn.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {txn.type === "income" ? "+" : "-"}₹{txn.amount}
                </p>
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Where am I overspending? How can I save more?"
              className={`flex-1 ${inputCls}`}
              onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }} />
            <button onClick={analyzing ? () => abortRef.current?.abort() : handleAnalyze}
              disabled={!question.trim() || selectedIds.size === 0}
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
        </div>
      )}
    </div>
  );
}
