"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { signOutUser } from "@/lib/auth";
import {
  LayoutDashboard, FileText, Sparkles, MessageSquare,
  CheckSquare, Wallet, Package, Brain, Gift, Settings,
  CreditCard, LogOut, Sun, Moon, Monitor, Zap, ScrollText, Bot,
} from "lucide-react";

const MODULES = [
  { href: "/assistants", label: "Assistants", icon: Bot, match: "/assistants" },
  { href: "/content/apps", label: "Content", icon: FileText, match: "/content" },
  { href: "/roleplay", label: "Roleplay", icon: MessageSquare, match: "/roleplay" },
  { href: "/planner", label: "Planner", icon: CheckSquare, match: "/planner" },
  { href: "/finance", label: "Finance", icon: Wallet, match: "/finance" },
  { href: "/subscriptions", label: "Subscriptions", icon: Package, match: "/subscriptions" },
];

const WORKSPACE = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/referral", label: "Referral", icon: Gift },
];

const ACCOUNT = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/changelog", label: "What's New", icon: ScrollText },
];

const THEME_OPTIONS = [
  { value: "light" as const, icon: Sun, title: "Light" },
  { value: "dark" as const, icon: Moon, title: "Dark" },
  { value: "system" as const, icon: Monitor, title: "System" },
];

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400/70 dark:text-gray-600">
      {label}
    </p>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClose,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  active: boolean;
  onClose?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
        active
          ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
          : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
      }`}
    >
      {/* Left accent bar */}
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
      )}
      <Icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          active
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
        }`}
        size={16}
      />
      <span className="flex-1 leading-none">{label}</span>
    </Link>
  );
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const tokens = (userProfile?.tokens ?? userProfile?.credits ?? 0);
  const isLow = tokens < 10_000;

  function isActive(href: string, match?: string) {
    const base = match ?? href;
    return pathname === href || pathname.startsWith(base + "/") || (match ? pathname.startsWith(match) : false);
  }

  return (
    <aside className="flex h-full w-56 flex-col bg-white dark:bg-gray-900/95 border-r border-gray-200/80 dark:border-gray-800/80">

      {/* Brand */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Dashboard
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2">
        <SectionLabel label="Modules" />
        <div className="space-y-0.5">
          {MODULES.map(({ href, label, icon, match }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href, match)} onClose={onClose} />
          ))}
        </div>

        <SectionLabel label="Workspace" />
        <div className="space-y-0.5">
          {WORKSPACE.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} onClose={onClose} />
          ))}
        </div>

        <SectionLabel label="Account" />
        <div className="space-y-0.5">
          {ACCOUNT.map(({ href, label, icon }) => (
            <NavItem key={href} href={href} label={label} icon={icon} active={isActive(href)} onClose={onClose} />
          ))}
        </div>
      </nav>

      {/* Credits pill */}
      {user && userProfile && (
        <div className="px-3 pb-2">
          <Link
            href="/billing"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-150 ${
              isLow
                ? "bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/15"
                : "bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/8"
            }`}
          >
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              isLow
                ? "bg-red-100 dark:bg-red-500/20"
                : "bg-gradient-to-br from-indigo-500 to-violet-500"
            }`}>
              <Zap className={`h-3 w-3 ${isLow ? "text-red-600 dark:text-red-400" : "text-white"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-semibold leading-none ${
                isLow ? "text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
              }`}>
                {tokens >= 1_000 ? `${(tokens / 1000).toFixed(1)}K` : tokens.toLocaleString()} tokens
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-gray-400 dark:text-gray-500">
                {isLow ? "Running low · top up" : "available balance"}
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Bottom: theme + user */}
      {user && (
        <div className="border-t border-gray-100 dark:border-gray-800/80 px-3 py-3 space-y-2.5">
          {/* Theme toggle */}
          <div className="flex rounded-lg bg-gray-100/80 p-0.5 dark:bg-white/5">
            {THEME_OPTIONS.map(({ value, icon: Icon, title }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                title={title}
                className={`flex flex-1 items-center justify-center rounded-md py-1.5 text-xs transition-all duration-150 ${
                  theme === value
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                    : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                }`}
              >
                <Icon className="h-3 w-3" />
              </button>
            ))}
          </div>

          {/* User row */}
          <div className="flex items-center gap-2 rounded-lg px-1.5 py-1">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white dark:ring-gray-800"
              />
            ) : (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-bold text-white">
                {(user.displayName ?? "?")[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-none text-gray-800 dark:text-gray-200">
                {user.displayName}
              </p>
              <p className="mt-0.5 truncate text-[10px] leading-none text-gray-400 dark:text-gray-500">
                {user.email}
              </p>
            </div>
            <button
              onClick={signOutUser}
              title="Sign out"
              className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
