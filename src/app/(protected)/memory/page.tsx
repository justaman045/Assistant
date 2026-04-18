"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Memory, MemoryCategory, CATEGORY_META, fetchMemories, deleteMemory } from "@/lib/memory";
import { Brain, Trash2, Sparkles } from "lucide-react";

export default function MemoryPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<MemoryCategory | "all">("all");

  useEffect(() => {
    if (!user) return;
    fetchMemories(user.uid).then((m) => {
      setMemories(m);
      setLoading(false);
    });
  }, [user]);

  async function handleDelete(memoryId: string) {
    if (!user) return;
    setDeletingId(memoryId);
    await deleteMemory(user.uid, memoryId);
    setMemories((prev) => prev.filter((m) => m.id !== memoryId));
    setDeletingId(null);
  }

  const categories = Object.keys(CATEGORY_META) as MemoryCategory[];
  const counts = Object.fromEntries(
    categories.map((c) => [c, memories.filter((m) => m.category === c).length])
  ) as Record<MemoryCategory, number>;

  const visible =
    activeCategory === "all"
      ? memories
      : memories.filter((m) => m.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Memory</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Everything the app has learned about you to personalize your content.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 dark:bg-indigo-950">
          <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
            {memories.length} {memories.length === 1 ? "memory" : "memories"}
          </span>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/50">
        <div className="flex gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <div>
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
              How personalization works
            </p>
            <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-400">
              Every time you generate content, the app silently learns facts about your background,
              style, audience, and values. These memories are automatically injected into future AI
              prompts so content sounds like <em>you</em> — not a generic template. Delete any
              memory you don&apos;t want used.
            </p>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          All ({memories.length})
        </button>
        {categories.map((cat) => {
          if (counts[cat] === 0) return null;
          const meta = CATEGORY_META[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {meta.label} ({counts[cat]})
            </button>
          );
        })}
      </div>

      {/* Memory list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : visible.length === 0 && memories.length === 0 ? (
        <div className="rounded-xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <Brain className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No memories yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Generate your first piece of content and the app will start learning about you.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
          No memories in this category.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((memory) => {
            const meta = CATEGORY_META[memory.category];
            return (
              <div
                key={memory.id}
                className="group relative rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md dark:bg-gray-900 dark:ring-gray-700"
              >
                {/* Category badge */}
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}>
                  {meta.label}
                </span>

                {/* Content */}
                <p className="mt-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                  {memory.content}
                </p>

                {/* Footer */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    <span title="Times used to personalize content">
                      Used {memory.usageCount}×
                    </span>
                    {memory.createdAt && (
                      <span className="ml-2">
                        · {memory.createdAt.toDate().toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(memory.id)}
                    disabled={deletingId === memory.id}
                    title="Remove this memory"
                    className="rounded-md p-1 text-gray-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50 dark:text-gray-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Source */}
                {memory.source && (
                  <p
                    className="mt-2 truncate text-xs text-gray-400 dark:text-gray-500"
                    title={`Source: ${memory.source}`}
                  >
                    ↳ {memory.source}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
