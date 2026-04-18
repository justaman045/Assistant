import { Sparkles, Wrench, Zap, Shield } from "lucide-react";

const RELEASES = [
  {
    version: "1.5.0",
    date: "April 2026",
    highlights: ["Brand Voice — inject your tone into every generation", "Referral program — earn credits for inviting friends", "Content Calendar — visualize saved items by date", "Export content as Markdown or plain text"],
    type: "feature" as const,
  },
  {
    version: "1.4.0",
    date: "March 2026",
    highlights: ["Admin dashboard with user management", "Credit adjustment tools for admins", "Platform-wide stats and activity feed"],
    type: "feature" as const,
  },
  {
    version: "1.3.0",
    date: "February 2026",
    highlights: ["Settings page with default model preference", "18 AI content apps across 5 categories", "Coming-soon app badges with roadmap preview"],
    type: "feature" as const,
  },
  {
    version: "1.2.0",
    date: "January 2026",
    highlights: ["Version history for every saved item", "Restore previous versions with one click", "Change notes on edits"],
    type: "feature" as const,
  },
  {
    version: "1.1.0",
    date: "December 2025",
    highlights: ["Razorpay credit packs (one-time purchase)", "Low-credit warnings in sidebar", "Memory system for personalized generations"],
    type: "feature" as const,
  },
  {
    version: "1.0.0",
    date: "November 2025",
    highlights: ["Initial launch", "AI content generation with 30+ models via OpenRouter", "Content history with search", "Prompt Workshop"],
    type: "feature" as const,
  },
];

const TYPE_ICON = {
  feature: Sparkles,
  fix: Wrench,
  performance: Zap,
  security: Shield,
};

const TYPE_COLOR = {
  feature: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
  fix: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  performance: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  security: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export default function ChangelogPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">What&apos;s New</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Release notes and updates — newest first.
        </p>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-8">
          {RELEASES.map((release, i) => {
            const Icon = TYPE_ICON[release.type];
            return (
              <div key={release.version} className="relative flex gap-5">
                {/* Dot */}
                <div
                  className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-sm dark:border-gray-900 ${TYPE_COLOR[release.type]}`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Card */}
                <div className="flex-1 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      v{release.version}
                    </span>
                    {i === 0 && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                        Latest
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">{release.date}</span>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {release.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400 dark:bg-indigo-600" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
