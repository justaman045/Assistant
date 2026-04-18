"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Item, ItemVersion } from "@/lib/types";
import {
  fetchItemVersions,
  updateItemContent,
  restoreVersion,
  deleteItemWithVersions,
  VERSION_SOURCE_LABELS,
} from "@/lib/items";
import {
  Clipboard,
  ClipboardCheck,
  Pencil,
  Clock,
  Trash2,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  FileText,
  Search,
  Download,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/Skeleton";
import { useToast } from "@/context/ToastContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

const inputCls =
  "block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

// ─── Version panel ────────────────────────────────────────────────────────────

function VersionsPanel({
  itemId,
  uid,
  onRestored,
  onClose,
}: {
  itemId: string;
  uid: string;
  onRestored: (content: string) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<ItemVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    fetchItemVersions(itemId).then((v) => {
      setVersions(v);
      setLoading(false);
    });
  }, [itemId]);

  async function handleRestore(version: ItemVersion) {
    setRestoringId(version.id);
    try {
      await restoreVersion(itemId, uid, version);
      const fresh = await fetchItemVersions(itemId);
      setVersions(fresh);
      onRestored(version.content);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="border-t border-indigo-100 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/30">
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
            Version history
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : versions.length === 0 ? (
        <p className="px-5 pb-4 text-xs text-gray-400 dark:text-gray-500">
          No version history yet. Edit this item to start tracking changes.
        </p>
      ) : (
        <ul className="px-5 pb-4 space-y-1">
          {versions.map((v, i) => {
            const isCurrent = i === 0;
            const isPreview = previewId === v.id;
            const isRestoring = restoringId === v.id;
            const wc = wordCount(v.content);

            return (
              <li key={v.id}>
                <div
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    isCurrent
                      ? "bg-white ring-1 ring-indigo-200 dark:bg-gray-900 dark:ring-indigo-800"
                      : "hover:bg-white/60 dark:hover:bg-gray-900/40"
                  }`}
                >
                  {/* Version badge */}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                      isCurrent
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    v{v.versionNumber}
                  </span>

                  {/* Meta */}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {VERSION_SOURCE_LABELS[v.source]}
                    </span>
                    {v.note && (
                      <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500 italic">
                        "{v.note}"
                      </span>
                    )}
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      {v.createdAt ? timeAgo(v.createdAt.toDate()) : "—"} · {wc.toLocaleString()} words
                    </span>
                    {isCurrent && (
                      <span className="ml-2 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        current
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => setPreviewId(isPreview ? null : v.id)}
                      className="rounded px-2 py-1 text-xs text-indigo-600 transition-colors hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900"
                    >
                      {isPreview ? "Hide" : "Preview"}
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={() => handleRestore(v)}
                        disabled={!!restoringId}
                        title="Restore this version"
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-40 dark:text-amber-400 dark:hover:bg-amber-950"
                      >
                        {isRestoring ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        {isRestoring ? "Restoring…" : "Restore"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline preview */}
                {isPreview && (
                  <div className="mx-3 mb-2 mt-0.5 rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                    <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                      {v.content}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── History item card ────────────────────────────────────────────────────────

function HistoryItemCard({
  item,
  onDeleted,
}: {
  item: Item;
  onDeleted: (id: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState(item.content);
  const [title, setTitle] = useState(item.title);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editContent, setEditContent] = useState(item.content);
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const versionCount = item.versionCount ?? 1;
  const isLong = content.length > 300;

  function startEdit() {
    setEditTitle(title);
    setEditContent(content);
    setEditNote("");
    setEditing(true);
    setExpanded(true);
    setShowVersions(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function cancelEdit() {
    setEditing(false);
  }

  async function handleSaveEdit() {
    if (!user) return;
    setSaving(true);
    try {
      await updateItemContent(item.id, user.uid, editContent, editTitle, editNote);
      setTitle(editTitle);
      setContent(editContent);
      setEditing(false);
      toast("Changes saved", "success");
    } catch {
      toast("Failed to save changes. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast("Copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteItemWithVersions(item.id);
      onDeleted(item.id);
      toast("Item deleted", "info");
    } catch {
      toast("Failed to delete item. Please try again.", "error");
      setDeleting(false);
    }
  }

  function handleRestored(newContent: string) {
    setContent(newContent);
    setShowVersions(false);
  }

  const date = item.updatedAt?.toDate() ?? item.createdAt?.toDate();

  return (
    <div className={`rounded-xl bg-white shadow-sm ring-1 transition-shadow hover:shadow-md dark:bg-gray-900 ${
      editing ? "ring-indigo-300 dark:ring-indigo-700" : "ring-gray-200 dark:ring-gray-700"
    }`}>
      {editing ? (
        /* ── Edit mode ── */
        <div className="p-5">
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Title</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Content</label>
            <textarea
              ref={textareaRef}
              rows={12}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className={`resize-y ${inputCls}`}
            />
            <p className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
              {wordCount(editContent).toLocaleString()} words · {editContent.length.toLocaleString()} chars
            </p>
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Change note <span className="font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="e.g. Tightened the intro, added data point…"
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editContent.trim() || !editTitle.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      ) : (
        /* ── View mode ── */
        <>
          {/* Header */}
          <div className="flex items-start gap-3 px-5 pt-5 pb-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              {title[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h2>
                {item.contentType && (
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                    {item.contentType}
                  </span>
                )}
                {versionCount > 1 && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                    v{versionCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-5 pb-3">
            <p className={`text-sm leading-relaxed text-gray-600 dark:text-gray-400 ${!expanded && isLong ? "line-clamp-3" : ""}`}>
              {content}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded((e) => !e)}
                className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show more</>}
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            {/* Meta */}
            <span className="text-xs text-gray-400 dark:text-gray-500" title={date?.toLocaleString()}>
              {date ? timeAgo(date) : "—"}
            </span>
            <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {wordCount(content).toLocaleString()} words
            </span>
            {item.model && (
              <>
                <span className="text-xs text-gray-300 dark:text-gray-600">·</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  {item.model.split("/")[1] ?? item.model}
                </span>
              </>
            )}

            {/* Actions */}
            <div className="ml-auto flex items-center gap-1.5">
              {/* Copy */}
              <button
                onClick={handleCopy}
                title="Copy content"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-gray-800"
              >
                {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-green-500" /> : <Clipboard className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>

              {/* Edit */}
              <button
                onClick={startEdit}
                title="Edit"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 ring-1 ring-gray-200 transition-colors hover:bg-indigo-50 hover:text-indigo-600 hover:ring-indigo-200 dark:ring-gray-700 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>

              {/* Versions */}
              <button
                onClick={() => setShowVersions((v) => !v)}
                title="Version history"
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ring-1 transition-colors ${
                  showVersions
                    ? "bg-indigo-50 text-indigo-600 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:ring-indigo-800"
                    : "text-gray-500 ring-gray-200 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                {versionCount > 1 ? `${versionCount} versions` : "Versions"}
              </button>

              {/* Export */}
              <div className="relative group">
                <button
                  title="Export"
                  className="rounded-md p-1.5 text-gray-400 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 hover:text-gray-600 dark:ring-gray-700 dark:hover:bg-gray-800"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <div className="absolute right-0 top-full z-50 mt-1 hidden w-36 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg group-hover:block dark:border-gray-700 dark:bg-gray-900">
                  <button
                    onClick={() => {
                      const blob = new Blob([`# ${title}\n\n${content}`], { type: "text/markdown" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                      a.download = `${title.slice(0, 40).replace(/[^a-z0-9]/gi, "-")}.md`; a.click();
                    }}
                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Download as Markdown
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([content], { type: "text/plain" });
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                      a.download = `${title.slice(0, 40).replace(/[^a-z0-9]/gi, "-")}.txt`; a.click();
                    }}
                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Download as TXT
                  </button>
                </div>
              </div>

              {/* Delete */}
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-500">Delete?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? "…" : "Yes"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  title="Delete"
                  className="rounded-md p-1.5 text-gray-400 ring-1 ring-gray-200 transition-colors hover:bg-red-50 hover:text-red-500 hover:ring-red-200 dark:ring-gray-700 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Version panel */}
      {showVersions && !editing && user && (
        <VersionsPanel
          itemId={item.id}
          uid={user.uid}
          onRestored={handleRestored}
          onClose={() => setShowVersions(false)}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "items"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    getDocs(q).then((snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Item, "id">) })));
      setLoading(false);
    });
  }, [user]);

  function handleDeleted(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(search.toLowerCase()) ||
          i.content.toLowerCase().includes(search.toLowerCase()) ||
          i.contentType?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  return (
    <div className="pt-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">History</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Loading…" : `${items.length} saved ${items.length === 1 ? "item" : "items"}`}
          </p>
        </div>
        <Link
          href="/content/create"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
        >
          + Create new
        </Link>
      </div>

      {/* Search */}
      {!loading && items.length > 0 && (
        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, content, or type…"
            className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <ul className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700 p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <div className="rounded-xl bg-white py-16 text-center shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No items yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Generate your first piece of content to see it here.
            </p>
            <Link
              href="/content/create"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Create now →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No items match &ldquo;{search}&rdquo;.
            </p>
            <button onClick={() => setSearch("")} className="mt-2 text-sm text-indigo-600 hover:underline dark:text-indigo-400">
              Clear search
            </button>
          </div>
        ) : (
          <>
            {search && (
              <p className="mb-4 text-xs text-gray-400 dark:text-gray-500">
                {filtered.length} of {items.length} items match
              </p>
            )}
            <ul className="space-y-4">
              {filtered.map((item) => (
                <li key={item.id}>
                  <HistoryItemCard item={item} onDeleted={handleDeleted} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
