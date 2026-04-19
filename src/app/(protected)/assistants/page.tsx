"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Plus, Pencil, Trash2, X, MessageSquarePlus, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Assistant } from "@/lib/types";
import { OpenRouterModel, supportsTools } from "@/lib/openrouter";
import {
  fetchAssistants, createAssistant, updateAssistant, deleteAssistant,
} from "@/lib/assistants";

const EMOJI_OPTIONS = ["🤖", "🧠", "⚡", "🦾", "🎯", "💡", "🧑‍💼", "🦊", "🐙", "🌟", "🔮", "🚀", "💰", "❤️", "⚖️", "🍳", "💪", "👔", "✍️", "📊", "🎓", "🔬"];

const inputCls = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

export default function AssistantsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form fields
  const [description, setDescription] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [personality, setPersonality] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("openai/gpt-4o");
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [generateModel, setGenerateModel] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("assistant_generate_model") ?? "google/gemini-2.0-flash-001") : "google/gemini-2.0-flash-001"
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchAssistants(user.uid).then(setAssistants).finally(() => setLoading(false));
    fetch("/api/models").then((r) => r.json()).then(setAllModels).catch(() => {});
  }, [user]);

  function resetForm() {
    setDescription(""); setName(""); setEmoji("🤖"); setPersonality("");
    setSystemPrompt(""); setModel("openai/gpt-4o"); setEditingId(null); setShowAdvanced(false);
  }

  // Models capable of text generation (all models qualify, but filter out embedding/image-only)
  const generationModels = allModels.filter((m) =>
    !m.id.includes("embed") && !m.id.includes("whisper") && !m.id.includes("dall-e") && !m.id.includes("tts")
  );

  function openEdit(a: Assistant) {
    setDescription(a.description ?? "");
    setName(a.name); setEmoji(a.emoji); setPersonality(a.personality);
    setSystemPrompt(a.systemPrompt ?? "");
    setModel(a.model ?? "openai/gpt-4o");
    setEditingId(a.id); setShowForm(true);
    if (a.systemPrompt) setShowAdvanced(true);
  }

  async function handleGenerate() {
    if (!description.trim() || !user) return;
    setGenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/assistant/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: description.trim(), model: generateModel }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        toast(`Generate failed: ${errText.slice(0, 100)}`, "error");
        return;
      }
      const data = await res.json();
      if (data.name) setName(data.name);
      if (data.emoji) setEmoji(data.emoji);
      if (data.personality) setPersonality(data.personality);
      if (data.systemPrompt) { setSystemPrompt(data.systemPrompt); setShowAdvanced(true); }
      toast("Fields auto-filled — review and adjust!", "success");
    } catch (e) {
      toast(`Generate failed: ${(e as Error).message}`, "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        emoji,
        personality: personality.trim(),
        description: description.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        model,
      };
      if (editingId) {
        await updateAssistant(editingId, data);
        setAssistants((prev) => prev.map((a) => a.id === editingId ? { ...a, ...data } : a));
        toast("Assistant updated", "success");
      } else {
        const a = await createAssistant(user.uid, data);
        setAssistants((prev) => [...prev, a]);
        toast(`${a.emoji} ${a.name} created`, "success");
      }
      resetForm(); setShowForm(false);
    } catch {
      toast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, aName: string) {
    await deleteAssistant(id);
    setAssistants((prev) => prev.filter((a) => a.id !== id));
    toast(`${aName} deleted`, "info");
  }

  const capableModels = allModels.filter(supportsTools);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Assistants</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create personal AI assistants that can act on your data across the entire dashboard.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Assistant
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-2 ring-indigo-200 dark:bg-gray-900 dark:ring-indigo-900">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? "Edit Assistant" : "New Assistant"}
            </p>
            <button onClick={() => { resetForm(); setShowForm(false); }} className="rounded p-1 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5">
            {/* Step 1: Describe */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Describe your assistant <span className="text-gray-400">(the AI will fill in the fields for you)</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='e.g. "A finance expert who helps me track spending, plan investments, and explains Indian tax laws in simple terms."'
                className={`resize-none ${inputCls}`}
              />
              {/* Generate row */}
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={generateModel}
                  onChange={(e) => { setGenerateModel(e.target.value); localStorage.setItem("assistant_generate_model", e.target.value); }}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-violet-400 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  {generationModels.length === 0 ? (
                    <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash (loading…)</option>
                  ) : (
                    generationModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  )}
                </select>
                <button
                  onClick={handleGenerate}
                  disabled={!description.trim() || generating}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Generating…" : "Generate"}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">Pick any model to generate the fields. Your choice is remembered.</p>
            </div>

            <div className="border-t border-gray-100 pt-4 dark:border-gray-800" />

            {/* Emoji picker */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-500">Icon</label>
              <div className="flex flex-wrap gap-2">
                {EMOJI_OPTIONS.map((e) => (
                  <button key={e} onClick={() => setEmoji(e)}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-all ${emoji === e ? "bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-950" : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Finance Buddy, Task Master, Alex…" className={inputCls} />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Personality <span className="text-gray-400">(tone & style)</span>
              </label>
              <textarea rows={2} value={personality} onChange={(e) => setPersonality(e.target.value)}
                placeholder="e.g. Direct and no-nonsense. Always uses bullet points. Occasionally funny."
                className={`resize-none ${inputCls}`} />
            </div>

            {/* AI Model */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                AI Model <span className="text-gray-400">(persists across devices)</span>
              </label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className={inputCls}>
                {capableModels.length === 0 ? (
                  <option value="openai/gpt-4o">GPT-4o (loading…)</option>
                ) : (
                  capableModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))
                )}
              </select>
              <p className="mt-1 text-xs text-gray-400">Only tool-capable models are shown.</p>
            </div>

            {/* Advanced: System Prompt */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "" : "-rotate-90"}`} />
                {showAdvanced ? "Hide" : "Show"} system prompt
                {systemPrompt && !showAdvanced && <span className="ml-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">set</span>}
              </button>
              {showAdvanced && (
                <div className="mt-2">
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    System Prompt <span className="text-gray-400">(expert instructions — auto-filled by Generate, or write your own)</span>
                  </label>
                  <textarea
                    rows={8}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Detailed instructions that define this assistant's expertise, knowledge areas, and behavior. The more specific, the better."
                    className={`resize-y ${inputCls} font-mono text-xs`}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button onClick={() => { resetForm(); setShowForm(false); }}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!name.trim() || saving}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40">
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assistant list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : assistants.length === 0 && !showForm ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <Bot className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No assistants yet</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Create one to start taking actions across your dashboard with natural language.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {assistants.map((a) => (
            <div key={a.id}
              className="group relative rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/80 transition-shadow hover:shadow-md dark:bg-gray-900 dark:ring-gray-700/80">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-2xl dark:from-indigo-950/50 dark:to-violet-950/50">
                  {a.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{a.name}</p>
                  {a.description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-indigo-500 dark:text-indigo-400">{a.description}</p>
                  ) : null}
                  {a.personality ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-400 dark:text-gray-500">{a.personality}</p>
                  ) : (
                    <p className="mt-0.5 text-xs italic text-gray-300 dark:text-gray-600">No personality set</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => router.push(`/assistants/${a.id}`)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  <MessageSquarePlus className="h-4 w-4" /> Chat
                </button>
                <button onClick={() => openEdit(a)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(a.id, a.name)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared memory note */}
      {assistants.length > 1 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
          <p className="text-xs text-indigo-700 dark:text-indigo-300">
            <span className="font-semibold">Shared memory:</span> All your assistants share the same memory pool — what one learns about you, the others know too.
          </p>
        </div>
      )}
    </div>
  );
}
