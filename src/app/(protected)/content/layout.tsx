"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, PlusCircle, Wand2, History, CalendarDays, Mic2 } from "lucide-react";

const TABS = [
  { href: "/content/apps", label: "Apps", icon: LayoutGrid },
  { href: "/content/create", label: "Create", icon: PlusCircle },
  { href: "/content/prompts", label: "Prompts", icon: Wand2 },
  { href: "/content/history", label: "History", icon: History },
  { href: "/content/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/content/brand-voice", label: "Brand Voice", icon: Mic2 },
];

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar — sticky so it stays visible when the apps grid scrolls */}
      <div className="sticky top-4 z-10 -mx-4 mb-6 flex items-center gap-0.5 overflow-x-auto border-b border-gray-200/80 bg-[#f8f9fc] px-4 dark:border-gray-800/80 dark:bg-[#0c0e14] md:-mx-8 md:top-8 md:px-8">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
      <div>{children}</div>
    </div>
  );
}
