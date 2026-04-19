"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  Memory, MemoryCategory, CATEGORY_META,
  fetchMemories, deleteMemory, addManualMemory, updateMemory,
} from "@/lib/memory";
import { Brain, Trash2, Sparkles, Plus, X, Pencil, Check, AlertCircle } from "lucide-react";

const MANUAL_CATEGORIES: { value: MemoryCategory; label: string; example: string }[] = [
  { value: "rule", label: "🚫 Rule", example: "Never suggest I talk to Sadhna (gf doesn't like it)" },
  { value: "personal", label: "👤 Personal", example: "I have a dog named Bruno" },
  { value: "preference", label: "❤️ Preference", example: "I prefer vegetarian food" },
  { value: "expertise", label: "🎓 Expertise", example: "I'm a software engineer with 5 years experience" },
  { value: "topics", label: "🎯 Topics", example: "I'm interested in crypto and personal finance" },
  { value: "style", label: "✍️ Style", example: "I like short, direct answers without fluff" },
];

export default function MemoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<MemoryCategory | "all">("all");

  // Add note form
  const [showAddForm, setShowAddForm] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteCategory, setNoteCategory] = useState<MemoryCategory>("rule");
  const [saving, setSaving] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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

  async function handleAddNote() {
    if (!user || !noteContent.trim()) return;
    setSaving(true);
    try {
      const mem = await addManualMemory(user.uid, noteContent.trim(), noteCategory);
      setMemories((prev) => [mem, ...prev]);
      setNoteContent(""); setShowAddForm(false);
      toast("Note saved to memory", "success");
    } catch {
      toast("Failed to save note", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave(memoryId: string) {
    if (!user || !editContent.trim()) return;
    try {
      await updateMemory(user.uid, memoryId, editContent.trim());
      setMemories((prev) => prev.map((m) => m.id === memoryId ? { ...m, content: editContent.trim() } : m));
      setEditingId(null);
      toast("Memory updated", "success");
    } catch {
      toast("Failed to update", "error");
    }
  }

  const categories = Object.keys(CATEGORY_META) as MemoryCategory[];
  const counts = Object.fromEntries(
    categories.map((c) => [c, memories.filter((m) => m.category === c).length])
  ) as Record<MemoryCategory, number>;

  const visible =
    activeCategory === "all"
      ? memories
      : memories.filter((m) => m.category === activeCategory);

  const manualCount = memories.filter((m) => m.type === "manual").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Memory</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Personal notes, rules, and everything the app has learned about you.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Note
        </button>
      </div>

      {/* Add note form */}
      {showAddForm && (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-2 ring-indigo-200 dark:bg-gray-900 dark:ring-indigo-900">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold text-gray-900 dark:text-gray-100">Add Memory Note</p>
            <button onClick={() => { setShowAddForm(false); setNoteContent(""); }} className="rounded p-1 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            {/* Category */}
            <div>
              <label className="mb-2 block text-xs font-medium text-gray-500">Type</label>
              <div className="flex flex-wrap gap-2">
                {MANUAL_CATEGORIES.map((c) => (
                  <button key={c.value} onClick={() => setNoteCategory(c.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${noteCategory === c.value ? "bg-indigo-600 text-white" : "border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-400 italic">
                e.g. {MANUAL_CATEGORIES.find((c) => c.value === noteCategory)?.example}
              </p>
            </div>
            {/* Content */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Note *</label>
              <textarea
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={`Write your note here…`}
                autoFocus
                className="block w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
              />
            </div>
            {noteCategory === "rule" && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/20">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Rules are injected into every AI conversation as hard constraints. Be specific — e.g. "Never recommend Zomato orders" rather than "Be careful about spending".
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <button onClick={() => { setShowAddForm(false); setNoteContent(""); }}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button onClick={handleAddNote} disabled={!noteContent.trim() || saving}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40">
                {saving ? "Saving…" : "Save Note"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 dark:bg-indigo-950/40">
          <Brain className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
            {memories.length} total
          </span>
        </div>
        {manualCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 dark:bg-gray-800">
            <Pencil className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{manualCount} manual</span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 dark:bg-gray-800">
          <Sparkles className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{memories.length - manualCount} AI-learned</span>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          <span className="font-semibold">How it works:</span> Memories are injected into every AI session — assistants, roleplay, and analysis features. Rules are treated as hard constraints. You can also tell any assistant "remember that…" and it will save a note here automatically.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
          }`}
        >
          All ({memories.length})
        </button>
        {categories.map((cat) => {
          if (counts[cat] === 0) return null;
          const meta = CATEGORY_META[cat];
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
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
            Add a note manually or generate content and the app will start learning about you.
          </p>
          <button onClick={() => setShowAddForm(true)}
            className="mt-4 flex items-center gap-2 mx-auto rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Add your first note
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No memories in this category.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((memory) => {
            const meta = CATEGORY_META[memory.category] ?? CATEGORY_META.personal;
            const isEditing = editingId === memory.id;
            return (
              <div key={memory.id}
                className="group relative rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md dark:bg-gray-900 dark:ring-gray-700">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                      {meta.label}
                    </span>
                    {memory.type === "manual" && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">manual</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!isEditing && (
                      <button onClick={() => { setEditingId(memory.id); setEditContent(memory.content); }}
                        className="rounded p-1 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(memory.id)} disabled={deletingId === memory.id}
                      className="rounded p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                {isEditing ? (
                  <div className="mt-3">
                    <textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      autoFocus
                      className="block w-full resize-none rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none dark:border-indigo-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                    <div className="mt-2 flex gap-2">
                      <button onClick={() => handleEditSave(memory.id)}
                        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                        <Check className="h-3 w-3" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2.5 text-sm leading-relaxed text-gray-800 dark:text-gray-200">{memory.content}</p>
                )}

                {/* Footer */}
                {!isEditing && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    {memory.type !== "manual" && <span>Used {memory.usageCount}×</span>}
                    {memory.createdAt && (
                      <span>{memory.type !== "manual" && "· "}{memory.createdAt.toDate().toLocaleDateString()}</span>
                    )}
                    {memory.source && memory.source !== "manual" && (
                      <span className="truncate" title={`Source: ${memory.source}`}>· ↳ {memory.source}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
