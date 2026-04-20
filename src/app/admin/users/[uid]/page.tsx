"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  ArrowLeft,
  Shield,
  ShieldOff,
  Zap,
  FileText,
  Brain,
  Plus,
  Minus,
  Check,
} from "lucide-react";

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  preferredName: string;
  role: string;
  tokens: number;
  tokensUsed: number;
  credits?: number;
  creditsUsed?: number;
  isAdmin: boolean;
  onboardingComplete: boolean;
  defaultModel: string;
  createdAt: string | null;
  lastLoginAt: string | null;
}

interface UserStats {
  itemCount: number;
  generationCount: number;
  memoryCount: number;
}

interface ActivityItem {
  id: string;
  model: string;
  contentType: string;
  topic: string;
  totalTokens: number;
  createdAt: string | null;
}

interface UserDetail {
  profile: UserProfile;
  stats: UserStats;
  recentActivity: ActivityItem[];
}

function formatDate(iso: string | null, includeTime = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950">
        <Icon className="h-4 w-4 text-violet-400" size={16} />
      </div>
      <div>
        <p className="text-lg font-bold text-white">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const targetUid = params.uid as string;
  const { user } = useAuth();
  const { toast } = useToast();

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Credit adjustment state
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // Admin toggle state
  const [togglingAdmin, setTogglingAdmin] = useState(false);

  async function getToken() {
    return user!.getIdToken();
  }

  async function fetchDetail() {
    const token = await getToken();
    const res = await fetch(`/api/admin/users/${targetUid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<UserDetail>;
  }

  useEffect(() => {
    if (!user) return;
    fetchDetail()
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, targetUid]);

  async function handleCreditAdjust(sign: 1 | -1) {
    const amount = parseFloat(creditAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid positive amount", "error");
      return;
    }

    setAdjusting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${targetUid}/credits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: sign * amount, note: creditNote }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { tokens } = await res.json();
      setDetail((prev) =>
        prev ? { ...prev, profile: { ...prev.profile, tokens } } : prev
      );
      setCreditAmount("");
      setCreditNote("");
      toast(
        `${sign > 0 ? "Added" : "Removed"} ${amount.toLocaleString()} tokens successfully`,
        "success"
      );
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setAdjusting(false);
    }
  }

  async function handleToggleAdmin() {
    if (!detail) return;
    const newIsAdmin = !detail.profile.isAdmin;
    setTogglingAdmin(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${targetUid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAdmin: newIsAdmin }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDetail((prev) =>
        prev
          ? { ...prev, profile: { ...prev.profile, isAdmin: newIsAdmin } }
          : prev
      );
      toast(
        newIsAdmin ? "User granted admin access" : "Admin access revoked",
        "success"
      );
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setTogglingAdmin(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-400">{error || "User not found"}</p>
        <Link href="/admin/users" className="text-xs text-violet-400 hover:text-violet-300">
          ← Back to users
        </Link>
      </div>
    );
  }

  const { profile, stats, recentActivity } = detail;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/users"
          className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Users
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="" className="h-14 w-14 rounded-full ring-2 ring-gray-700" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-900 text-xl font-bold text-violet-300">
            {(profile.displayName || profile.email)[0].toUpperCase()}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{profile.displayName || "—"}</h1>
            {profile.isAdmin && (
              <span className="flex items-center gap-1 rounded-full bg-violet-950 px-2 py-0.5 text-xs font-medium text-violet-300">
                <Shield className="h-3 w-3" /> Admin
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">{profile.email}</p>
          <p className="text-xs text-gray-500">
            {profile.role || "No role"} · Joined {formatDate(profile.createdAt)}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatPill icon={Zap} label="Generations" value={stats.generationCount} />
        <StatPill icon={FileText} label="Saved items" value={stats.itemCount} />
        <StatPill icon={Brain} label="Memories" value={stats.memoryCount} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Token Management */}
        <div className="rounded-xl border border-gray-800 bg-gray-900">
          <div className="border-b border-gray-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Token Management</h2>
            <p className="mt-0.5 text-xs text-gray-500">Add or remove tokens from this user.</p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4">
            {/* Current balance */}
            <div className="flex items-center justify-between rounded-lg bg-gray-800/60 px-4 py-3">
              <span className="text-sm text-gray-400">Current balance</span>
              <span className="text-xl font-bold text-white">
                {profile.tokens >= 1000 ? `${(profile.tokens / 1000).toFixed(1)}K` : profile.tokens.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-800/60 px-4 py-3">
              <span className="text-sm text-gray-400">Total consumed</span>
              <span className="text-sm font-medium text-gray-300">
                {profile.tokensUsed >= 1000 ? `${(profile.tokensUsed / 1000).toFixed(1)}K` : profile.tokensUsed.toLocaleString()}
              </span>
            </div>

            {/* Adjustment form */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Tokens to add / remove
              </label>
              <input
                type="number"
                min={1}
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="e.g. 100"
                className="block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Reason / note (optional)
              </label>
              <input
                type="text"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                placeholder="e.g. Goodwill credit, refund…"
                className="block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleCreditAdjust(1)}
                disabled={adjusting || !creditAmount}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
              <button
                onClick={() => handleCreditAdjust(-1)}
                disabled={adjusting || !creditAmount}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        </div>

        {/* Profile & Admin Controls */}
        <div className="flex flex-col gap-4">
          {/* Profile info */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Profile</h2>
            <dl className="space-y-2">
              {[
                ["Preferred name", profile.preferredName || "—"],
                ["Role", profile.role || "—"],
                ["Default model", profile.defaultModel || "System default"],
                ["Onboarding", profile.onboardingComplete ? "Complete" : "Pending"],
                ["Last active", formatDate(profile.lastLoginAt, true)],
              ].map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <dt className="text-xs text-gray-500">{key}</dt>
                  <dd className="text-xs font-medium text-gray-300">{val}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Admin access */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4">
            <h2 className="mb-1 text-sm font-semibold text-white">Admin Access</h2>
            <p className="mb-4 text-xs text-gray-500">
              Grant this user access to the admin control panel.
            </p>
            <button
              onClick={handleToggleAdmin}
              disabled={togglingAdmin || profile.uid === user?.uid}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 ${
                profile.isAdmin
                  ? "border-red-800 bg-red-950/50 text-red-400 hover:bg-red-950"
                  : "border-violet-800 bg-violet-950/50 text-violet-400 hover:bg-violet-950"
              }`}
            >
              {profile.uid === user?.uid ? (
                <>
                  <Shield className="h-4 w-4" />
                  Cannot modify your own account
                </>
              ) : profile.isAdmin ? (
                <>
                  <ShieldOff className="h-4 w-4" />
                  {togglingAdmin ? "Revoking…" : "Revoke admin access"}
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  {togglingAdmin ? "Granting…" : "Grant admin access"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          <p className="mt-0.5 text-xs text-gray-500">Last 10 generations by this user.</p>
        </div>
        <div className="divide-y divide-gray-800">
          {recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">No generations yet.</p>
          ) : (
            recentActivity.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{item.topic || "—"}</p>
                  <p className="text-xs text-gray-500">
                    {item.contentType} · {item.model.split("/")[1] ?? item.model}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-gray-400">{item.totalTokens.toLocaleString()} tokens</p>
                  <p className="text-xs text-gray-600">{formatDate(item.createdAt, true)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
