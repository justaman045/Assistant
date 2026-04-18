"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  Users,
  FileText,
  Zap,
  TrendingUp,
  ArrowRight,
  Shield,
} from "lucide-react";

interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  photoURL: string;
  credits: number;
  creditsUsed: number;
  isAdmin: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

interface Stats {
  totalUsers: number;
  totalItems: number;
  totalGenerations: number;
  newUsersThisWeek: number;
  recentUsers: AdminUser[];
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950">
          <Icon className="h-4 w-4 text-violet-400" size={16} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-white">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<Stats>;
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-gray-400">
          Platform health and activity at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          sub={`+${stats?.newUsersThisWeek ?? 0} this week`}
        />
        <StatCard
          label="Total Generations"
          value={stats?.totalGenerations ?? 0}
          icon={Zap}
        />
        <StatCard
          label="Saved Items"
          value={stats?.totalItems ?? 0}
          icon={FileText}
        />
        <StatCard
          label="New This Week"
          value={stats?.newUsersThisWeek ?? 0}
          icon={TrendingUp}
          sub="user signups"
        />
      </div>

      {/* Recent signups */}
      <div className="rounded-xl border border-gray-800 bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-white">Recent signups</h2>
          <Link
            href="/admin/users"
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-800">
          {(stats?.recentUsers ?? []).length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">No users yet.</p>
          ) : (
            (stats?.recentUsers ?? []).map((u) => (
              <Link
                key={u.uid}
                href={`/admin/users/${u.uid}`}
                className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-gray-800/50"
              >
                {u.photoURL ? (
                  <img src={u.photoURL} alt="" className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-900 text-sm font-bold text-violet-300">
                    {(u.displayName || u.email)[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-white">{u.displayName || "—"}</p>
                  <p className="truncate text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{formatDate(u.createdAt)}</p>
                  {u.isAdmin && (
                    <span className="inline-flex items-center gap-1 text-xs text-violet-400">
                      <Shield className="h-3 w-3" /> Admin
                    </span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
