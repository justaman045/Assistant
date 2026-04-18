"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Key, Plus, Trash2, CheckCircle, Circle, Eye, EyeOff, Loader2, RefreshCw, FlaskConical, XCircle } from "lucide-react";

interface KeyEntry {
  id: string;
  label: string;
  maskedKey: string;
  addedAt: string | null;
  isEnv: boolean;
}

interface KeysData {
  activeKeyId: string | null;
  keys: KeyEntry[];
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const [data, setData] = useState<KeysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add key form
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [adding, setAdding] = useState(false);

  const [activating, setActivating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Key test state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean; maskedKey: string | null; modelCount?: number; status?: number; error?: string;
  } | null>(null);

  async function getToken() {
    return user!.getIdToken();
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/api-keys", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) load(); }, [user]);

  async function handleAdd() {
    if (!newKey.trim()) return;
    setAdding(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key: newKey.trim(), label: newLabel.trim() || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      setNewKey("");
      setNewLabel("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function handleSetActive(keyId: string) {
    setActivating(keyId);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/api-keys/active", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ keyId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setData((prev) => prev ? { ...prev, activeKeyId: keyId } : prev);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActivating(null);
    }
  }

  async function handleDelete(keyId: string) {
    if (!confirm("Delete this API key?")) return;
    setDeleting(keyId);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(null);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/test-key", { headers: { Authorization: `Bearer ${token}` } });
      setTestResult(await res.json());
    } catch (e) {
      setTestResult({ ok: false, maskedKey: null, error: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Key Management</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage OpenRouter API keys. The active key is used for all AI requests.
          </p>
        </div>
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-violet-600 hover:text-violet-300 disabled:opacity-50"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
          Test active key
        </button>
      </div>

      {/* Test result banner */}
      {testResult && (
        <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
          testResult.ok
            ? "border-green-800 bg-green-950/40 text-green-300"
            : "border-red-800 bg-red-950/40 text-red-400"
        }`}>
          {testResult.ok
            ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />}
          <div className="flex-1 min-w-0">
            {testResult.ok
              ? <>Key <code className="font-mono text-xs">{testResult.maskedKey}</code> is valid — {testResult.modelCount} models available.</>
              : <>
                  Key <code className="font-mono text-xs">{testResult.maskedKey ?? "(none)"}</code> failed
                  {testResult.status ? ` (HTTP ${testResult.status})` : ""}: {testResult.error}
                </>
            }
          </div>
          <button onClick={() => setTestResult(null)} className="shrink-0 text-current opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Add new key */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-violet-400" /> Add New Key
        </h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Label (e.g. Primary, Backup)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-violet-500 focus:outline-none"
          />
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              placeholder="sk-or-v1-..."
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 pr-10 text-sm text-white placeholder:text-gray-500 focus:border-violet-500 focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !newKey.trim()}
            className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Key
          </button>
        </div>
      </div>

      {/* Key list */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-violet-400" />
            Stored Keys {data ? `(${data.keys.length})` : ""}
          </h2>
          <button onClick={load} className="text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
          </div>
        ) : data?.keys.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Key className="mx-auto mb-2 h-8 w-8 text-gray-700" />
            <p className="text-sm text-gray-500">No keys stored yet.</p>
            <p className="mt-1 text-xs text-gray-600">Add a key above — it will become active automatically.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {(data?.keys ?? []).map((k) => {
              const isActive = k.id === data?.activeKeyId;
              const storedCount = (data?.keys ?? []).filter((x) => !x.isEnv).length;
              return (
                <li key={k.id} className="flex items-center gap-4 px-6 py-4">
                  {/* Active indicator */}
                  <button
                    onClick={() => !isActive && handleSetActive(k.id)}
                    disabled={isActive || activating === k.id}
                    title={isActive ? "Active key" : "Set as active"}
                    className="shrink-0"
                  >
                    {activating === k.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                    ) : isActive ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-600 hover:text-violet-400 transition-colors" />
                    )}
                  </button>

                  {/* Key info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white truncate">{k.label}</p>
                      {isActive && (
                        <span className="shrink-0 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">
                          Active
                        </span>
                      )}
                      {k.isEnv && (
                        <span className="shrink-0 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500 border border-gray-700">
                          .env
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-gray-500">{k.maskedKey}</p>
                    {!k.isEnv && k.addedAt && (
                      <p className="mt-0.5 text-xs text-gray-600">Added {formatDate(k.addedAt)}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => handleSetActive(k.id)}
                        disabled={activating !== null}
                        className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-violet-600 hover:text-violet-400"
                      >
                        Set active
                      </button>
                    )}
                    {!k.isEnv && (
                      <button
                        onClick={() => handleDelete(k.id)}
                        disabled={deleting === k.id || storedCount <= 1}
                        title={storedCount <= 1 ? "Cannot delete the last stored key" : "Delete key"}
                        className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-red-950 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {deleting === k.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Info note */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 text-xs text-gray-500 leading-relaxed">
        <strong className="text-gray-400">How it works:</strong> The active key is used for all AI requests platform-wide.
        Keys are stored securely in Firestore and never exposed to clients.
        Switching the active key takes effect within ~1 minute across all server instances.
        The <code className="text-gray-400">OPENROUTER_API_KEY</code> env var is used as a fallback if no Firestore key is configured.
      </div>
    </div>
  );
}
