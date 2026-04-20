"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getApp, isAvailable, AvailableApp } from "@/lib/apps";
import { OpenRouterModel, DEFAULT_MODEL } from "@/lib/openrouter";
import { Memory, fetchMemories, incrementUsage } from "@/lib/memory";
import { saveUsageRecord, estimateTokens } from "@/lib/usage";
import { createItem } from "@/lib/items";
import { logContentGenerated, logContentSaved } from "@/lib/analytics";
import ModelPicker from "@/components/ModelPicker";
import {
  ArrowLeft,
  Clipboard,
  ClipboardCheck,
  Clock,
  Loader2,
  Sparkles,
  Brain,
  FileText,
} from "lucide-react";

const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

const INJECT_COUNT = 20;

function ComingSoonView({ app }: { app: ReturnType<typeof getApp> & object }) {
  const Icon = app!.icon;
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/apps"
          className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Apps
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${app!.accentBg}`}>
          <Icon className={`h-8 w-8 ${app!.accentText}`} size={32} />
        </div>
        <div>
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Coming soon
          </span>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">{app!.name}</h1>
          <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{app!.description}</p>
        </div>
        <Link
          href="/apps"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Browse available apps
        </Link>
      </div>
    </div>
  );
}

function AppRunner({ app }: { app: AvailableApp }) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState("");
  const [model, setModel] = useState(() => userProfile?.defaultModel ?? DEFAULT_MODEL);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    app.fields.forEach((f) => {
      defaults[f.id] = f.type === "select" ? (f.options?.[0] ?? "") : "";
    });
    return defaults;
  });

  const [memories, setMemories] = useState<Memory[]>([]);
  const memoriesRef = useRef<Memory[]>([]);

  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  function setField(id: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [id]: value }));
  }

  function canGenerate() {
    if (streaming || !user) return false;
    return app.fields.filter((f) => f.required).every((f) => fieldValues[f.id]?.trim());
  }

  async function handleGenerate() {
    if (!user || !canGenerate()) return;
    setError("");
    setOutput("");
    setStreaming(true);
    setSaved(false);

    const prompt = app.buildPrompt(fieldValues);
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
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          topic: prompt,
          model,
          contentType: app.contentType,
          memories: memoryStrings,
          length: app.defaultLength,
        }),
        signal: abortRef.current.signal,
      });

      if (res.status === 402) {
        const data = await res.json().catch(() => ({}));
        const bal = data.balance != null ? ` (you have ${data.balance.toLocaleString()})` : "";
        throw new Error(`Not enough tokens${bal}. Top up in Billing.`);
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
            if (parsed.usage?.prompt_tokens) {
              apiPromptTokens = parsed.usage.prompt_tokens;
              apiCompletionTokens = parsed.usage.completion_tokens ?? 0;
              tokensExact = true;
            }
          } catch { /* incomplete chunk */ }
        }
      }

      await logContentGenerated(app.contentType, model);

      if (finalOutput.trim()) {
        const promptTokens = tokensExact
          ? apiPromptTokens
          : estimateTokens(prompt + memoryStrings.join(" "));
        const completionTokens = tokensExact
          ? apiCompletionTokens
          : estimateTokens(finalOutput);
        saveUsageRecord(user.uid, {
          model,
          contentType: app.contentType,
          topic: prompt.slice(0, 120),
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          tokensExact,
        }).catch(() => {});
      }

      if (memoryIds.length > 0) {
        incrementUsage(user.uid, memoryIds).catch(() => {});
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

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    toast("Copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSave() {
    if (!user || !output.trim()) return;
    setSaving(true);
    try {
      const titleField = fieldValues.title ?? fieldValues.topic ?? fieldValues.subject ?? "";
      await createItem(user.uid, {
        title: titleField.trim().slice(0, 80) || app.name,
        content: output.trim(),
        contentType: app.contentType,
        model,
      });
      await logContentSaved(app.contentType);
      setSaved(true);
      toast("Saved to History", "success");
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const selectedModelName =
    models.find((m) => m.id === model)?.name ?? model.split("/")[1] ?? model;
  const Icon = app.icon;

  return (
    <div className="flex h-full flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/apps"
          className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Apps
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${app.accentBg}`}>
            <Icon className={`h-4.5 w-4.5 ${app.accentText}`} size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100">
              {app.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{app.tagline}</p>
          </div>
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
        {/* Left: form */}
        <div className="flex flex-col gap-5">
          {app.fields.map((field) => (
            <div key={field.id}>
              <label
                htmlFor={`field-${field.id}`}
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {field.label}
                {!field.required && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                    optional
                  </span>
                )}
              </label>

              {field.type === "textarea" ? (
                <textarea
                  id={`field-${field.id}`}
                  rows={4}
                  value={fieldValues[field.id] ?? ""}
                  onChange={(e) => setField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={`resize-none ${inputCls}`}
                />
              ) : field.type === "select" ? (
                <select
                  id={`field-${field.id}`}
                  value={fieldValues[field.id] ?? ""}
                  onChange={(e) => setField(field.id, e.target.value)}
                  className={inputCls}
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${field.id}`}
                  type="text"
                  value={fieldValues[field.id] ?? ""}
                  onChange={(e) => setField(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  className={inputCls}
                />
              )}
            </div>
          ))}

          {/* Model picker */}
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
            disabled={!canGenerate() && !streaming}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
              streaming
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {streaming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Stop generating
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate with {selectedModelName}
              </>
            )}
          </button>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Right: output */}
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
                {copied ? (
                  <ClipboardCheck className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Clipboard className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleSave}
                disabled={!output || saving || streaming}
                className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-30"
              >
                {saving ? "Saving…" : saved ? "Saved!" : "Save"}
              </button>
            </div>
          </div>

          <div
            className={`relative flex-1 overflow-y-auto rounded-lg border bg-white p-4 text-sm leading-relaxed text-gray-800 shadow-sm dark:bg-gray-900 dark:text-gray-200 ${
              streaming
                ? "border-indigo-300 dark:border-indigo-700"
                : "border-gray-200 dark:border-gray-700"
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

export default function AppRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.appId as string;
  const app = getApp(appId);

  useEffect(() => {
    if (!app) router.replace("/apps");
  }, [app, router]);

  if (!app) return null;

  if (!isAvailable(app)) return <ComingSoonView app={app} />;

  return <AppRunner app={app} />;
}
