"use client";

import { Calendar, Check, ChevronDown, ChevronUp, Loader2, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { DEFAULT_MODEL, OpenRouterModel } from "@/lib/openrouter";
import {
  PRIORITY_COLORS,
  STATUS_COLORS,
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
} from "@/lib/planner";
import { PlannerTask, TaskPriority, TaskStatus } from "@/lib/types";
import { useEffect, useState } from "react";

import { Memory, fetchMemories, saveMemories } from "@/lib/memory";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const STATUSES: TaskStatus[] = ["todo", "in-progress", "done"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const STATUS_LABELS: Record<TaskStatus, string> = { todo: "To Do", "in-progress": "In Progress", done: "Done" };
const PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Low", medium: "Medium", high: "High" };

const inputCls = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

const SUGGESTED_QUESTIONS = [
  "What should I focus on today?",
  "Which tasks are overdue or at risk?",
  "How should I prioritize my in-progress tasks?",
  "What tasks can I batch together?",
];

function buildTasksContext(tasks: PlannerTask[]): string {
  if (tasks.length === 0) return "No tasks yet.";
  return tasks.map((t) => {
    let line = `[${t.status.toUpperCase()}] ${t.title} (priority: ${t.priority})`;
    if (t.dueDate) line += ` — due ${t.dueDate}`;
    if (t.notes) line += `\n  Notes: ${t.notes}`;
    if (t.tags?.length) line += `\n  Tags: ${t.tags.join(", ")}`;
    return line;
  }).join("\n\n");
}

export default function PlannerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "ai">("tasks");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // AI analysis
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiModel, setAiModel] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("planner_model") ?? DEFAULT_MODEL;
    return DEFAULT_MODEL;
  });
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchTasks(user.uid).then(setTasks).finally(() => setLoading(false));
    fetch("/api/models").then((r) => r.json()).then(setModels).catch(() => {});
    fetchMemories(user.uid).then(setMemories).catch(() => {});
  }, [user]);

  async function extractAndSaveMemory(uid: string, token: string, question: string, response: string) {
    try {
      const res = await fetch("/api/extract-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic: question, content: response }),
      });
      if (!res.ok) return;
      const { memories: extracted } = await res.json();
      if (extracted?.length) {
        await saveMemories(uid, extracted);
        fetchMemories(uid).then(setMemories).catch(() => {});
      }
    } catch { /* silent */ }
  }

  async function handleCreate() {
    if (!user || !title.trim()) return;
    setCreating(true);
    try {
      const task = await createTask(user.uid, {
        title: title.trim(), notes: notes.trim() || undefined,
        status: "todo", priority, dueDate: dueDate || undefined,
        tags: tags.length ? tags : undefined,
      });
      setTasks((prev) => [task, ...prev]);
      setTitle(""); setNotes(""); setPriority("medium"); setDueDate(""); setTags([]); setTagInput("");
      setShowForm(false);
    } catch {
      toast("Failed to create task", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(id: string, current: TaskStatus) {
    const next: TaskStatus = current === "todo" ? "in-progress" : current === "in-progress" ? "done" : "todo";
    await updateTask(id, { status: next });
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: next } : t));
  }

  async function handleDelete(id: string) {
    await deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast("Task deleted", "info");
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  }

  async function handleAnalyze(question?: string) {
    const q = question ?? aiQuestion.trim();
    if (!q || aiStreaming || !user) return;
    setAiResponse("");
    setAiStreaming(true);
    let result = "";
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/planner/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tasks: buildTasksContext(tasks), question: q, model: aiModel,
          memories: memories.map((m) => m.content),
        }),
      });
      if (!res.ok) { toast("Analysis failed", "error"); return; }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) { result += delta; setAiResponse(result); }
          } catch { /* skip */ }
        }
      }

      if (result) extractAndSaveMemory(user.uid, await user.getIdToken(), q, result);
    } catch {
      toast("Analysis error", "error");
    } finally {
      setAiStreaming(false);
    }
  }

  const filtered = tasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const counts = { todo: 0, "in-progress": 0, done: 0 };
  tasks.forEach((t) => counts[t.status]++);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Planner</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Plan tasks, add notes, track progress.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "tasks" && (
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New Task
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/60">
        {([["tasks", "Tasks"], ["ai", "AI Analysis"]] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}>
            {tab === "ai" && <Sparkles className="h-3.5 w-3.5" />}
            {label}
          </button>
        ))}
      </div>

      {activeTab === "tasks" ? (
        <>
          {/* Status summary pills */}
          <div className="grid grid-cols-3 gap-3">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
                className={`rounded-xl p-3 text-center transition-all ${filterStatus === s ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-100 dark:ring-gray-700/80 dark:hover:bg-gray-800"}`}>
                <p className="text-2xl font-bold">{counts[s]}</p>
                <p className="mt-0.5 text-xs">{STATUS_LABELS[s]}</p>
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs text-gray-400">Priority:</span>
            {(["all", ...PRIORITIES] as const).map((p) => (
              <button key={p} onClick={() => setFilterPriority(p as TaskPriority | "all")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterPriority === p ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"}`}>
                {p === "all" ? "All priorities" : PRIORITY_LABELS[p as TaskPriority]}
              </button>
            ))}
          </div>

          {/* Create form */}
          {showForm && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-2 ring-indigo-200 dark:bg-gray-900 dark:ring-indigo-900">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-semibold text-gray-900 dark:text-gray-100">New Task</p>
                <button onClick={() => setShowForm(false)} className="rounded p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title *" className={inputCls} />
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes (optional)…" className={`resize-none ${inputCls}`} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Priority</label>
                    <div className="flex gap-1">
                      {PRIORITIES.map((p) => (
                        <button key={p} onClick={() => setPriority(p)}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${priority === p ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}>
                          {PRIORITY_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Due Date</label>
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Tags</label>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                      placeholder="Add tag, press Enter…" className={`flex-1 ${inputCls}`} />
                    <button onClick={addTag} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400">Add</button>
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tags.map((t) => (
                        <span key={t} className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                          #{t}
                          <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))}><X className="h-2.5 w-2.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <button onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                  <button onClick={handleCreate} disabled={!title.trim() || creating}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40">
                    {creating ? "Creating…" : "Create Task"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Task list */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {tasks.length === 0 ? "No tasks yet. Create one above." : "No tasks match the current filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((task) => {
                const expanded = expandedId === task.id;
                const isOverdue = task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date();
                return (
                  <div key={task.id} className={`rounded-xl bg-white shadow-sm ring-1 transition-all dark:bg-gray-900 ${task.status === "done" ? "ring-green-200/80 dark:ring-green-900/60" : "ring-gray-200/80 dark:ring-gray-700/80"}`}>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => handleStatusChange(task.id, task.status)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${task.status === "done" ? "border-green-500 bg-green-500" : task.status === "in-progress" ? "border-blue-500 bg-blue-100 dark:bg-blue-950" : "border-gray-300 dark:border-gray-600"}`}>
                        {task.status === "done" && <Check className="h-3.5 w-3.5 text-white" />}
                        {task.status === "in-progress" && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${task.status === "done" ? "text-gray-400 line-through dark:text-gray-600" : "text-gray-900 dark:text-gray-100"}`}>
                          {task.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className={`rounded-full px-1.5 py-0.5 text-xs ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-xs ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                          {task.dueDate && (
                            <span className={`flex items-center gap-0.5 text-xs ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                              <Calendar className="h-3 w-3" />{task.dueDate}
                            </span>
                          )}
                          {task.tags?.map((t) => <span key={t} className="text-xs text-indigo-500">#{t}</span>)}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {task.notes && (
                          <button onClick={() => setExpandedId(expanded ? null : task.id)}
                            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                        <button onClick={() => handleDelete(task.id)}
                          className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    {expanded && task.notes && (
                      <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                        <p className="whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">{task.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ── AI Analysis tab ─────────────────────────────────────────── */
        <div className="space-y-5">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
              AI can see all {tasks.length} of your tasks. Ask anything about your workload, prioritization, or planning.
            </p>
          </div>

          {/* Suggested questions */}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-400">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button key={q} onClick={() => { setAiQuestion(q); handleAnalyze(q); }}
                  disabled={aiStreaming}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Model selector */}
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs text-gray-500">Model:</label>
            <select value={aiModel} onChange={(e) => { setAiModel(e.target.value); localStorage.setItem("planner_model", e.target.value); }}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {models.length === 0
                ? <option value={DEFAULT_MODEL}>{DEFAULT_MODEL}</option>
                : models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Question input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAnalyze(); }}
              placeholder="Ask about your tasks…"
              className={inputCls}
            />
            <button onClick={() => handleAnalyze()} disabled={!aiQuestion.trim() || aiStreaming}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40">
              {aiStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          {/* AI response */}
          {(aiResponse || aiStreaming) && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/80 dark:bg-gray-900 dark:ring-gray-700/80">
              {aiStreaming && !aiResponse && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your tasks…
                </div>
              )}
              {aiResponse && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                    {aiResponse}
                    {aiStreaming && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-500 align-text-bottom" />}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!aiResponse && !aiStreaming && tasks.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center dark:border-gray-700">
              <p className="text-sm text-gray-400">Add some tasks first, then come back for AI analysis.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
