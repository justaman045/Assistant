"use client";

import { AlertTriangle, Brain, ChevronDown, ChevronUp, Loader2, MessageSquare, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  CATEGORY_LABELS,
  PARTNER_AVATARS,
  createPartner,
  deletePartner,
  fetchPartners,
} from "@/lib/roleplay";
import { DEFAULT_MODEL, OpenRouterModel } from "@/lib/openrouter";
import { RoleplayCategory, RoleplayPartner } from "@/lib/types";
import { useEffect, useState } from "react";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const CATEGORIES: RoleplayCategory[] = ["general", "marketing", "therapy", "nsfw", "custom"];

const inputCls = "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";
const textareaCls = `resize-none ${inputCls}`;

export default function RoleplayPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [partners, setPartners] = useState<RoleplayPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nsfwAcknowledged, setNsfwAcknowledged] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("");
  const [personality, setPersonality] = useState("");
  const [category, setCategory] = useState<RoleplayCategory>("general");
  const [customCategoryLabel, setCustomCategoryLabel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [avatar, setAvatar] = useState(PARTNER_AVATARS[0]);
  const [creating, setCreating] = useState(false);

  // AI generation state
  const [aiDescription, setAiDescription] = useState("");
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchPartners(user.uid).then(setPartners).finally(() => setLoading(false));
    fetch("/api/models").then((r) => r.json()).then(setModels).catch(() => {});
  }, [user]);

  function resetForm() {
    setName(""); setPersona(""); setPersonality(""); setCategory("general");
    setCustomCategoryLabel(""); setSystemPrompt(""); setShowSystemPrompt(false);
    setMemoryEnabled(true);
    setAvatar(PARTNER_AVATARS[0]); setAiDescription(""); setShowAiHelper(false);
    setNsfwAcknowledged(false);
  }

  async function handleGenerateWithAI() {
    if (!aiDescription.trim() || !user) return;
    setGenerating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/roleplay/generate-partner", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: aiDescription.trim(), model: aiModel }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as {
        name?: string; persona?: string; personality?: string;
        systemPrompt?: string; suggestedCategory?: RoleplayCategory;
        customCategoryLabel?: string;
      };
      if (data.name) setName(data.name);
      if (data.persona) setPersona(data.persona);
      if (data.personality) setPersonality(data.personality);
      if (data.systemPrompt) { setSystemPrompt(data.systemPrompt); setShowSystemPrompt(true); }
      if (data.suggestedCategory && CATEGORIES.includes(data.suggestedCategory)) {
        setCategory(data.suggestedCategory);
      }
      if (data.customCategoryLabel) setCustomCategoryLabel(data.customCategoryLabel);
      setShowAiHelper(false);
      toast("Fields filled by AI — review and adjust before creating", "info");
    } catch {
      toast("AI generation failed. Try again.", "error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate() {
    if (!user || !name.trim() || !persona.trim()) return;
    setCreating(true);
    try {
      const p = await createPartner(user.uid, {
        name: name.trim(), persona: persona.trim(), personality: personality.trim(),
        category, avatar, memoryEnabled,
        ...(customCategoryLabel.trim() ? { customCategoryLabel: customCategoryLabel.trim() } : {}),
        ...(systemPrompt.trim() ? { systemPrompt: systemPrompt.trim() } : {}),
      });
      setPartners((prev) => [p, ...prev]);
      resetForm();
      setShowForm(false);
      toast(`${p.name} created`, "success");
    } catch {
      toast("Failed to create partner", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, partnerName: string) {
    try {
      await deletePartner(id);
      setPartners((prev) => prev.filter((p) => p.id !== id));
      toast(`${partnerName} deleted`, "info");
    } catch {
      toast("Failed to delete", "error");
    }
  }

  const showNsfwWarning = category === "nsfw" && !nsfwAcknowledged;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Roleplay</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create AI partners for roleplay, marketing research, or creative sessions.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Partner
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Create Partner</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">

              {/* AI helper banner */}
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                <button
                  onClick={() => setShowAiHelper((v) => !v)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
                  <span className="flex-1 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    Generate details with AI
                  </span>
                  {showAiHelper ? <ChevronUp className="h-4 w-4 text-indigo-400" /> : <ChevronDown className="h-4 w-4 text-indigo-400" />}
                </button>
                {showAiHelper && (
                  <div className="space-y-3 border-t border-indigo-100 px-4 pb-4 pt-3 dark:border-indigo-900/60">
                    <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80">
                      Describe who you want in plain language — the AI will fill in the name, persona, personality, and system prompt for you.
                    </p>
                    <textarea
                      rows={3}
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="e.g. A sarcastic Silicon Valley VC who only talks in startup jargon and dismisses every idea…"
                      className={`resize-none rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-indigo-800 dark:bg-gray-800 dark:text-gray-100 w-full`}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="w-full rounded-lg border border-indigo-200 bg-white px-2 py-1.5 text-xs text-gray-700 focus:outline-none dark:border-indigo-800 dark:bg-gray-800 dark:text-gray-300 sm:flex-1"
                      >
                        {models.length === 0
                          ? <option value={DEFAULT_MODEL}>{DEFAULT_MODEL}</option>
                          : models.map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                      </select>
                      <button
                        onClick={handleGenerateWithAI}
                        disabled={!aiDescription.trim() || generating}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 sm:w-auto sm:shrink-0"
                      >
                        {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {generating ? "Generating…" : "Generate"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {PARTNER_AVATARS.map((a) => (
                    <button key={a} onClick={() => setAvatar(a)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-all ${avatar === a ? "bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-950" : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800"}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex, Dr. Chen, Maya…" className={inputCls} />
              </div>

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button key={c} onClick={() => { setCategory(c); if (c !== "nsfw") setNsfwAcknowledged(false); }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === c ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>

                {/* Custom category label */}
                {category === "custom" && (
                  <input
                    type="text"
                    value={customCategoryLabel}
                    onChange={(e) => setCustomCategoryLabel(e.target.value)}
                    placeholder="Describe the use case, e.g. 'Sales call practice', 'Interview coach'…"
                    className={`mt-2 ${inputCls}`}
                  />
                )}

                {/* NSFW gate */}
                {showNsfwWarning && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                      <div>
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Adult Content (18+)</p>
                        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">This mode enables explicit content. Only use if you are 18+.</p>
                        <button onClick={() => setNsfwAcknowledged(true)} className="mt-2 rounded-lg bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700">
                          I am 18+ and consent
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Persona */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Persona / Background *</label>
                <textarea rows={3} value={persona} onChange={(e) => setPersona(e.target.value)}
                  placeholder="Who is this person? Their background, role, expertise, history…"
                  className={textareaCls} />
              </div>

              {/* Personality */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Personality Traits</label>
                <input type="text" value={personality} onChange={(e) => setPersonality(e.target.value)}
                  placeholder="e.g. witty, empathetic, blunt, curious, warm…" className={inputCls} />
              </div>

              {/* System Prompt (advanced) */}
              <div>
                <button
                  onClick={() => setShowSystemPrompt((v) => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showSystemPrompt ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  System Prompt (Advanced)
                </button>
                {showSystemPrompt && (
                  <div className="mt-2">
                    <textarea rows={4} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder="Additional behavioral instructions — speech patterns, what to avoid, how to handle specific situations…"
                      className={textareaCls} />
                    <p className="mt-1 text-[11px] text-gray-400">
                      This is appended to the system prompt after the persona and category instructions.
                    </p>
                  </div>
                )}
              </div>

              {/* Memory learning toggle */}
              <div className="flex items-start justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <div className="flex items-start gap-2.5">
                  <Brain className={`mt-0.5 h-4 w-4 shrink-0 ${memoryEnabled ? "text-indigo-500" : "text-gray-400"}`} />
                  <div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">Memory Learning</p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      Learn from this chat to personalise AI across the platform. Disable for private sessions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMemoryEnabled((v) => !v)}
                  className={`relative ml-3 shrink-0 h-5 w-9 rounded-full transition-colors ${memoryEnabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${memoryEnabled ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || !persona.trim() || creating || (category === "nsfw" && !nsfwAcknowledged)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {creating ? "Creating…" : "Create Partner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partners grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : partners.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <p className="text-3xl">🎭</p>
          <p className="mt-3 font-medium text-gray-900 dark:text-gray-100">No partners yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a partner to start roleplaying.</p>
          <button onClick={() => setShowForm(true)} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> New Partner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => {
            const categoryLabel = p.category === "custom" && p.customCategoryLabel
              ? p.customCategoryLabel
              : CATEGORY_LABELS[p.category];
            return (
              <div key={p.id} className="group relative flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-200/80 transition-all hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 dark:ring-gray-700/80">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{p.avatar}</span>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.category === "nsfw" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                        : p.category === "marketing" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                        : p.category === "therapy" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : p.category === "custom" ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {categoryLabel}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(p.id, p.name)}
                    className="rounded-lg p-1.5 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-950">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-3 line-clamp-2 flex-1 text-xs text-gray-500 dark:text-gray-400">{p.persona}</p>
                {p.personality && (
                  <p className="mt-1 truncate text-xs italic text-gray-400 dark:text-gray-500">{p.personality}</p>
                )}
                <div className="mt-3 flex items-center gap-1.5">
                  <Brain className={`h-3 w-3 ${p.memoryEnabled ? "text-indigo-400" : "text-gray-300 dark:text-gray-600"}`} />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                    {p.memoryEnabled ? "Memory on" : "Memory off"}
                  </span>
                </div>
                <Link href={`/roleplay/${p.id}`}
                  className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
                  <MessageSquare className="h-4 w-4" /> Chat
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
