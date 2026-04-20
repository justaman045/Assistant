"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { signOutUser } from "@/lib/auth";
import {
  LayoutDashboard, Users, LogOut, Shield, ExternalLink, Key, BarChart2, Menu, X,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/api-keys", label: "API Keys", icon: Key, exact: false },
  { href: "/admin/model-usage", label: "Model Usage", icon: BarChart2, exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/"); return; }
    if (userProfile !== null && !userProfile.isAdmin) router.replace("/dashboard");
  }, [user, userProfile, loading, router]);

  if (loading || !user || !userProfile?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  function SidebarContent({ onClose }: { onClose?: () => void }) {
    return (
      <aside className="flex h-full w-56 flex-col border-r border-gray-800 bg-gray-900 px-3 py-5">
        <div className="mb-6 flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Admin</p>
              <p className="text-xs text-gray-500">Control Panel</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 md:hidden">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 space-y-0.5">
          {adminNav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  active ? "bg-violet-950 text-violet-300" : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-violet-400" : "text-gray-500"}`} size={16} />
                {label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1 border-t border-gray-800 pt-4">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300">
            <ExternalLink className="h-3.5 w-3.5" />Back to app
          </Link>
          <button onClick={signOutUser} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400">
            <LogOut className="h-3.5 w-3.5" />Sign out
          </button>
          <div className="flex items-center gap-2 rounded-lg px-3 py-2">
            {user!.photoURL ? (
              <img src={user!.photoURL} alt="" className="h-6 w-6 rounded-full ring-1 ring-gray-700" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-800 text-xs font-bold text-violet-200">
                {(user!.displayName ?? "A")[0]}
              </div>
            )}
            <span className="truncate text-xs text-gray-500">{user!.email}</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:h-screen md:flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 h-full transform transition-transform duration-200 md:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600">
              <Shield className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
