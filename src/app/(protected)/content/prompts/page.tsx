"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Wand2,
  Layers,
  Loader2,
  Clipboard,
  ClipboardCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  TEMPLATES,
  CATEGORY_META,
  TemplateCategory,
  fillTemplate,
  PromptTemplate,
} from "@/lib/prompt-templates";
import type { ExpandedPrompt } from "@/app/api/expand-prompts/route";

const CONTENT_TYPE_SUGGESTIONS = [
  "LinkedIn post",
  "Twitter / X thread",
  "Blog post",
  "Email newsletter",
  "YouTube script",
  "Reddit post",
  "Substack article",
  "Case study",
];

const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

// ─── Angle colours ────────────────────────────────────────────────────────────
const ANGLE_COLORS: Record<string, string> = {
  "Personal Story": "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  "Contrarian Take": "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  "Step-by-Step Guide": "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "Data & Evidence": "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400",
  "Vision & Prediction": "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
};

// ─── Expanded prompt card ─────────────────────────────────────────────────────
function PromptCard({
  prompt,
  index,
  contentType,
}: {
  prompt: ExpandedPrompt;
  index: number;
  contentType: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(index === 0);

  const color =
    ANGLE_COLORS[prompt.angle] ??
    "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400";

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleUse() {
    const params = new URLSearchParams({
      prompt: prompt.prompt,
      ...(contentType ? { contentType } : {}),
    });
    router.push(`/create?${params.toString()}`);
  }

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md dark:bg-gray-900 dark:ring-gray-700">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start justify-between gap-4 px-5 pt-5 pb-4 text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
              {prompt.angle}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
            {prompt.description}
          </p>
        </div>
        <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <>
          <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              {prompt.prompt}
            </pre>
          </div>
          <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-gray-800"
            >
              {copied ? (
                <ClipboardCheck className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Clipboard className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy prompt"}
            </button>
            <button
              onClick={handleUse}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Use in Create
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────
function TemplateCard({ template }: { template: PromptTemplate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const meta = CATEGORY_META[template.category];
  const filled = fillTemplate(template, values);
  const allFilled = template.variables.every((v) => values[v.key]?.trim());

  async function handleCopy() {
    await navigator.clipboard.writeText(filled);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleUse() {
    const contentTypeVar = template.variables.find((v) => v.key === "content_type");
    const contentType = contentTypeVar ? values[contentTypeVar.key] ?? "" : "";
    const params = new URLSearchParams({
      prompt: filled,
      ...(contentType ? { contentType } : {}),
    });
    router.push(`/create?${params.toString()}`);
  }

  return (
    <div className="flex flex-col rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md dark:bg-gray-900 dark:ring-gray-700">
      {/* Card header */}
      <div className="flex items-start gap-4 p-5">
        <span className="text-2xl">{template.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {template.name}
            </h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {template.bestFor.map((t) => (
              <span
                key={t}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-3 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950"
        >
          {open ? "Close template" : "Use this template"}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Fill-in form */}
      {open && (
        <>
          <div className="space-y-3 px-5 pb-4 pt-2">
            {template.variables.map((v) => (
              <div key={v.key}>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  {v.label}
                </label>
                {v.multiline ? (
                  <textarea
                    rows={3}
                    value={values[v.key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.placeholder}
                    className={`resize-none ${inputCls} text-xs`}
                  />
                ) : (
                  <input
                    type="text"
                    value={values[v.key] ?? ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.placeholder}
                    className={`${inputCls} text-xs`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Live preview */}
          <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">Preview</p>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 font-sans text-xs leading-relaxed text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              {filled}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <button
              onClick={handleCopy}
              disabled={!allFilled}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-gray-800"
            >
              {copied ? (
                <ClipboardCheck className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Clipboard className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleUse}
              disabled={!allFilled}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            >
              Use in Create
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {!allFilled && (
              <span className="ml-1 self-center text-xs text-amber-500">Fill all fields first</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PromptsPage() {
  const [tab, setTab] = useState<"expand" | "templates">("expand");

  // AI Expand state
  const [idea, setIdea] = useState("");
  const [contentType, setContentType] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ExpandedPrompt[]>([]);
  const [error, setError] = useState("");

  // Templates state
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "all">("all");

  const visibleTemplates =
    activeCategory === "all"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  async function handleExpand() {
    if (!idea.trim() || loading) return;
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const res = await fetch("/api/expand-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim(), contentType: contentType.trim() || undefined }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: ExpandedPrompt[] = await res.json();
      if (!data.length) throw new Error("No prompts returned. Please try again.");
      setResults(data);
    } catch (e) {
      setError((e as Error).message || "Failed to generate prompts. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pt-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prompt Workshop</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Turn a raw idea into optimized, ready-to-use prompts — or build one from a proven template.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800 w-fit">
        {(
          [
            { key: "expand", icon: Wand2, label: "AI Expand" },
            { key: "templates", icon: Layers, label: "Templates" },
          ] as const
        ).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === key
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: AI Expand ── */}
      {tab === "expand" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left: input */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Your idea
              </h2>

              {/* Idea input */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  What do you want to write about?
                </label>
                <textarea
                  rows={4}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="Describe your idea in a sentence or two… e.g. 'The lessons I learned from 6 months of cold outreach'"
                  className={`resize-none ${inputCls}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleExpand();
                  }}
                />
              </div>

              {/* Content type */}
              <div className="mb-5">
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Content type{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  placeholder="e.g. LinkedIn post, Blog post…"
                  className={inputCls}
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {CONTENT_TYPE_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setContentType(s)}
                      className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                        contentType === s
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleExpand}
                disabled={!idea.trim() || loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating prompts…</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Generate 5 Prompts</>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                ⌘ + Enter to generate
              </p>

              {error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                  {error}
                </p>
              )}
            </div>

            {/* Tip box */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/50">
              <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300 mb-1.5">
                How it works
              </p>
              <ul className="space-y-1 text-xs text-indigo-700 dark:text-indigo-400">
                <li>• Enter a raw idea — even one sentence is enough</li>
                <li>• AI rewrites it into 5 proven narrative angles</li>
                <li>• Pick the best one and send it straight to Create</li>
                <li>• Each prompt is detailed enough to produce great output</li>
              </ul>
            </div>
          </div>

          {/* Right: results */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-white py-20 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Crafting 5 optimized prompts…
                </p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {results.length} prompts generated — click any to expand, then send to Create.
                </p>
                {results.map((p, i) => (
                  <PromptCard key={i} prompt={p} index={i} contentType={contentType} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white py-20 text-center shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                <Wand2 className="h-10 w-10 text-gray-200 dark:text-gray-700" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Enter an idea to generate prompts
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">
                  You&apos;ll get 5 distinct angles: story, contrarian, how-to, data-driven, and vision.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Templates ── */}
      {tab === "templates" && (
        <div className="space-y-5">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              All ({TEMPLATES.length})
            </button>
            {(Object.keys(CATEGORY_META) as TemplateCategory[]).map((cat) => {
              const count = TEMPLATES.filter((t) => t.category === cat).length;
              const meta = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {meta.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
