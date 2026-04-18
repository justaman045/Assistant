"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { OpenRouterModel, DEFAULT_MODEL } from "@/lib/openrouter";
import { LengthTarget, Item } from "@/lib/types";
import { logContentGenerated, logContentSaved } from "@/lib/analytics";
import { Memory, fetchMemories, saveMemories, incrementUsage } from "@/lib/memory";
import { saveUsageRecord, estimateTokens } from "@/lib/usage";
import { createItem, addVersionToItem, fetchUserItems } from "@/lib/items";
import ModelPicker from "@/components/ModelPicker";
import { useToast } from "@/context/ToastContext";
import { Clipboard, ClipboardCheck, Loader2, Sparkles, Brain, FileText, ChevronDown, Mic2 } from "lucide-react";
import { buildBrandVoiceBlock } from "@/lib/brand-voice";
import Link from "next/link";

const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

const TONE_OPTIONS = [
  "Professional", "Casual", "Formal", "Friendly",
  "Persuasive", "Educational", "Humorous",
] as const;

const CONTENT_TYPE_SUGGESTIONS = [
  "LinkedIn post", "Twitter / X thread", "Blog post", "Email newsletter",
  "YouTube script", "Reddit post", "Instagram caption", "Product announcement",
  "Case study", "Press release", "Cold outreach email", "Substack article",
];

const LENGTH_PRESETS: { label: string; value: LengthTarget }[] = [
  { label: "Short",  value: { count: 300,  unit: "words" } },
  { label: "Medium", value: { count: 700,  unit: "words" } },
  { label: "Long",   value: { count: 1500, unit: "words" } },
];

const INJECT_COUNT = 20;

export default function CreatePage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState("");

  const [memories, setMemories] = useState<Memory[]>([]);
  const memoriesRef = useRef<Memory[]>([]);

  const [contentType, setContentType] = useState("");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("");
  const [model, setModel] = useState(() => userProfile?.defaultModel ?? DEFAULT_MODEL);

  // Pre-fill from Prompt Workshop "Use in Create" links
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("prompt");
    const ct = params.get("contentType");
    if (p) setTopic(decodeURIComponent(p));
    if (ct) setContentType(decodeURIComponent(ct));
  }, []);
  const [length, setLength] = useState<LengthTarget>({ count: 700, unit: "words" });

  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const lastTopicRef = useRef("");

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Save mode: new item vs. new version of existing
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<"new" | "version">("new");
  const [versionTargetId, setVersionTargetId] = useState("");
  const [versionItems, setVersionItems] = useState<Item[]>([]);
  const [loadingVersionItems, setLoadingVersionItems] = useState(false);
  const saveMenuRef = useRef<HTMLDivElement>(null);

  // Close save menu on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target as Node)) {
        setSaveMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Lazy-load existing items when version mode is activated
  useEffect(() => {
    if (saveMode !== "version" || !user || versionItems.length > 0) return;
    setLoadingVersionItems(true);
    fetchUserItems(user.uid, 30)
      .then(setVersionItems)
      .finally(() => setLoadingVersionItems(false));
  }, [saveMode, user, versionItems.length]);

  useEffect(() => {
    fetch("/api/models")
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<OpenRouterModel[]>;
      })
      .then((data) => {
        setModels(data);
        if (!data.find((m) => m.id === DEFAULT_MODEL) && data.length > 0) {
          setModel(data[0].id);
        }
      })
      .catch((e) => setModelsError(e.message || "Failed to load models"))
      .finally(() => setModelsLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMemories(user.uid).then((m) => {
      setMemories(m);
      memoriesRef.current = m;
    });
  }, [user]);

  async function handleGenerate() {
    if (!topic.trim() || !contentType.trim() || streaming || !user) return;
    setError("");
    setOutput("");
    setStreaming(true);
    setSaved(false);
    lastTopicRef.current = topic;

    const toInject = memoriesRef.current.slice(0, INJECT_COUNT);
    const memoryStrings = toInject.map((m) => m.content);
    const memoryIds = toInject.map((m) => m.id);

    abortRef.current = new AbortController();
    let finalOutput = "";
    let apiPromptTokens = 0;
    let apiCompletionTokens = 0;
    let tokensExact = false;

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          topic,
          model,
          contentType,
          memories: memoryStrings,
          length,
          tone: tone || undefined,
          brandVoice: buildBrandVoiceBlock(userProfile?.brandVoice) || undefined,
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          `Not enough credits. This model costs ${data.cost ?? 10} credits per generation. ` +
          `Top up in Billing.`
        );
      }
      if (res.status === 429) {
        throw new Error("Too many requests. Please wait a moment before generating again.");
      }
      if (!res.ok) throw new Error((await res.text()) || `Request failed: ${res.status}`);

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
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              finalOutput += delta;
              setOutput((prev) => prev + delta);
            }
            // Capture token usage reported by the API (usually in the final chunk)
            if (parsed.usage?.prompt_tokens) {
              apiPromptTokens = parsed.usage.prompt_tokens;
              apiCompletionTokens = parsed.usage.completion_tokens ?? 0;
              tokensExact = true;
            }
          } catch { /* incomplete chunk */ }
        }
      }

      await logContentGenerated(contentType, model);

      // Track usage — always, even if the user never saves
      if (user && finalOutput.trim()) {
        const promptTokens = tokensExact
          ? apiPromptTokens
          : estimateTokens(topic + contentType + memoryStrings.join(" "));
        const completionTokens = tokensExact
          ? apiCompletionTokens
          : estimateTokens(finalOutput);
        saveUsageRecord(user.uid, {
          model,
          contentType,
          topic: topic.trim().slice(0, 120),
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          tokensExact,
        }).catch(() => {});
      }

      if (user && memoryIds.length > 0) {
        incrementUsage(user.uid, memoryIds).catch(() => {});
      }
      if (user && finalOutput.trim()) {
        extractAndSaveMemories(user.uid, lastTopicRef.current, finalOutput);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        const msg = (e as Error).message || "Generation failed. Please try again.";
        setError(msg);
        toast(msg, "error");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function extractAndSaveMemories(uid: string, topic: string, content: string) {
    try {
      const existingContent = memoriesRef.current.map((m) => m.content);
      const res = await fetch("/api/extract-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, content, existingMemories: existingContent }),
      });
      if (!res.ok) return;
      const extracted: { content: string; category: string }[] = await res.json();
      if (!extracted.length) return;
      await saveMemories(
        uid,
        extracted.map((e) => ({ content: e.content, category: e.category as Memory["category"], source: topic }))
      );
      fetchMemories(uid).then((m) => { setMemories(m); memoriesRef.current = m; });
    } catch { /* silent */ }
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast("Copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!user || !output.trim()) return;
    if (saveMode === "version" && !versionTargetId) return;
    setSaving(true);
    try {
      if (saveMode === "version" && versionTargetId) {
        await addVersionToItem(versionTargetId, user.uid, output.trim(), "regenerated");
      } else {
        await createItem(user.uid, {
          title: topic.trim().slice(0, 80) || "Untitled",
          content: output.trim(),
          contentType: contentType.trim(),
          model,
        });
      }
      await logContentSaved(contentType);
      setSaved(true);
      setSaveMenuOpen(false);
      toast(saveMode === "version" ? "Version saved to History" : "Saved to History", "success");
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const selectedModelName =
    models.find((m) => m.id === model)?.name ?? model.split("/")[1] ?? model;
  const canGenerate = topic.trim() && contentType.trim() && !streaming;

  return (
    <div className="flex h-full flex-col gap-6 pt-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Content</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Generate any type of content with AI, tailored to your style.
          </p>
        </div>
        {memories.length > 0 && (
          <Link
            href="/memory"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900"
          >
            <Brain className="h-3.5 w-3.5" />
            {memories.length} memories active
          </Link>
        )}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Left: controls ── */}
        <div className="flex flex-col gap-5">

          {/* Content type — freeform */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="content-type">
              Content type
            </label>
            <input
              id="content-type"
              type="text"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              placeholder="e.g. LinkedIn post, Twitter thread, email newsletter…"
              className={inputCls}
            />
            {/* Suggestion chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CONTENT_TYPE_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setContentType(s)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                    contentType === s
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tone <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t === tone ? "" : t)}
                  className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                    tone === t
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {userProfile?.brandVoice?.tone && !tone && (
              <p className="mt-1 flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400">
                <Mic2 className="h-3 w-3" />
                Brand voice tone will be used: {userProfile.brandVoice.tone}
              </p>
            )}
          </div>

          {/* Topic */}
          <div className="flex flex-1 flex-col">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="topic">
              Topic / prompt
            </label>
            <textarea
              id="topic"
              rows={5}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Describe what you want to write about…"
              className={`flex-1 resize-none ${inputCls}`}
            />
          </div>

          {/* Length control */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Target length
            </label>
            {/* Presets */}
            <div className="mb-2 flex gap-2">
              {LENGTH_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setLength(p.value)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                    length.count === p.value.count && length.unit === p.value.unit
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  {p.label}
                  <span className="ml-1 opacity-60">~{p.value.count}</span>
                </button>
              ))}
            </div>
            {/* Custom input + unit toggle */}
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={100000}
                value={length.count}
                onChange={(e) => setLength((l) => ({ ...l, count: Math.max(1, parseInt(e.target.value) || 1) }))}
                className={`w-28 ${inputCls}`}
              />
              <div className="flex flex-1 overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                {(["words", "characters"] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    onClick={() => setLength((l) => ({ ...l, unit }))}
                    className={`flex-1 px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      length.unit === unit
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Model */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Model
              {!modelsLoading && !modelsError && (
                <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
                  ({models.length} available)
                </span>
              )}
            </label>
            <ModelPicker
              models={models}
              value={model}
              onChange={setModel}
              loading={modelsLoading}
              error={modelsError}
            />
          </div>

          {/* Generate / Stop */}
          <button
            onClick={streaming ? () => abortRef.current?.abort() : handleGenerate}
            disabled={!canGenerate && !streaming}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
              streaming
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {streaming ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Stop generating</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate with {selectedModelName}</>
            )}
          </button>

          {!contentType.trim() && topic.trim() && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Please specify a content type above.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* ── Right: output ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Output</label>
            <div className="flex items-center gap-2">
              {output && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {output.split(/\s+/).filter(Boolean).length.toLocaleString()} words ·{" "}
                  {output.length.toLocaleString()} chars
                </span>
              )}
              <button
                onClick={handleCopy}
                disabled={!output}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-30 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-gray-800"
              >
                {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-green-600" /> : <Clipboard className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              {/* Split save button */}
              <div ref={saveMenuRef} className="relative">
                <div className="flex overflow-hidden rounded-md">
                  <button
                    onClick={handleSave}
                    disabled={!output || saving || streaming || (saveMode === "version" && !versionTargetId)}
                    className="flex items-center gap-1.5 bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-30"
                  >
                    {saving
                      ? "Saving…"
                      : saved
                      ? "Saved!"
                      : saveMode === "version"
                      ? "Save version"
                      : "Save"}
                  </button>
                  <button
                    onClick={() => setSaveMenuOpen((o) => !o)}
                    disabled={!output || streaming}
                    className="border-l border-indigo-500 bg-indigo-600 px-1.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-30"
                    title="Save options"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${saveMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {saveMenuOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                    {/* Save as new */}
                    <button
                      onClick={() => { setSaveMode("new"); setVersionTargetId(""); setSaveMenuOpen(false); }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${saveMode === "new" ? "bg-indigo-50 dark:bg-indigo-950" : ""}`}
                    >
                      <div className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                        {saveMode === "new" && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Save as new item</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Creates a fresh entry in History</p>
                      </div>
                    </button>

                    {/* Save as version */}
                    <div className={`border-t border-gray-100 dark:border-gray-800 ${saveMode === "version" ? "bg-indigo-50 dark:bg-indigo-950" : ""}`}>
                      <button
                        onClick={() => setSaveMode("version")}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-indigo-500 flex items-center justify-center">
                          {saveMode === "version" && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Add version to existing</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Append to an item already in History</p>
                        </div>
                      </button>
                      {saveMode === "version" && (
                        <div className="px-4 pb-3">
                          {loadingVersionItems ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">Loading items…</p>
                          ) : versionItems.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">No saved items yet.</p>
                          ) : (
                            <select
                              value={versionTargetId}
                              onChange={(e) => { setVersionTargetId(e.target.value); setSaveMenuOpen(false); }}
                              className="block w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            >
                              <option value="">Select an item…</option>
                              {versionItems.map((i) => (
                                <option key={i.id} value={i.id}>
                                  {i.title.slice(0, 50)}{i.contentType ? ` (${i.contentType})` : ""}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`relative flex-1 overflow-y-auto rounded-lg border bg-white p-4 text-sm leading-relaxed text-gray-800 shadow-sm dark:bg-gray-900 dark:text-gray-200 ${
              streaming ? "border-indigo-300 dark:border-indigo-700" : "border-gray-200 dark:border-gray-700"
            }`}
            style={{ minHeight: "420px" }}
          >
            {output ? (
              <pre className="whitespace-pre-wrap font-sans">{output}</pre>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-600">
                {streaming ? (
                  <span className="flex items-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    <span className="text-gray-500 dark:text-gray-400">Generating…</span>
                  </span>
                ) : (
                  <>
                    <FileText className="h-10 w-10 text-gray-200 dark:text-gray-700" />
                    <span className="text-sm">Your generated content will appear here.</span>
                    {memories.length > 0 && (
                      <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-500 dark:bg-indigo-950 dark:text-indigo-400">
                        <Brain className="h-3.5 w-3.5" />
                        Personalized with {Math.min(memories.length, INJECT_COUNT)} memories
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
            {streaming && output && (
              <span className="inline-block h-4 w-0.5 animate-pulse bg-indigo-500 align-text-bottom" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
