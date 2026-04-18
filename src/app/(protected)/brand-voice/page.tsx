"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { saveBrandVoice, BrandVoice } from "@/lib/brand-voice";
import { Mic2, Save } from "lucide-react";

const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

const TONE_OPTIONS = [
  "Professional", "Casual", "Friendly", "Formal",
  "Witty", "Authoritative", "Empathetic", "Inspirational",
];

const STYLE_OPTIONS = [
  "Concise & punchy", "Detailed & analytical", "Storytelling",
  "Data-driven", "Conversational", "Educational", "Persuasive",
];

export default function BrandVoicePage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const saved = userProfile?.brandVoice ?? {};
  const [tone, setTone] = useState(saved.tone ?? "");
  const [style, setStyle] = useState(saved.style ?? "");
  const [audience, setAudience] = useState(saved.audience ?? "");
  const [avoidWords, setAvoidWords] = useState(saved.avoidWords ?? "");
  const [samplePhrase, setSamplePhrase] = useState(saved.samplePhrase ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const bv = userProfile?.brandVoice;
    if (!bv) return;
    setTone(bv.tone ?? "");
    setStyle(bv.style ?? "");
    setAudience(bv.audience ?? "");
    setAvoidWords(bv.avoidWords ?? "");
    setSamplePhrase(bv.samplePhrase ?? "");
  }, [userProfile]);

  const isDirty =
    tone !== (saved.tone ?? "") ||
    style !== (saved.style ?? "") ||
    audience !== (saved.audience ?? "") ||
    avoidWords !== (saved.avoidWords ?? "") ||
    samplePhrase !== (saved.samplePhrase ?? "");

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const voice: BrandVoice = { tone, style, audience, avoidWords, samplePhrase };
      await saveBrandVoice(user.uid, voice);
      toast("Brand voice saved", "success");
    } catch {
      toast("Failed to save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Brand Voice</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define your writing style. It&apos;s injected automatically into every generation.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="rounded-xl bg-indigo-50 p-4 text-sm text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
        <div className="flex items-start gap-2">
          <Mic2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Your brand voice is automatically included in every AI generation. The more specific you
            are, the more consistent your content will sound.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tone */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tone
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t === tone ? "" : t)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  tone === t
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Or type your own tone…"
            className={inputCls}
          />
        </div>

        {/* Style */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Writing Style
          </label>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {STYLE_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s === style ? "" : s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  style === s
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="Or describe your style…"
            className={inputCls}
          />
        </div>

        {/* Target audience */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Target Audience
          </label>
          <input
            type="text"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="e.g. SaaS founders, freelance designers, HR professionals…"
            className={inputCls}
          />
        </div>

        {/* Avoid words */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Words / Phrases to Avoid
          </label>
          <input
            type="text"
            value={avoidWords}
            onChange={(e) => setAvoidWords(e.target.value)}
            placeholder="e.g. synergy, leverage, game-changer, utilize…"
            className={inputCls}
          />
        </div>

        {/* Sample phrase — full width */}
        <div className="lg:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Sample Phrase / Sentence
          </label>
          <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
            A sentence that captures your voice. The AI will use it as a style reference.
          </p>
          <textarea
            rows={3}
            value={samplePhrase}
            onChange={(e) => setSamplePhrase(e.target.value)}
            placeholder="e.g. We build in public, ship fast, and believe great products speak for themselves."
            className={`resize-none ${inputCls}`}
          />
        </div>
      </div>

      {/* Preview */}
      {(tone || style || audience || avoidWords || samplePhrase) && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            What gets injected into your prompts
          </p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 dark:text-gray-300">
            {[
              tone && `Tone: ${tone}`,
              style && `Writing style: ${style}`,
              audience && `Target audience: ${audience}`,
              avoidWords && `Avoid these words/phrases: ${avoidWords}`,
              samplePhrase && `Example of my voice: "${samplePhrase}"`,
            ]
              .filter(Boolean)
              .join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
