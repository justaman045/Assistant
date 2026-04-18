"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { Search, Shield, ChevronRight } from "lucide-react";

interface AdminUser {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  photoURL: string;
  credits: number;
  creditsUsed: number;
  isAdmin: boolean;
  onboardingComplete: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    user
      .getIdToken()
      .then((token) =>
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        })
      )
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<{ users: AdminUser[] }>;
      })
      .then((data) => setUsers(data.users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.displayName.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="mt-1 text-sm text-gray-400">
            {loading ? "Loading…" : `${users.length} total users`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-400">{error}</p>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-400">User</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 hidden md:table-cell">Role</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400">Credits</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-400 hidden lg:table-cell">Last active</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-4">
                    <div className="h-4 w-full animate-pulse rounded bg-gray-800" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u.uid}
                  className="transition-colors hover:bg-gray-800/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="" className="h-8 w-8 shrink-0 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-900 text-xs font-bold text-violet-300">
                          {(u.displayName || u.email)[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-medium text-white">
                          {u.displayName || "—"}
                          {u.isAdmin && (
                            <Shield className="h-3 w-3 shrink-0 text-violet-400" />
                          )}
                        </p>
                        <p className="truncate text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-gray-400">{u.role || "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{u.credits.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{u.creditsUsed.toLocaleString()} used</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-gray-400">{formatDate(u.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs text-gray-400">{formatDate(u.lastLoginAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${u.uid}`}
                      className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                    >
                      Manage <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
